import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DirectoryService } from '../directory/directory.service';

@Controller('integrations/openclaw')
@UseGuards(ApiKeyGuard)
export class IntegrationController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('feishu/allowlist')
  async getFeishuAllowlist() {
    const allowFrom = await this.directoryService.listEnabledFeishuOpenIds();
    return {
      provider: 'feishu',
      dmPolicy: 'allowlist',
      allowFrom,
    };
  }
}
