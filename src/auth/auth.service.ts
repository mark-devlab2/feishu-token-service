import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorizationKind, AuthorizationStatus } from '@prisma/client';
import { AlertService } from '../alert/alert.service';
import { CryptoService } from '../common/services/crypto.service';
import { PrismaService } from '../common/services/prisma.service';
import { DirectoryService } from '../directory/directory.service';
import { FeishuProvider } from '../provider/feishu.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FeishuProvider,
    private readonly cryptoService: CryptoService,
    private readonly alertService: AlertService,
    private readonly directoryService: DirectoryService,
  ) {}

  async getStatus(userOpenId: string) {
    const { access, authorization } = await this.directoryService.getFeishuPersonalAuthorization(userOpenId);

    return {
      provider: 'feishu',
      userOpenId,
      chatAllowed: access.allowed,
      chatReason: access.reason,
      user: access.account
        ? {
            id: access.account.user.id,
            username: access.account.user.username,
            displayName: access.account.user.displayName,
            status: access.account.user.status,
          }
        : null,
      platformAccountEnabled: access.account?.enabled ?? false,
      personalAuthorizationEnabled: authorization?.enabled ?? false,
      available:
        !!authorization &&
        authorization.enabled &&
        (authorization.status === AuthorizationStatus.active ||
          authorization.status === AuthorizationStatus.expiring),
      status: authorization?.status || 'missing',
      expiresAt: authorization?.expiresAt || null,
      scopes: authorization?.scopes || [],
      requiresReauthorization: authorization?.status === AuthorizationStatus.reauthorization_required,
    };
  }

  async createAuthLink(userOpenId: string, userLabel?: string, returnContext?: string) {
    const { access, authorization } = await this.directoryService.getFeishuPersonalAuthorization(userOpenId);
    if (!access.allowed || !access.account) {
      throw new ForbiddenException(access.reason || 'chat access denied');
    }
    if (!authorization || !authorization.enabled) {
      throw new ForbiddenException('personal authorization disabled');
    }

    const state = this.provider.generateState();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.authSession.create({
      data: {
        providerId: access.account.providerId,
        userId: access.account.userId,
        platformAccountId: access.account.id,
        requestSubjectId: userOpenId,
        state,
        returnContext,
        expiresAt,
      },
    });

    await this.prisma.authEvent.create({
      data: {
        platformAuthorizationId: authorization.id,
        type: 'auth_link_created',
        message: `为 ${access.account.user.username} 生成 Feishu personal 授权链接`,
        metadata: {
          userOpenId,
          userLabel: userLabel || access.account.displayName || access.account.user.displayName || access.account.user.username,
          returnContext: returnContext || null,
        },
      },
    });

    return {
      url: this.provider.buildAuthorizationUrl({
        state,
        redirectUri: process.env.FEISHU_REDIRECT_URI || '',
        scopes: this.provider.defaultScopes(),
      }),
      expiresAt,
      userId: access.account.user.id,
      username: access.account.user.username,
    };
  }

  async handleCallback(code: string, state: string) {
    const session = await this.prisma.authSession.findUnique({ where: { state } });
    if (!session) {
      throw new NotFoundException('auth session not found');
    }
    if (!session.userId || !session.platformAccountId) {
      throw new NotFoundException('auth session missing user context');
    }

    const platformAccount = await this.prisma.platformAccount.findUnique({
      where: { id: session.platformAccountId },
      include: { user: true },
    });
    if (!platformAccount) {
      throw new NotFoundException('platform account not found');
    }

    try {
      const tokenResponse = await this.provider.exchangeCodeForToken(code);
      const authorization = await this.prisma.platformAuthorization.upsert({
        where: {
          providerId_authKind_accountKey: {
            providerId: session.providerId,
            authKind: AuthorizationKind.personal,
            accountKey: platformAccount.user.username,
          },
        },
        update: {
          userId: platformAccount.userId,
          platformAccountId: platformAccount.id,
          enabled: true,
          accessTokenEncrypted: this.cryptoService.encrypt(tokenResponse.accessToken),
          refreshTokenEncrypted: tokenResponse.refreshToken
            ? this.cryptoService.encrypt(tokenResponse.refreshToken)
            : null,
          scopes: tokenResponse.scope,
          expiresAt: tokenResponse.expiresAt,
          refreshExpiresAt: tokenResponse.refreshExpiresAt || null,
          status: AuthorizationStatus.active,
          lastRefreshAt: new Date(),
          lastFailureAt: null,
          failureReason: null,
          metadata: {
            source: 'oauth_callback',
            provider: 'feishu',
            requestSubjectId: session.requestSubjectId,
          },
        },
        create: {
          providerId: session.providerId,
          authKind: AuthorizationKind.personal,
          userId: platformAccount.userId,
          platformAccountId: platformAccount.id,
          accountKey: platformAccount.user.username,
          enabled: true,
          accessTokenEncrypted: this.cryptoService.encrypt(tokenResponse.accessToken),
          refreshTokenEncrypted: tokenResponse.refreshToken
            ? this.cryptoService.encrypt(tokenResponse.refreshToken)
            : null,
          scopes: tokenResponse.scope,
          expiresAt: tokenResponse.expiresAt,
          refreshExpiresAt: tokenResponse.refreshExpiresAt || null,
          status: AuthorizationStatus.active,
          lastRefreshAt: new Date(),
          metadata: {
            source: 'oauth_callback',
            provider: 'feishu',
            requestSubjectId: session.requestSubjectId,
          },
        },
      });

      await this.prisma.authEvent.create({
        data: {
          platformAuthorizationId: authorization.id,
          type: 'auth_callback_succeeded',
          message: `Feishu personal 授权成功：${platformAccount.user.username}`,
          metadata: {
            requestSubjectId: session.requestSubjectId,
            returnContext: session.returnContext || null,
          },
        },
      });

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      return {
        success: true,
        userOpenId: session.requestSubjectId,
        returnContext: session.returnContext,
        username: platformAccount.user.username,
      };
    } catch (error) {
      const authorization = await this.prisma.platformAuthorization.findUnique({
        where: {
          providerId_authKind_accountKey: {
            providerId: session.providerId,
            authKind: AuthorizationKind.personal,
            accountKey: platformAccount.user.username,
          },
        },
      });

      if (authorization) {
        await this.prisma.authEvent.create({
          data: {
            platformAuthorizationId: authorization.id,
            type: 'auth_callback_failed',
            message: `Feishu personal 授权失败：${platformAccount.user.username}`,
            metadata: {
              error: (error as Error).message,
              requestSubjectId: session.requestSubjectId,
            },
          },
        });
      }

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { status: 'failed', completedAt: new Date() },
      });

      await this.alertService.raise(
        authorization?.id || null,
        'auth_callback_failed',
        `Feishu personal 授权失败：${platformAccount.user.username}，原因：${(error as Error).message}`,
      );

      throw error;
    }
  }
}
