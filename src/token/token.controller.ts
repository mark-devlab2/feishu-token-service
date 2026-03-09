import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { TokenService } from './token.service';

@Controller('tokens/feishu')
@UseGuards(ApiKeyGuard)
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('resolve')
  resolve(@Query('user_open_id') userOpenId: string) {
    return this.tokenService.resolve(userOpenId);
  }

  @Get(':user_open_id')
  getToken(@Param('user_open_id') userOpenId: string) {
    return this.tokenService.getAuthorizationSummary(userOpenId);
  }

  @Post('refresh/:user_open_id')
  refresh(@Param('user_open_id') userOpenId: string) {
    return this.tokenService.refresh(userOpenId);
  }

  @Post('invalidate/:user_open_id')
  invalidate(@Param('user_open_id') userOpenId: string) {
    return this.tokenService.invalidate(userOpenId);
  }
}
