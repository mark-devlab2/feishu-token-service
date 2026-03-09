import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserStatus } from '@prisma/client';
import { DirectoryService } from '../directory/directory.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminService } from './admin.service';
import { AdminSessionGuard } from './admin-session.guard';

@Controller('admin-api')
export class AdminApiController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminService: AdminService,
    private readonly directoryService: DirectoryService,
  ) {}

  @Post('session/login')
  @HttpCode(200)
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.adminAuthService.login((username || '').trim(), password || '');
    const secureCookie = process.env.NODE_ENV === 'production';
    res.cookie(AdminAuthService.COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
      path: '/',
      expires: session.expiresAt,
    });
    return {
      admin: session.admin,
      expiresAt: session.expiresAt,
    };
  }

  @Post('session/logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.[AdminAuthService.COOKIE_NAME];
    await this.adminAuthService.logout(rawToken);
    res.clearCookie(AdminAuthService.COOKIE_NAME, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { ok: true };
  }

  @Get('session/me')
  @UseGuards(AdminSessionGuard)
  async me(@Req() req: Request & { admin?: unknown }) {
    return {
      admin: req.admin,
    };
  }

  @Get('dashboard')
  @UseGuards(AdminSessionGuard)
  async dashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users/:id')
  @UseGuards(AdminSessionGuard)
  async userDetail(@Param('id') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Post('users')
  @UseGuards(AdminSessionGuard)
  async createUser(
    @Body('username') username: string,
    @Body('display_name') displayName: string,
  ) {
    return this.directoryService.createUser(username.trim(), displayName?.trim());
  }

  @Post('users/:id/enable')
  @UseGuards(AdminSessionGuard)
  async enableUser(@Param('id') userId: string) {
    return this.directoryService.setUserStatus(userId, UserStatus.active);
  }

  @Post('users/:id/disable')
  @UseGuards(AdminSessionGuard)
  async disableUser(@Param('id') userId: string) {
    return this.directoryService.setUserStatus(userId, UserStatus.disabled);
  }

  @Post('users/:id/platform-accounts')
  @UseGuards(AdminSessionGuard)
  async addPlatformAccount(
    @Param('id') userId: string,
    @Body('provider') provider: string,
    @Body('external_subject_id') externalSubjectId: string,
    @Body('display_name') displayName: string,
  ) {
    if ((provider || '').toLowerCase() !== 'feishu') {
      return { ok: false, reason: 'provider unsupported' };
    }
    return this.directoryService.addFeishuPlatformAccount(
      userId,
      externalSubjectId.trim(),
      displayName?.trim(),
    );
  }

  @Post('platform-accounts/:id/enable')
  @UseGuards(AdminSessionGuard)
  async enablePlatformAccount(@Param('id') platformAccountId: string) {
    return this.directoryService.setPlatformAccountEnabled(platformAccountId, true);
  }

  @Post('platform-accounts/:id/disable')
  @UseGuards(AdminSessionGuard)
  async disablePlatformAccount(@Param('id') platformAccountId: string) {
    return this.directoryService.setPlatformAccountEnabled(platformAccountId, false);
  }

  @Post('personal-authorizations/:provider/:userId/enable')
  @UseGuards(AdminSessionGuard)
  async enablePersonalAuthorization(
    @Param('userId') userId: string,
    @Param('provider') provider: string,
  ) {
    if (provider !== 'feishu') {
      return { ok: false, reason: 'provider unsupported' };
    }
    return this.directoryService.setFeishuPersonalAuthorizationEnabled(userId, true);
  }

  @Post('personal-authorizations/:provider/:userId/disable')
  @UseGuards(AdminSessionGuard)
  async disablePersonalAuthorization(
    @Param('userId') userId: string,
    @Param('provider') provider: string,
  ) {
    if (provider !== 'feishu') {
      return { ok: false, reason: 'provider unsupported' };
    }
    return this.directoryService.setFeishuPersonalAuthorizationEnabled(userId, false);
  }

  @Get('app-authorizations')
  @UseGuards(AdminSessionGuard)
  async listAppAuthorizations() {
    return this.directoryService.listAppAuthorizations();
  }

  @Post('app-authorizations/:provider/enable')
  @UseGuards(AdminSessionGuard)
  async enableAppAuthorization(@Param('provider') provider: string) {
    if (provider !== 'feishu') {
      return { ok: false, reason: 'provider unsupported' };
    }
    return this.directoryService.setFeishuAppAuthorizationEnabled(true);
  }

  @Post('app-authorizations/:provider/disable')
  @UseGuards(AdminSessionGuard)
  async disableAppAuthorization(@Param('provider') provider: string) {
    if (provider !== 'feishu') {
      return { ok: false, reason: 'provider unsupported' };
    }
    return this.directoryService.setFeishuAppAuthorizationEnabled(false);
  }
}
