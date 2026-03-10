import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  AuthorizationKind,
  AuthorizationStatus,
  ProviderType,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class DirectoryService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async ensureDefaults() {
    const provider = await this.getOrCreateFeishuProvider();
    const superAdmin = await this.prisma.user.upsert({
      where: { username: process.env.DEFAULT_SUPER_ADMIN_USERNAME || 'mark' },
      update: {
        displayName: process.env.DEFAULT_SUPER_ADMIN_DISPLAY_NAME || 'Mark',
        isSuperAdmin: true,
        status: UserStatus.active,
      },
      create: {
        username: process.env.DEFAULT_SUPER_ADMIN_USERNAME || 'mark',
        displayName: process.env.DEFAULT_SUPER_ADMIN_DISPLAY_NAME || 'Mark',
        isSuperAdmin: true,
        status: UserStatus.active,
      },
    });

    const ownerOpenId = process.env.BOOTSTRAP_FEISHU_OWNER_OPEN_ID;
    if (ownerOpenId) {
      await this.prisma.platformAccount.upsert({
        where: {
          providerId_externalSubjectId: {
            providerId: provider.id,
            externalSubjectId: ownerOpenId,
          },
        },
        update: {
          userId: superAdmin.id,
          displayName: process.env.BOOTSTRAP_FEISHU_OWNER_DISPLAY_NAME || superAdmin.displayName || superAdmin.username,
          enabled: true,
        },
        create: {
          providerId: provider.id,
          userId: superAdmin.id,
          externalSubjectId: ownerOpenId,
          displayName: process.env.BOOTSTRAP_FEISHU_OWNER_DISPLAY_NAME || superAdmin.displayName || superAdmin.username,
          enabled: true,
        },
      });
    }

    await this.prisma.platformAuthorization.upsert({
      where: {
        providerId_authKind_accountKey: {
          providerId: provider.id,
          authKind: AuthorizationKind.app,
          accountKey: process.env.FEISHU_APP_AUTH_ACCOUNT_KEY || 'openclaw-main',
        },
      },
      update: {
        enabled: true,
        status: AuthorizationStatus.active,
        metadata: {
          source: 'env',
          displayName: 'Feishu 应用授权',
        },
      },
      create: {
        providerId: provider.id,
        authKind: AuthorizationKind.app,
        accountKey: process.env.FEISHU_APP_AUTH_ACCOUNT_KEY || 'openclaw-main',
        enabled: true,
        status: AuthorizationStatus.active,
        metadata: {
          source: 'env',
          displayName: 'Feishu 应用授权',
        },
      },
    });
  }

  async getOrCreateFeishuProvider() {
    return this.prisma.provider.upsert({
      where: { type: ProviderType.FEISHU },
      update: {
        displayName: 'Feishu',
        enabled: true,
        config: {
          oauth: true,
          personalGateway: true,
          appAuthorization: true,
          reservedCapabilities: ['docs', 'wiki', 'minutes', 'messages'],
        },
      },
      create: {
        type: ProviderType.FEISHU,
        displayName: 'Feishu',
        enabled: true,
        config: {
          oauth: true,
          personalGateway: true,
          appAuthorization: true,
          reservedCapabilities: ['docs', 'wiki', 'minutes', 'messages'],
        },
      },
    });
  }

  async findFeishuSender(userOpenId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { type: ProviderType.FEISHU },
    });
    if (!provider) {
      return null;
    }

    return this.prisma.platformAccount.findUnique({
      where: {
        providerId_externalSubjectId: {
          providerId: provider.id,
          externalSubjectId: userOpenId,
        },
      },
      include: {
        user: true,
        provider: true,
      },
    });
  }

  async getFeishuChatAccess(userOpenId: string) {
    const account = await this.findFeishuSender(userOpenId);
    if (!account) {
      return {
        allowed: false,
        reason: 'user_not_found',
        account: null,
      };
    }

    if (!account.enabled) {
      return {
        allowed: false,
        reason: 'platform_account_disabled',
        account,
      };
    }

    if (account.user.status !== UserStatus.active) {
      return {
        allowed: false,
        reason: 'user_disabled',
        account,
      };
    }

    return {
      allowed: true,
      reason: null,
      account,
    };
  }

  async getFeishuPersonalAuthorization(userOpenId: string) {
    const access = await this.getFeishuChatAccess(userOpenId);
    if (!access.allowed || !access.account) {
      return {
        access,
        authorization: null,
      };
    }

    const authorization = await this.prisma.platformAuthorization.findUnique({
      where: {
        providerId_authKind_accountKey: {
          providerId: access.account.providerId,
          authKind: AuthorizationKind.personal,
          accountKey: access.account.user.username,
        },
      },
      include: {
        user: true,
        provider: true,
        platformAccount: true,
      },
    });

    return {
      access,
      authorization,
    };
  }

  async listEnabledFeishuOpenIds() {
    const provider = await this.prisma.provider.findUnique({
      where: { type: ProviderType.FEISHU },
    });
    if (!provider) {
      return [];
    }

    const accounts = await this.prisma.platformAccount.findMany({
      where: {
        providerId: provider.id,
        enabled: true,
        user: {
          status: UserStatus.active,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((account) => account.externalSubjectId);
  }

  async listUsers() {
    return this.prisma.user.findMany({
      include: {
        platformAccounts: {
          include: { provider: true },
          orderBy: { createdAt: 'asc' },
        },
        platformAuthorizations: {
          include: { provider: true, platformAccount: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listAppAuthorizations() {
    return this.prisma.platformAuthorization.findMany({
      where: { authKind: AuthorizationKind.app },
      include: { provider: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createUser(username: string, displayName?: string) {
    return this.prisma.user.create({
      data: {
        username,
        displayName: displayName || username,
        status: UserStatus.active,
        isSuperAdmin: false,
      },
    });
  }

  async setUserStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async addFeishuPlatformAccount(userId: string, externalSubjectId: string, displayName?: string) {
    const provider = await this.getOrCreateFeishuProvider();
    return this.prisma.platformAccount.upsert({
      where: {
        providerId_externalSubjectId: {
          providerId: provider.id,
          externalSubjectId,
        },
      },
      update: {
        userId,
        displayName: displayName || undefined,
        enabled: true,
      },
      create: {
        providerId: provider.id,
        userId,
        externalSubjectId,
        displayName: displayName || undefined,
        enabled: true,
      },
    });
  }

  async setPlatformAccountEnabled(platformAccountId: string, enabled: boolean) {
    return this.prisma.platformAccount.update({
      where: { id: platformAccountId },
      data: { enabled },
    });
  }

  async setFeishuPersonalAuthorizationEnabled(userId: string, enabled: boolean) {
    const provider = await this.getOrCreateFeishuProvider();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('user not found');
    }

    const existing = await this.prisma.platformAuthorization.findUnique({
      where: {
        providerId_authKind_accountKey: {
          providerId: provider.id,
          authKind: AuthorizationKind.personal,
          accountKey: user.username,
        },
      },
    });

    const nextStatus = (() => {
      if (!enabled) {
        return existing?.status || AuthorizationStatus.expired;
      }
      if (!existing?.accessTokenEncrypted || !existing.expiresAt) {
        return AuthorizationStatus.expired;
      }
      if (existing.status === AuthorizationStatus.reauthorization_required) {
        return AuthorizationStatus.reauthorization_required;
      }
      return existing.expiresAt.getTime() > Date.now()
        ? AuthorizationStatus.active
        : AuthorizationStatus.expired;
    })();

    const authorization = await this.prisma.platformAuthorization.upsert({
      where: {
        providerId_authKind_accountKey: {
          providerId: provider.id,
          authKind: AuthorizationKind.personal,
          accountKey: user.username,
        },
      },
      update: {
        userId: user.id,
        enabled,
        status: nextStatus,
      },
      create: {
        providerId: provider.id,
        authKind: AuthorizationKind.personal,
        userId: user.id,
        accountKey: user.username,
        enabled,
        status: enabled ? AuthorizationStatus.expired : AuthorizationStatus.revoked,
      },
    });

    await this.prisma.authEvent.create({
      data: {
        platformAuthorizationId: authorization.id,
        type: enabled ? 'personal_authorization_enabled' : 'personal_authorization_disabled',
        message: enabled
          ? `手动开启 Feishu personal 授权：${authorization.accountKey}`
          : `手动关闭 Feishu personal 授权：${authorization.accountKey}`,
      },
    });

    return authorization;
  }

  async setFeishuAppAuthorizationEnabled(enabled: boolean) {
    const provider = await this.getOrCreateFeishuProvider();
    return this.prisma.platformAuthorization.upsert({
      where: {
        providerId_authKind_accountKey: {
          providerId: provider.id,
          authKind: AuthorizationKind.app,
          accountKey: process.env.FEISHU_APP_AUTH_ACCOUNT_KEY || 'openclaw-main',
        },
      },
      update: {
        enabled,
        status: enabled ? AuthorizationStatus.active : AuthorizationStatus.revoked,
      },
      create: {
        providerId: provider.id,
        authKind: AuthorizationKind.app,
        accountKey: process.env.FEISHU_APP_AUTH_ACCOUNT_KEY || 'openclaw-main',
        enabled,
        status: enabled ? AuthorizationStatus.active : AuthorizationStatus.revoked,
      },
    });
  }
}
