import { Body, Controller, Get, Post, Query, Render, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateAuthLinkDto } from './dto/create-auth-link.dto';
import { AuthService } from './auth.service';

@Controller('auth/feishu')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ApiKeyGuard)
  @Get('status')
  getStatus(@Query('user_open_id') userOpenId: string) {
    return this.authService.getStatus(userOpenId);
  }

  @UseGuards(ApiKeyGuard)
  @Post('link')
  createAuthLink(@Body() body: CreateAuthLinkDto) {
    return this.authService.createAuthLink(body.userOpenId, body.userLabel, body.returnContext);
  }

  @Get('callback')
  @Render('callback')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    const result = await this.authService.handleCallback(code, state);
    return {
      title: result.success ? 'Feishu 授权已完成' : 'Feishu 授权未完成',
      success: result.success,
      userOpenId: result.userOpenId,
      returnContext: result.returnContext,
    };
  }
}
