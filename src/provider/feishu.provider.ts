import crypto from 'node:crypto';
import axios from 'axios';
import { BadGatewayException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthorizationLinkInput, OAuthProvider, OAuthTokenResponse } from './oauth-provider.interface';

type FeishuAccessTokenResponse = {
  code: number;
  msg?: string;
  data?: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    refresh_expires_in?: number;
    scope?: string | string[];
    scopes?: string | string[];
  };
};

type FeishuRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  path: string;
  params?: Record<string, string | number | undefined>;
  data?: Record<string, unknown>;
};

const DEFAULT_PERSONAL_SCOPES = [
  'offline_access',
  'contact:user.base:readonly',
  'im:chat:readonly',
  'im:message:readonly',
  'search:message',
  'im:message.p2p_msg:get_as_user',
  'im:message.group_msg:get_as_user',
  'docx:document:readonly',
  'docs:document.content:read',
  'drive:drive:readonly',
  'space:document:retrieve',
  'wiki:node:read',
  'wiki:wiki:readonly',
  'minutes:minutes:readonly',
  'minutes:minutes.basic:read',
];

@Injectable()
export class FeishuProvider implements OAuthProvider {
  readonly providerKey = 'feishu';
  private readonly logger = new Logger(FeishuProvider.name);
  private readonly baseUrl = (process.env.FEISHU_BASE_URL || 'https://open.feishu.cn').replace(/\/+$/, '');
  private readonly redirectUri = process.env.FEISHU_REDIRECT_URI || 'http://localhost:3080/auth/feishu/callback';
  private readonly scopes = this.normalizeScopes(process.env.FEISHU_SCOPES || '');

  buildAuthorizationUrl(input: AuthorizationLinkInput): string {
    const url = new URL('/open-apis/authen/v1/authorize', this.baseUrl);
    url.searchParams.set('app_id', process.env.FEISHU_APP_ID || '');
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', input.scopes.join(' '));
    url.searchParams.set('state', input.state);
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const appAccessToken = await this.fetchAppAccessToken();
    const response = await axios.post<FeishuAccessTokenResponse>(
      `${this.baseUrl}/open-apis/authen/v1/access_token`,
      {
        grant_type: 'authorization_code',
        code,
      },
      {
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
        },
      },
    );

