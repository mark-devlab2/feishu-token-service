import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('drive/files')
  listDriveFiles(
    @Query('user_open_id') userOpenId: string,
    @Query('folder_token') folderToken?: string,
    @Query('page_size') pageSize?: string,
    @Query('page_token') pageToken?: string,
  ) {
    return this.gatewayService.listDriveFiles(userOpenId, {
      folderToken,
      pageSize: pageSize ? Number(pageSize) : 50,
      pageToken,
    });
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

  @Post('search/messages')
  searchMessages(
    @Body()
    body: {
      userOpenId: string;
      query: string;
      fromIds?: string[];
      chatIds?: string[];
      messageType?: string;
      fromType?: string;
      atChatterIds?: string[];
      startTime?: string;
      endTime?: string;
      pageSize?: number;
      pageToken?: string;
      userIdType?: string;
    },
  ) {
    return this.gatewayService.searchMessages(body.userOpenId, {
      query: body.query,
      fromIds: body.fromIds,
      chatIds: body.chatIds,
      messageType: body.messageType,
      fromType: body.fromType,
      atChatterIds: body.atChatterIds,
      startTime: body.startTime,
      endTime: body.endTime,
      pageSize: body.pageSize || 20,
      pageToken: body.pageToken,
      userIdType: body.userIdType || 'open_id',
    });
  }

  @Post('search/documents')
  searchDocuments(
    @Body()
    body: {
      userOpenId: string;
      query: string;
      count?: number;
      offset?: number;
      ownerIds?: string[];
      chatIds?: string[];
      docsTypes?: string[];
    },
  ) {
    return this.gatewayService.searchDocuments(body.userOpenId, {
      query: body.query,
      count: body.count || 10,
      offset: body.offset || 0,
      ownerIds: body.ownerIds,
      chatIds: body.chatIds,
      docsTypes: body.docsTypes,
    });
  }

  @Post('search/apps')
  searchApps(
    @Body()
    body: {
      userOpenId: string;
      query: string;
      pageSize?: number;
      pageToken?: string;
      userIdType?: string;
    },
  ) {
    return this.gatewayService.searchApps(body.userOpenId, {
      query: body.query,
      pageSize: body.pageSize || 20,
      pageToken: body.pageToken,
      userIdType: body.userIdType || 'open_id',
    });
  }

  @Get('tasks')
  listTasks(
    @Query('user_open_id') userOpenId: string,
    @Query('completed') completed?: string,
    @Query('page_size') pageSize?: string,
    @Query('page_token') pageToken?: string,
    @Query('type') type?: string,
    @Query('user_id_type') userIdType?: string,
  ) {
    return this.gatewayService.listTasks(userOpenId, {
      completed: completed === undefined ? undefined : completed === 'true',
      pageSize: pageSize ? Number(pageSize) : 20,
      pageToken,
      type: type || 'my_tasks',
      userIdType: userIdType || 'open_id',
    });
  }

  @Post('tasks')
  createTask(
    @Body()
    body: {
      userOpenId: string;
      summary: string;
      description?: string;
      due?: {
        timestamp?: string;
        is_all_day?: boolean;
      };
      start?: {
        timestamp?: string;
        is_all_day?: boolean;
      };
      clientToken?: string;
      members?: Array<Record<string, unknown>>;
      userIdType?: string;
    },
  ) {
    return this.gatewayService.createTask(body.userOpenId, {
      summary: body.summary,
      description: body.description,
      due: body.due,
      start: body.start,
      clientToken: body.clientToken,
      members: body.members,
      userIdType: body.userIdType || 'open_id',
    });
  }

  @Get('calendar/events')
  listCalendarEvents(
    @Query('user_open_id') userOpenId: string,
    @Query('page_size') pageSize?: string,
    @Query('page_token') pageToken?: string,
    @Query('anchor_time') anchorTime?: string,
    @Query('start_time') startTime?: string,
    @Query('end_time') endTime?: string,
    @Query('user_id_type') userIdType?: string,
  ) {
    return this.gatewayService.listCalendarEvents(userOpenId, {
      pageSize: pageSize ? Number(pageSize) : 20,
      pageToken,
      anchorTime,
      startTime,
      endTime,
      userIdType: userIdType || 'open_id',
    });
  }

  @Post('calendar/events/search')
  searchCalendarEvents(
    @Body()
    body: {
      userOpenId: string;
      query: string;
      pageSize?: number;
      pageToken?: string;
      startTime?: string;
      endTime?: string;
      userIdType?: string;
      timezone?: string;
    },
  ) {
    return this.gatewayService.searchCalendarEvents(body.userOpenId, {
      query: body.query,
      pageSize: body.pageSize || 20,
      pageToken: body.pageToken,
      startTime: body.startTime,
      endTime: body.endTime,
      userIdType: body.userIdType || 'open_id',
      timezone: body.timezone || 'Asia/Shanghai',
    });
  }
}
