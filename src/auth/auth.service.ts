import { Injectable, NotFoundException } from '@nestjs/common';
import { ProviderType, UserTokenStatus } from '@prisma/client';
import { CryptoService } from '../common/services/crypto.service';
import { PrismaService } from '../common/services/prisma.service';
import { AlertService } from '../alert/alert.service';
import { FeishuProvider } from '../provider/feishu.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FeishuProvider,
    private readonly cryptoService: CryptoService,
    private readonly alertService: AlertService,
  ) {}

  async getStatus(userOpenId: string) {
    const provider = await this.getOrCreateProvider();
    const user = await this.prisma.user.findUnique({
      where: { openId: userOpenId },
      include: {
        userTokens: {
          where: { providerId: provider.id },
          take: 1,
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    const token = user?.userTokens[0];
    return {
      userOpenId,
      available: token?.status === UserTokenStatus.active || token?.status === UserTokenStatus.expiring,
      status: token?.status || 'missing',
      expiresAt: token?.expiresAt || null,
      scopes: token?.scopes || [],
      requiresReauthorization: token?.status === UserTokenStatus.reauthorization_required,
    };
  }

  async createAuthLink(userOpenId: string, userLabel?: string, returnContext?: string) {
    const provider = await this.getOrCreateProvider();
    const state = this.provider.generateState();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.upsert({
      where: { openId: userOpenId },
      update: { label: userLabel || undefined },
      create: { openId: userOpenId, label: userLabel },
    });

    await this.prisma.authSession.create({
      data: {
        providerId: provider.id,
        userOpenId,
        state,
        returnContext,
        expiresAt,
      },
    });

    return {
      url: this.provider.buildAuthorizationUrl({
        state,
        redirectUri: process.env.FEISHU_REDIRECT_URI || '',
        scopes: this.provider.defaultScopes(),
      }),
      expiresAt,
    };
  }

  async handleCallback(code: string, state: string) {
    const session = await this.prisma.authSession.findUnique({ where: { state } });
    if (!session) {
      throw new NotFoundException('auth session not found');
    }

    const provider = await this.getOrCreateProvider();
    const user = await this.prisma.user.upsert({
      where: { openId: session.userOpenId },
      update: {},
      create: { openId: session.userOpenId },
    });

    try {
      const tokenResponse = await this.provider.exchangeCodeForToken(code);
      await this.prisma.userToken.upsert({
        where: {
          providerId_userId: {
            providerId: provider.id,
            userId: user.id,
          },
        },
        update: {
          accessTokenEncrypted: this.cryptoService.encrypt(tokenResponse.accessToken),
          refreshTokenEncrypted: tokenResponse.refreshToken
            ? this.cryptoService.encrypt(tokenResponse.refreshToken)
            : null,
          scopes: tokenResponse.scope,
          expiresAt: tokenResponse.expiresAt,
          refreshExpiresAt: tokenResponse.refreshExpiresAt || null,
          status: UserTokenStatus.active,
          lastRefreshAt: new Date(),
          failureReason: null,
        },
        create: {
          providerId: provider.id,
          userId: user.id,
          accessTokenEncrypted: this.cryptoService.encrypt(tokenResponse.accessToken),
          refreshTokenEncrypted: tokenResponse.refreshToken
            ? this.cryptoService.encrypt(tokenResponse.refreshToken)
            : null,
          scopes: tokenResponse.scope,
          expiresAt: tokenResponse.expiresAt,
          refreshExpiresAt: tokenResponse.refreshExpiresAt || null,
          status: UserTokenStatus.active,
          lastRefreshAt: new Date(),
        },
      });

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      return {
        success: true,
        userOpenId: session.userOpenId,
        returnContext: session.returnContext,
      };
    } catch (error) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { status: 'failed', completedAt: new Date() },
      });

      await this.alertService.raise(
        null,
        'auth_callback_failed',
        `Feishu auth callback failed for ${session.userOpenId}: ${(error as Error).message}`,
      );

      throw error;
    }
  }

  private async getOrCreateProvider() {
    return this.prisma.provider.upsert({
      where: { type: ProviderType.FEISHU },
      update: { displayName: 'Feishu', enabled: true },
      create: { type: ProviderType.FEISHU, displayName: 'Feishu', enabled: true },
    });
  }
}