    return this.normalizeTokenResponse(response.data, this.defaultScopes());
  }

  async refreshAccessToken(refreshToken: string, fallbackScopes?: string[]): Promise<OAuthTokenResponse> {
    const appAccessToken = await this.fetchAppAccessToken();
    const response = await axios.post<FeishuAccessTokenResponse>(
      `${this.baseUrl}/open-apis/authen/v1/refresh_access_token`,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      {
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
        },
      },
    );

    return this.normalizeTokenResponse(response.data, fallbackScopes ?? this.defaultScopes());
  }

  defaultScopes(): string[] {
    if (this.scopes.length > 0) {
      return this.scopes;
    }
    return [...DEFAULT_PERSONAL_SCOPES];
  }

  generateState(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  async getDocumentRawContent(userAccessToken: string, documentId: string) {
    return this.requestWithUserAccessToken(userAccessToken, {
      path: `/open-apis/docx/v1/documents/${documentId}/raw_content`,
    });
  }

  async getWikiNode(userAccessToken: string, nodeToken: string, objType: string) {
    return this.requestWithUserAccessToken(userAccessToken, {
      path: '/open-apis/wiki/v2/spaces/get_node',
      params: {
        token: nodeToken,
        obj_type: objType,
      },
    });
  }

  async getMinutes(userAccessToken: string, minutesToken: string) {
    return this.requestWithUserAccessToken(userAccessToken, {
      path: `/open-apis/minutes/v1/minutes/${minutesToken}`,
    });
  }

  async listDriveFiles(
    userAccessToken: string,
    input: {
      folderToken?: string;
      pageSize?: number;
      pageToken?: string;
    } = {},
  ) {
    const data = await this.requestWithUserAccessToken(userAccessToken, {
      path: '/open-apis/drive/v1/files',
      params: {
        folder_token: input.folderToken,
        page_size: input.pageSize,
        page_token: input.pageToken,
      },
    });

    const payload = (data || {}) as {
      files?: Array<{
        token?: string;
        name?: string;
        type?: string;
        url?: string;
        created_time?: string;
        modified_time?: string;
        owner_id?: string;
      }>;
      next_page_token?: string;
       has_more?: boolean;
    };

    return {
      files:
        payload.files?.map((file) => ({
          token: file.token || '',
          name: file.name || '',
          type: file.type || '',
          url: file.url || '',
          created_time: file.created_time || '',
          modified_time: file.modified_time || '',
          owner_id: file.owner_id || '',
        })) || [],
      next_page_token: payload.next_page_token || '',
      has_more: Boolean(payload.has_more),
    };
  }

  async listMessages(
    userAccessToken: string,
    input: {
      containerIdType: string;
      containerId: string;
      pageSize?: number;
      pageToken?: string;
    },
  ) {
    return this.requestWithUserAccessToken(userAccessToken, {
      path: '/open-apis/im/v1/messages',
      params: {
        container_id_type: input.containerIdType,
        container_id: input.containerId,
        page_size: input.pageSize,
        page_token: input.pageToken,
      },
    });
  }

  async getMessage(userAccessToken: string, messageId: string) {
    return this.requestWithUserAccessToken(userAccessToken, {
      path: `/open-apis/im/v1/messages/${messageId}`,
    });
  }

  private async fetchAppAccessToken(): Promise<string> {
    const response = await axios.post<{ code: number; app_access_token?: string; msg?: string }>(
      `${this.baseUrl}/open-apis/auth/v3/app_access_token/internal`,
      {
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      },
    );

    if (response.data.code !== 0 || !response.data.app_access_token) {
      throw new Error(`failed to fetch Feishu app access token: ${response.data.msg || 'unknown'}`);
    }

    return response.data.app_access_token;
  }

  private normalizeTokenResponse(
    data: FeishuAccessTokenResponse,
    fallbackScopes: string[] = [],
  ): OAuthTokenResponse {
    if (data.code !== 0 || !data.data?.access_token) {
      throw new Error(`feishu token exchange failed: ${data.msg || 'unknown'}`);
    }

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: new Date(Date.now() + data.data.expires_in * 1000),
      refreshExpiresAt: data.data.refresh_expires_in
        ? new Date(Date.now() + data.data.refresh_expires_in * 1000)
        : undefined,
      scope: this.parseScopes(data.data.scope, data.data.scopes, fallbackScopes),
      raw: data as unknown as Record<string, unknown>,
    };
  }

  private parseScopes(
    primary: string | string[] | undefined,
    secondary: string | string[] | undefined,
    fallbackScopes: string[],
  ) {
    const parsed = this.normalizeScopes(primary).concat(this.normalizeScopes(secondary));
    if (parsed.length > 0) {
      return Array.from(new Set(parsed));
    }
    return Array.from(new Set(this.normalizeScopes(fallbackScopes)));
  }

  private normalizeScopes(value: string | string[] | undefined): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  private async requestWithUserAccessToken(userAccessToken: string, options: FeishuRequestOptions) {
    const url = new URL(options.path, this.baseUrl);
    for (const [key, value] of Object.entries(options.params || {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    try {
      const response = await axios.request({
        url: url.toString(),
        method: options.method || 'GET',
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
        data: options.data,
      });

      const body = response.data as { code?: number; msg?: string; data?: unknown };
      if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
        throw this.createUserDataException({
          path: options.path,
          message: body.msg,
          feishuCode: body.code,
        });
      }

      return body?.data ?? body;
    } catch (error) {
      throw this.normalizeUserDataError(error, options.path);
    }
  }

  private normalizeUserDataError(error: unknown, path: string) {
    if (error instanceof ForbiddenException || error instanceof NotFoundException || error instanceof BadGatewayException) {
      return error;
    }

    if (axios.isAxiosError(error) || this.hasHttpResponse(error)) {
      const response = error.response as { status?: number; data?: { code?: number; msg?: string } } | undefined;
      const body = response?.data as { code?: number; msg?: string } | undefined;
      return this.createUserDataException({
        path,
        status: response?.status,
        message: body?.msg || (error instanceof Error ? error.message : 'unknown'),
        feishuCode: body?.code,
      });
    }

    return this.createUserDataException({
      path,
      message: error instanceof Error ? error.message : 'unknown',
    });
  }

  private createUserDataException(input: {
    path: string;
    status?: number;
    message?: string;
    feishuCode?: number;
  }) {
    const normalized = (input.message || 'unknown').toLowerCase();
    this.logger.warn(
      JSON.stringify({
        event: 'feishu_user_data_request_failed',
        path: input.path,
        status: input.status ?? null,
        feishuCode: input.feishuCode ?? null,
        message: input.message || 'unknown',
      }),
    );

    if (
      input.status === 401 ||
      input.status === 403 ||
      normalized.includes('permission') ||
      normalized.includes('forbidden') ||
      normalized.includes('unauthorized') ||
      normalized.includes('no auth')
    ) {
      return new ForbiddenException('permission denied');
    }

    if (
      input.status === 404 ||
      (input.status === 400 && this.isResourceReadPath(input.path)) ||
      normalized.includes('not found') ||
      normalized.includes('not exist') ||
      normalized.includes('does not exist') ||
      normalized.includes('document not found') ||
      normalized.includes('document not exist') ||
      normalized.includes('object not found') ||
      normalized.includes('object not exist') ||
      normalized.includes('invalid document') ||
      normalized.includes('invalid doc') ||
      normalized.includes('invalid token') ||
      normalized.includes('resource not found')
    ) {
      return new NotFoundException('resource not found');
    }

    return new BadGatewayException('feishu upstream error');
  }

  private hasHttpResponse(error: unknown): error is {
    response?: {
      status?: number;
      data?: { code?: number; msg?: string };
    };
  } {
    return typeof error === 'object' && error !== null && 'response' in error;
  }

  private isResourceReadPath(path: string) {
    return (
      /^\/open-apis\/docx\/v1\/documents\/[^/]+\/raw_content$/.test(path) ||
      path === '/open-apis/wiki/v2/spaces/get_node' ||
      /^\/open-apis\/minutes\/v1\/minutes\/[^/]+$/.test(path) ||
      path === '/open-apis/drive/v1/files'
    );
  }
}
