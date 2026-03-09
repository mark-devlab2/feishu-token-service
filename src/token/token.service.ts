import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertLevel, AlertStatus, ProviderType, UserTokenStatus } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { CryptoService } from '../common/services/crypto.service';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { AlertService } from '../alert/alert.service';
import { FeishuProvider } from '../provider/feishu.provider';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly redisService: RedisService,
    private readonly provider: FeishuProvider,
    private readonly alertService: AlertService,
  ) {}

  async resolve(userOpenId: string) {
    const token = await this.getUserToken(userOpenId);
    if (!token) {
      return { available: false, status: 'missing' };
    }

    return {
      available: token.status === UserTokenStatus.active || token.status === UserTokenStatus.expiring,
      status: token.status,
      token: token.status === UserTokenStatus.active || token.status === UserTokenStatus.expiring
        ? this.cryptoService.decrypt(token.accessTokenEncrypted)
        : null,
      expiresAt: token.expiresAt,
      scopes: token.scopes,
    };
  }

  async getToken(userOpenId: string) {
    const token = await this.getUserToken(userOpenId);
    if (!token) {
      throw new NotFoundException('token not found');
    }

    return {
      userOpenId,
      status: token.status,
      scopes: token.scopes,
      expiresAt: token.expiresAt,
      refreshExpiresAt: token.refreshExpiresAt,
      lastRefreshAt: token.lastRefreshAt,
      lastFailureAt: token.lastFailureAt,
      failureReason: token.failureReason,
      maskedAccessToken: this.cryptoService.mask(this.cryptoService.decrypt(token.accessTokenEncrypted)),
    };
  }

  async invalidate(userOpenId: string) {
    const token = await this.getUserToken(userOpenId);
    if (!token) {
      throw new NotFoundException('token not found');
    }

    await this.prisma.userToken.update({
      where: { id: token.id },
      data: {
        status: UserTokenStatus.revoked,
        failureReason: 'manually invalidated',
      },
    });

    return { ok: true };
  }

  async refresh(userOpenId: string) {
    const token = await this.getUserToken(userOpenId);
    if (!token) {
      throw new NotFoundException('token not found');
    }

    return this.refreshTokenRecord(token.id);
  }

  @Cron('*/5 * * * *')
  async refreshExpiringTokens() {
    const lookahead = Number(process.env.REFRESH_LOOKAHEAD_SECONDS || 900);
    const threshold = new Date(Date.now() + lookahead * 1000);
    const tokens = await this.prisma.userToken.findMany({
      where: {
        provider: { is: { type: ProviderType.FEISHU } },
        status: { in: [UserTokenStatus.active, UserTokenStatus.expiring] },
        expiresAt: { lte: threshold },
      },
    });

    for (const token of tokens) {
      await this.refreshTokenRecord(token.id).catch(() => undefined);
    }
  }

  private async refreshTokenRecord(userTokenId: string) {
    const lockKey = `feishu-token-refresh:${userTokenId}`;
    const lockTtl = Number(process.env.LOCK_TTL_SECONDS || 120);
    const locked = await this.redisService.client.set(lockKey, '1', 'EX', lockTtl, 'NX');
    if (!locked) {
      return { ok: false, skipped: true, reason: 'lock busy' };
    }

    try {
      const token = await this.prisma.userToken.findUnique({
        where: { id: userTokenId },
        include: { user: true },
      });
      if (!token) {
        throw new NotFoundException('token not found');
      }
      if (!token.refreshTokenEncrypted) {
        throw new Error('refresh token unavailable');
      }

      const refreshToken = this.cryptoService.decrypt(token.refreshTokenEncrypted);
      const refreshed = await this.provider.refreshAccessToken(refreshToken);

      const updated = await this.prisma.userToken.update({
        where: { id: token.id },
        data: {
          accessTokenEncrypted: this.cryptoService.encrypt(refreshed.accessToken),
          refreshTokenEncrypted: refreshed.refreshToken
            ? this.cryptoService.encrypt(refreshed.refreshToken)
            : token.refreshTokenEncrypted,
          scopes: refreshed.scope,
          expiresAt: refreshed.expiresAt,
          refreshExpiresAt: refreshed.refreshExpiresAt || token.refreshExpiresAt,
          status: UserTokenStatus.active,
          lastRefreshAt: new Date(),
          lastFailureAt: null,
          failureReason: null,
        },
      });

      await this.prisma.tokenEvent.create({
        data: {
          userTokenId: token.id,
          type: 'refresh_succeeded',
          message: 'Feishu access token refreshed successfully',
        },
      });

      return { ok: true, status: updated.status };
    } catch (error) {
      const token = await this.prisma.userToken.findUnique({ where: { id: userTokenId } });
      if (token) {
        const updated = await this.prisma.userToken.update({
          where: { id: token.id },
          data: {
            status: UserTokenStatus.reauthorization_required,
            lastFailureAt: new Date(),
            failureReason: (error as Error).message,
          },
        });

        await this.prisma.tokenEvent.create({
          data: {
            userTokenId: updated.id,
            type: 'refresh_failed',
            message: `Feishu access token refresh failed: ${(error as Error).message}`,
          },
        });

        await this.alertService.raise(
          updated.id,
          'refresh_failed',
          `Feishu user token refresh failed for token ${updated.id}: ${(error as Error).message}`,
          AlertLevel.P1,
          AlertStatus.open,
        );
      }

      throw error;
    } finally {
      await this.redisService.client.del(lockKey);
    }
  }

  private async getUserToken(userOpenId: string) {
    return this.prisma.userToken.findFirst({
      where: {
        provider: { is: { type: ProviderType.FEISHU } },
        user: { is: { openId: userOpenId } },
      },
      include: { user: true, provider: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
