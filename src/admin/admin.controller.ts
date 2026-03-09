import { Body, Controller, Get, Param, Post, Render, Res } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../common/services/prisma.service';
import { DirectoryService } from '../directory/directory.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directoryService: DirectoryService,
  ) {}

  @Get()
  @Render('dashboard')
  async dashboard() {
    const users = await this.directoryService.listUsers();
    const appAuthorizations = await this.directoryService.listAppAuthorizations();
    const alerts = await this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { platformAuthorization: true },
    });
    const events = await this.prisma.authEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { platformAuthorization: true },
    });

    return {
      users,
      appAuthorizations,
      alerts,
      events,
    };
  }

  @Get('users/:id')
  @Render('user-detail')
  async userDetail(@Param('id') userId: string) {
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
      user,
      events,
      alerts,
    };
  }

  @Post('users')
  async createUser(
    @Body('username') username: string,
    @Body('display_name') displayName: string,
    @Res() res: Response,
  ) {
    await this.directoryService.createUser(username.trim(), displayName?.trim());
    return res.redirect('/admin');
  }

  @Post('users/:id/enable')
  async enableUser(@Param('id') userId: string, @Res() res: Response) {
    await this.directoryService.setUserStatus(userId, UserStatus.active);
    return res.redirect('/admin');
  }

  @Post('users/:id/disable')
  async disableUser(@Param('id') userId: string, @Res() res: Response) {
    await this.directoryService.setUserStatus(userId, UserStatus.disabled);
    return res.redirect('/admin');
  }

  @Post('users/:id/platform-accounts')
  async addPlatformAccount(
    @Param('id') userId: string,
    @Body('provider') provider: string,
    @Body('external_subject_id') externalSubjectId: string,
    @Body('display_name') displayName: string,
    @Res() res: Response,
  ) {
    if ((provider || '').toLowerCase() !== 'feishu') {
      return res.redirect(`/admin/users/${userId}`);
    }
    await this.directoryService.addFeishuPlatformAccount(
      userId,
      externalSubjectId.trim(),
      displayName?.trim(),
    );
    return res.redirect(`/admin/users/${userId}`);
  }

  @Post('platform-accounts/:id/enable')
  async enablePlatformAccount(@Param('id') platformAccountId: string, @Res() res: Response) {
    await this.directoryService.setPlatformAccountEnabled(platformAccountId, true);
    return res.redirect('/admin');
  }

  @Post('platform-accounts/:id/disable')
  async disablePlatformAccount(@Param('id') platformAccountId: string, @Res() res: Response) {
    await this.directoryService.setPlatformAccountEnabled(platformAccountId, false);
    return res.redirect('/admin');
  }

  @Post('users/:id/personal-authorizations/:provider/enable')
  async enablePersonalAuthorization(
    @Param('id') userId: string,
    @Param('provider') provider: string,
    @Res() res: Response,
  ) {
    if (provider !== 'feishu') {
      return res.redirect(`/admin/users/${userId}`);
    }
    await this.directoryService.setFeishuPersonalAuthorizationEnabled(userId, true);
    return res.redirect(`/admin/users/${userId}`);
  }

  @Post('users/:id/personal-authorizations/:provider/disable')
  async disablePersonalAuthorization(
    @Param('id') userId: string,
    @Param('provider') provider: string,
    @Res() res: Response,
  ) {
    if (provider !== 'feishu') {
      return res.redirect(`/admin/users/${userId}`);
    }
    await this.directoryService.setFeishuPersonalAuthorizationEnabled(userId, false);
    return res.redirect(`/admin/users/${userId}`);
  }

  @Post('app-authorizations/:provider/enable')
  async enableAppAuthorization(@Param('provider') provider: string, @Res() res: Response) {
    if (provider !== 'feishu') {
      return res.redirect('/admin');
    }
    await this.directoryService.setFeishuAppAuthorizationEnabled(true);
    return res.redirect('/admin');
  }

  @Post('app-authorizations/:provider/disable')
  async disableAppAuthorization(@Param('provider') provider: string, @Res() res: Response) {
    if (provider !== 'feishu') {
      return res.redirect('/admin');
    }
    await this.directoryService.setFeishuAppAuthorizationEnabled(false);
    return res.redirect('/admin');
  }
}
