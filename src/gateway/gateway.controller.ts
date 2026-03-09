import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { GatewayService } from './gateway.service';

@Controller('gateway/feishu')
@UseGuards(ApiKeyGuard)
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get('docs/:document_id')
  readDocument(@Param('document_id') documentId: string, @Query('user_open_id') userOpenId: string) {
    return this.gatewayService.readDocument(userOpenId, documentId);
  }

  @Get('wiki/nodes/:node_token')
  readWikiNode(
    @Param('node_token') nodeToken: string,
    @Query('user_open_id') userOpenId: string,
    @Query('obj_type') objType?: string,
  ) {
    return this.gatewayService.readWikiNode(userOpenId, nodeToken, objType || 'wiki');
  }

  @Get('minutes/:minutes_token')
  readMinutes(@Param('minutes_token') minutesToken: string, @Query('user_open_id') userOpenId: string) {
    return this.gatewayService.readMinutes(userOpenId, minutesToken);
  }

  @Get('messages')
  listMessages(
    @Query('user_open_id') userOpenId: string,
    @Query('container_id_type') containerIdType: string,
    @Query('container_id') containerId: string,
    @Query('page_size') pageSize?: string,
    @Query('page_token') pageToken?: string,
  ) {
    return this.gatewayService.listMessages(userOpenId, {
      containerIdType,
      containerId,
      pageSize: pageSize ? Number(pageSize) : 20,
      pageToken,
    });
  }

  @Get('messages/:message_id')
  getMessage(@Param('message_id') messageId: string, @Query('user_open_id') userOpenId: string) {
    return this.gatewayService.getMessage(userOpenId, messageId);
  }
}
