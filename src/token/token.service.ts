import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertLevel, AlertStatus, AuthorizationKind, AuthorizationStatus, ProviderType } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { AlertService } from '../alert/alert.service';
import { CryptoService } from '../common/services/crypto.service';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { DirectoryService } from '../directory/directory.service';
import { FeishuProvider } from '../provider/feishu.provider';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly redisService: RedisService,
    private readonly provider: FeishuProvider,
    private readonly alertService: AlertService,
    private readonly directoryService: DirectoryService,
  ) {}

  async resolve(userOpenId: string) {
    const { access, authorization } = await this.directoryService.getFeishuPersonalAuthorization(userOpenId);
    if (!access.allowed || !access.account) {
      return {
        provider: 'feishu',
        userOpenId,
        chatAllowed: false,
        chatReason: access.reason,
        personalAuthorizationEnabled: false,
        available: false,
        status: 'missing',
      };
    }

    if (!authorization || !authorization.enabled) {
      return {
        provider: 'feishu',
        userOpenId,
        chatAllowed: true,
        chatReason: null,
        personalAuthorizationEnabled: false,
        available: false,
        status: 'missing',
        userId: access.account.user.id,
        username: access.account.user.username,
      };
    }

    return {
      provider: 'feishu',
      userOpenId,
      chatAllowed: true,
      chatReason: null,
      personalAuthorizationEnabled: true,
      available:
        authorization.status === AuthorizationStatus.active ||
        authorization.status === AuthorizationStatus.expiring,
      status: authorization.status,
      expiresAt: authorization.expiresAt,
      scopes: authorization.scopes,
      userId: access.account.user.id,
      username: access.account.user.username,
      accountKey: authorization.accountKey,
      requiresReauthorization: authorization.status === AuthorizationStatus.reauthorization_required,
    };
  }

  async getAuthorizationSummary(userOpenId: string) {
    const { access, authorization } = await this.directoryService.getFeishuPersonalAuthorization(userOpenId);
    if (!access.allowed || !access.account || !authorization) {
      throw new NotFoundException('authorization not found');
    }

    return {
      userOpenId,
      userId: access.account.user.id,
      username: access.account.user.username,
      accountKey: authorization.accountKey,
      status: authorization.status,
      enabled: authorization.enabled,
      scopes: authorization.scopes,
      expiresAt: authorization.expiresAt,
      refreshExpiresAt: authorization.refreshExpiresAt,
      lastRefreshAt: authorization.lastRefreshAt,
      lastFailureAt: authorization.lastFailureAt,
      failureReason: authorization.failureReason,
      maskedAccessToken: authorization.accessTokenEncrypted
        ? this.cryptoService.mask(this.cryptoService.decrypt(authorization.accessTokenEncrypted))
        : '',
    };
  }

  async invalidate(userOpenId: string) {
    const authorization = await this.getRequiredPersonalAuthorization(userOpenId);
    await this.prisma.platformAuthorization.update({
      where: { id: authorization.id },
      data: {
        status: AuthorizationStatus.reauthorization_required,
        failureReason: 'manually invalidated',
      },
    });

    await this.prisma.authEvent.create({
      data: {
        platformAuthorizationId: authorization.id,
        type: 'token_invalidated',
        message: `手动失效 Feishu personal 授权：${authorization.accountKey}`,
      },
    });

    return { ok: true };
  }

  async invalidateByUserId(userId: string) {
    const authorization = await this.getRequiredPersonalAuthorizationByUserId(userId);
    await this.prisma.platformAuthorization.update({
      where: { id: authorization.id },
      data: {
        status: AuthorizationStatus.reauthorization_required,
        failureReason: 'manually invalidated',
      },
    });

    await this.prisma.authEvent.create({
      data: {
        platformAuthorizationId: authorization.id,
        type: 'token_invalidated',
        message: `管理员手动失效 Feishu personal token：${authorization.accountKey}`,
      },
    });

    return { ok: true };
  }

  async deleteByUserId(userId: string) {
    const authorization = await this.getRequiredPersonalAuthorizationByUserId(userId);
    await this.prisma.platformAuthorization.update({
      where: { id: authorization.id },
      data: {
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        scopes: [],
        expiresAt: null,
        refreshExpiresAt: null,
        lastRefreshAt: null,
        lastFailureAt: null,
        failureReason: 'manually deleted',
        status: AuthorizationStatus.expired,
      },
    });

    await this.prisma.authEvent.create({
      data: {
        platformAuthorizationId: authorization.id,
        type: 'token_deleted',
        message: `管理员手动删除 Feishu personal token：${authorization.accountKey}`,
      },
    });

    return { ok: true };
  }

  async refresh(userOpenId: string) {
    const authorization = await this.getRequiredPersonalAuthorization(userOpenId);
    return this.refreshAuthorizationRecord(authorization.id);
  }

  async getAvailableAccessToken(userOpenId: string) {
    const authorization = await this.getRequiredPersonalAuthorization(userOpenId);
    if (
      authorization.status !== AuthorizationStatus.active &&
      authorization.status !== AuthorizationStatus.expiring
    ) {
      throw new ForbiddenException('user token unavailable');
    }
    if (!authorization.accessTokenEncrypted) {
      throw new NotFoundException('access token not found');
    }
    return this.cryptoService.decrypt(authorization.accessTokenEncrypted);
  }

  @Cron('*/5 * * * *')
  async refreshExpiringTokens() {
    const provider = await this.prisma.provider.findUnique({
      where: { type: ProviderType.FEISHU },
    });
    if (!provider) {
      return;
    }

    const lookahead = Number(process.env.REFRESH_LOOKAHEAD_SECONDS || 900);
    const threshold = new Date(Date.now() + lookahead * 1000);
    const authorizations = await this.prisma.platformAuthorization.findMany({
      where: {
        providerId: provider.id,
        authKind: AuthorizationKind.personal,
        enabled: true,
        status: { in: [AuthorizationStatus.active, AuthorizationStatus.expiring] },
        expiresAt: { lte: threshold },
      },
    });

    for (const authorization of authorizations) {
      await this.refreshAuthorizationRecord(authorization.id).catch(() => undefined);
    }
  }

  private async refreshAuthorizationRecord(platformAuthorizationId: string) {
    const lockKey = `feishu-token-refresh:${platformAuthorizationId}`;
    const lockTtl = Number(process.env.LOCK_TTL_SECONDS || 120);
    const locked = await this.redisService.client.set(lockKey, '1', 'EX', lockTtl, 'NX');
    if (!locked) {
      return { ok: false, skipped: true, reason: 'lock busy' };
    }

    try {
      const authorization = await this.prisma.platformAuthorization.findUnique({
        where: { id: platformAuthorizationId },
        include: {
          user: true,
          platformAccount: true,
        },
      });
      if (!authorization) {
        throw new NotFoundException('authorization not found');
      }
      if (!authorization.refreshTokenEncrypted) {
        throw new Error('refresh token unavailable');
      }

      const refreshToken = this.cryptoService.decrypt(authorization.refreshTokenEncrypted);
      const refreshed = await this.provider.refreshAccessToken(
        refreshToken,
        authorization.scopes.length > 0 ? authorization.scopes : this.provider.defaultScopes(),
      );

      const updated = await this.prisma.platformAuthorization.update({
        where: { id: authorization.id },
        data: {
          accessTokenEncrypted: this.cryptoService.encrypt(refreshed.accessToken),
          refreshTokenEncrypted: refreshed.refreshToken
            ? this.cryptoService.encrypt(refreshed.refreshToken)
            : authorization.refreshTokenEncrypted,
          scopes: refreshed.scope,
          expiresAt: refreshed.expiresAt,
          refreshExpiresAt: refreshed.refreshExpiresAt || authorization.refreshExpiresAt,
          status: AuthorizationStatus.active,
          lastRefreshAt: new Date(),
          lastFailureAt: null,
          failureReason: null,
        },
      });

      await this.prisma.authEvent.create({
        data: {
          platformAuthorizationId: updated.id,
          type: 'refresh_succeeded',
          message: `Feishu personal 授权刷新成功：${updated.accountKey}`,
        },
      });

      return { ok: true, status: updated.status };
    } catch (error) {
      const authorization = await this.prisma.platformAuthorization.findUnique({
        where: { id: platformAuthorizationId },
      });
      if (authorization) {
        const updated = await this.prisma.platformAuthorization.update({
          where: { id: authorization.id },
          data: {
            status: AuthorizationStatus.reauthorization_required,
            lastFailureAt: new Date(),
            failureReason: (error as Error).message,
          },
        });

        await this.prisma.authEvent.create({
          data: {
            platformAuthorizationId: updated.id,
            type: 'refresh_failed',
            message: `Feishu personal 授权刷新失败：${updated.accountKey}`,
            metadata: {
              error: (error as Error).message,
            },
          },
        });

        await this.alertService.raise(
          updated.id,
          'refresh_failed',
          `Feishu personal 授权刷新失败：${updated.accountKey}，原因：${(error as Error).message}`,
          AlertLevel.P1,
          AlertStatus.open,
        );
      }

      throw error;
    } finally {
      await this.redisService.client.del(lockKey);
    }
  }

  private async getRequiredPersonalAuthorization(userOpenId: string) {
    const { access, authorization } = await this.directoryService.getFeishuPersonalAuthorization(userOpenId);
    if (!access.allowed || !access.account) {
      throw new ForbiddenException(access.reason || 'chat access denied');
    }
    if (!authorization || !authorization.enabled) {
      throw new NotFoundException('personal authorization not enabled');
    }
    return authorization;
  }

  private async getRequiredPersonalAuthorizationByUserId(userId: string) {
    const provider = await this.directoryService.getOrCreateFeishuProvider();
    const authorization = await this.prisma.platformAuthorization.findFirst({
      where: {
        providerId: provider.id,
        authKind: AuthorizationKind.personal,
        userId,
      },
    });
    if (!authorization) {
      throw new NotFoundException('personal authorization not found');
    }
    return authorization;
  }
}
