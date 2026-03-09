import { AdminAccountStatus } from '@prisma/client';
import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { PrismaService } from '../common/services/prisma.service';

type SessionAdmin = {
  id: string;
  username: string;
  status: AdminAccountStatus;
};

@Injectable()
export class AdminAuthService implements OnModuleInit {
  static readonly COOKIE_NAME = 'himark_admin_session';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultAdmin();
  }

  async ensureDefaultAdmin() {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'change-me';
    const passwordHash = this.hashPassword(password);

    await this.prisma.adminAccount.upsert({
      where: { username },
      update: {
        passwordHash,
        status: AdminAccountStatus.active,
      },
      create: {
        username,
        passwordHash,
        status: AdminAccountStatus.active,
      },
    });
  }

  async login(username: string, password: string) {
    const account = await this.prisma.adminAccount.findUnique({ where: { username } });
    if (!account || account.status !== AdminAccountStatus.active) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!this.verifyPassword(password, account.passwordHash)) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.getSessionTtlHours() * 60 * 60 * 1000);

    await this.prisma.adminSession.create({
      data: {
        adminAccountId: account.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      token: rawToken,
      expiresAt,
      admin: {
        id: account.id,
        username: account.username,
        status: account.status,
      },
    };
  }

  async logout(rawToken?: string) {
    if (!rawToken) {
      return;
    }

    await this.prisma.adminSession.deleteMany({
      where: { tokenHash: this.hashToken(rawToken) },
    });
  }

  async getSession(rawToken?: string): Promise<SessionAdmin | null> {
    if (!rawToken) {
      return null;
    }

    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { adminAccount: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    if (session.adminAccount.status !== AdminAccountStatus.active) {
      return null;
    }

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      id: session.adminAccount.id,
      username: session.adminAccount.username,
      status: session.adminAccount.status,
    };
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, expected] = stored.split(':');
    if (!salt || !expected) {
      return false;
    }
    const actual = scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getSessionTtlHours() {
    return Number(process.env.ADMIN_SESSION_TTL_HOURS || 24);
  }
}
