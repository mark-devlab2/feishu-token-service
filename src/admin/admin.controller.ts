import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('admin')
export class AdminController {
  @Get()
  redirectToShell(@Res() res: Response) {
    const target = process.env.ADMIN_SHELL_URL || 'https://admin.himark.me/auth-center';
    return res.redirect(target);
  }
}
