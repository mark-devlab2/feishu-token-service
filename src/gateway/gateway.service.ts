import { Injectable } from '@nestjs/common';
import { FeishuProvider } from '../provider/feishu.provider';
import { TokenService } from '../token/token.service';

type MessageListInput = {
  containerIdType: string;
  containerId: string;
  pageSize: number;
  pageToken?: string;
};

type DriveListInput = {
  folderToken?: string;
  pageSize: number;
  pageToken?: string;
};

type MessageSearchInput = {
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
};

type AppSearchInput = {
  query: string;
  pageSize?: number;
  pageToken?: string;
  userIdType?: string;
};

type DocumentSearchInput = {
  query: string;
  count?: number;
  offset?: number;
  ownerIds?: string[];
  chatIds?: string[];
  docsTypes?: string[];
};

type TaskListInput = {
  completed?: boolean;
  pageSize?: number;
  pageToken?: string;
  type?: string;
  userIdType?: string;
};

type TaskCreateInput = {
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
};

@Injectable()
export class GatewayService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly provider: FeishuProvider,
  ) {}

  async readDocument(userOpenId: string, documentId: string) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.getDocumentRawContent(accessToken, documentId);
    return {
      provider: 'feishu',
      capability: 'docs',
      userOpenId,
      source: {
        resourceType: 'docx',
        documentId,
      },
      data,
    };
  }

  async readWikiNode(userOpenId: string, nodeToken: string, objType: string) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.getWikiNode(accessToken, nodeToken, objType);
    return {
      provider: 'feishu',
      capability: 'wiki',
      userOpenId,
      source: {
        resourceType: 'wiki',
        nodeToken,
        objType,
      },
      data,
    };
  }

  async readMinutes(userOpenId: string, minutesToken: string) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.getMinutes(accessToken, minutesToken);
    return {
      provider: 'feishu',
      capability: 'minutes',
      userOpenId,
      source: {
        resourceType: 'minutes',
        minutesToken,
      },
      data,
    };
  }

  async listDriveFiles(userOpenId: string, input: DriveListInput) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.listDriveFiles(accessToken, input);
    return {
      provider: 'feishu',
      capability: 'drive',
      userOpenId,
      source: {
        resourceType: 'drive',
        folderToken: input.folderToken || null,
      },
      data,
    };
  }

  async listMessages(userOpenId: string, input: MessageListInput) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.listMessages(accessToken, input);
    return {
      provider: 'feishu',
      capability: 'messages',
      userOpenId,
      source: {
        resourceType: 'messages',
        containerIdType: input.containerIdType,
        containerId: input.containerId,
      },
      data,
    };
  }

  async getMessage(userOpenId: string, messageId: string) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.getMessage(accessToken, messageId);
    return {
      provider: 'feishu',
      capability: 'messages',
      userOpenId,
      source: {
        resourceType: 'message',
        messageId,
      },
      data,
    };
  }

  async searchMessages(userOpenId: string, input: MessageSearchInput) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.searchMessages(accessToken, input);
    return {
      provider: 'feishu',
      capability: 'messages.search',
      userOpenId,
      source: {
        resourceType: 'messages.search',
        query: input.query,
      },
      data,
    };
  }

  async searchDocuments(userOpenId: string, input: DocumentSearchInput) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.searchDocuments(accessToken, input);
    return {
      provider: 'feishu',
      capability: 'documents.search',
      userOpenId,
      source: {
        resourceType: 'documents.search',
        query: input.query,
      },
      data,
    };
  }

  async searchApps(userOpenId: string, input: AppSearchInput) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.searchApps(accessToken, input);
    return {
      provider: 'feishu',
      capability: 'apps.search',
      userOpenId,
      source: {
        resourceType: 'apps.search',
        query: input.query,
      },
      data,
    };
  }

  async listTasks(userOpenId: string, input: TaskListInput) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.listTasks(accessToken, input);
    return {
      provider: 'feishu',
      capability: 'tasks.list',
      userOpenId,
      source: {
        resourceType: 'tasks.list',
        type: input.type || 'my_tasks',
      },
      data,
    };
  }

  async createTask(userOpenId: string, input: TaskCreateInput) {
    const accessToken = await this.tokenService.getAvailableAccessToken(userOpenId);
    const data = await this.provider.createTask(accessToken, input);
    return {
      provider: 'feishu',
      capability: 'tasks.create',
      userOpenId,
      source: {
        resourceType: 'tasks.create',
      },
      data,
    };
  }
}
