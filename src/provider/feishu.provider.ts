import crypto from 'node:crypto';
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { AuthorizationLinkInput, OAuthProvider, OAuthTokenResponse } from './oauth-provider.interface';

type FeishuAccessTokenResponse = {
  code: number;
  msg?: string;
  data?: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    refresh_expires_in?: number;
    scope?: string;
  };
};

type FeishuRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  path: string;
  params?: Record<string, string | number | undefined>;
  data?: Record<string, unknown>;
};

@Injectable()
export class FeishuProvider implements OAuthProvider {
  readonly providerKey = 'feishu';
  private readonly baseUrl = (process.env.FEISHU_BASE_URL || 'https://open.feishu.cn').replace(/\/+$/, '');
  private readonly redirectUri = process.env.FEISHU_REDIRECT_URI || 'http://localhost:3080/auth/feishu/callback';
  private readonly scopes = (process.env.FEISHU_SCOPES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

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

    return this.normalizeTokenResponse(response.data);
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
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

    return this.normalizeTokenResponse(response.data);
  }

  defaultScopes(): string[] {
    return this.scopes;
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

  private normalizeTokenResponse(data: FeishuAccessTokenResponse): OAuthTokenResponse {
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
      scope: (data.data.scope || '').split(' ').filter(Boolean),
      raw: data as unknown as Record<string, unknown>,
    };
  }

  private async requestWithUserAccessToken(userAccessToken: string, options: FeishuRequestOptions) {
    const url = new URL(options.path, this.baseUrl);
    for (const [key, value] of Object.entries(options.params || {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

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
      throw new Error(`feishu user data request failed: ${body.msg || 'unknown'}`);
    }

    return body?.data ?? body;
  }
}
