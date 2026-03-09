import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { DirectoryService } from '../directory/directory.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directoryService: DirectoryService,
  ) {}

  async getDashboard() {
    const users = await this.directoryService.listUsers();
    const appAuthorizations = await this.directoryService.listAppAuthorizations();
    const alerts = await this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { platformAuthorization: true },
    });
    const events = await this.prisma.authEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { platformAuthorization: true },
    });

    const activeUsers = users.filter((user) => user.status === UserStatus.active).length;
    const linkedPlatformAccounts = users.reduce(
      (count, user) => count + user.platformAccounts.filter((item) => item.enabled).length,
      0,
    );
    const enabledPersonalAuthorizations = users.reduce(
      (count, user) =>
        count +
        user.platformAuthorizations.filter(
          (authorization) =>
            authorization.authKind === 'personal' && authorization.enabled,
        ).length,
      0,
    );

    return {
      summary: {
        activeUsers,
        linkedPlatformAccounts,
        enabledPersonalAuthorizations,
        openAlerts: alerts.filter((alert) => alert.status === 'open').length,
      },
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status,
        isSuperAdmin: user.isSuperAdmin,
        platformAccounts: user.platformAccounts.map((account) => ({
          id: account.id,
          provider: {
            type: account.provider.type,
            displayName: account.provider.displayName,
          },
          externalSubjectId: account.externalSubjectId,
          displayName: account.displayName,
          enabled: account.enabled,
        })),
        personalAuthorizations: user.platformAuthorizations
          .filter((authorization) => authorization.authKind === 'personal')
          .map((authorization) => ({
            id: authorization.id,
            provider: {
              type: authorization.provider.type,
              displayName: authorization.provider.displayName,
            },
            accountKey: authorization.accountKey,
            enabled: authorization.enabled,
            status: authorization.status,
            expiresAt: authorization.expiresAt,
          })),
      })),
      appAuthorizations: appAuthorizations.map((authorization) => ({
        id: authorization.id,
        provider: {
          type: authorization.provider.type,
          displayName: authorization.provider.displayName,
        },
        accountKey: authorization.accountKey,
        enabled: authorization.enabled,
        status: authorization.status,
      })),
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
      })),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        level: alert.level,
        status: alert.status,
        kind: alert.kind,
        message: alert.message,
        createdAt: alert.createdAt,
      })),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const events = await this.prisma.authEvent.findMany({
      where: {
        platformAuthorization: {
          userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const alerts = await this.prisma.alert.findMany({
      where: {
        platformAuthorization: {
          userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status,
        isSuperAdmin: user.isSuperAdmin,
      },
      platformAccounts: user.platformAccounts.map((account) => ({
        id: account.id,
        provider: {
          type: account.provider.type,
          displayName: account.provider.displayName,
        },
        externalSubjectId: account.externalSubjectId,
        displayName: account.displayName,
        enabled: account.enabled,
      })),
      personalAuthorizations: user.platformAuthorizations
        .filter((authorization) => authorization.authKind === 'personal')
        .map((authorization) => ({
          id: authorization.id,
          provider: {
            type: authorization.provider.type,
            displayName: authorization.provider.displayName,
          },
          accountKey: authorization.accountKey,
          enabled: authorization.enabled,
          status: authorization.status,
          scopes: authorization.scopes,
          expiresAt: authorization.expiresAt,
          refreshExpiresAt: authorization.refreshExpiresAt,
          lastRefreshAt: authorization.lastRefreshAt,
          lastFailureAt: authorization.lastFailureAt,
          failureReason: authorization.failureReason,
        })),
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
      })),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        level: alert.level,
        status: alert.status,
        kind: alert.kind,
        message: alert.message,
        createdAt: alert.createdAt,
      })),
    };
  }
}
