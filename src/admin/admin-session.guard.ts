import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';

type AdminRequest = Request & {
  admin?: {
    id: string;
    username: string;
    status: string;
  };
};

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const rawToken = request.cookies?.[AdminAuthService.COOKIE_NAME];
    const admin = await this.adminAuthService.getSession(rawToken);
    if (!admin) {
      throw new UnauthorizedException('登录状态已失效');
    }
    request.admin = admin;
    return true;
  }
}
