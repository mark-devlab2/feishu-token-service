export type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  refreshExpiresAt?: Date;
  scope: string[];
  raw: Record<string, unknown>;
};

export type AuthorizationLinkInput = {
  state: string;
  redirectUri: string;
  scopes: string[];
};

export interface OAuthProvider {
  readonly providerKey: string;
  buildAuthorizationUrl(input: AuthorizationLinkInput): string;
  exchangeCodeForToken(code: string): Promise<OAuthTokenResponse>;
  refreshAccessToken(refreshToken: string, fallbackScopes?: string[]): Promise<OAuthTokenResponse>;
}
