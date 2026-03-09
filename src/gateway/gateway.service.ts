import { Injectable } from '@nestjs/common';
import { FeishuProvider } from '../provider/feishu.provider';
import { TokenService } from '../token/token.service';

type MessageListInput = {
  containerIdType: string;
  containerId: string;
  pageSize: number;
  pageToken?: string;
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
}
