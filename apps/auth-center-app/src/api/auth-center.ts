import { http } from '../../../admin-shell/src/lib/http';

export type DashboardResponse = {
  summary: {
    activeUsers: number;
    linkedPlatformAccounts: number;
    enabledPersonalAuthorizations: number;
    openAlerts: number;
  };
  users: Array<{
    id: string;
    username: string;
    displayName?: string | null;
    status: string;
    isSuperAdmin: boolean;
    platformAccounts: Array<{
      id: string;
      provider: { type: string; displayName: string };
      externalSubjectId: string;
      displayName?: string | null;
      enabled: boolean;
    }>;
    personalAuthorizations: Array<{
      id: string;
      provider: { type: string; displayName: string };
      accountKey: string;
      enabled: boolean;
      status: string;
      expiresAt?: string | null;
    }>;
  }>;
  appAuthorizations: Array<{
    id: string;
    provider: { type: string; displayName: string };
    accountKey: string;
    enabled: boolean;
    status: string;
  }>;
  events: Array<{ id: string; type: string; message: string; createdAt: string }>;
  alerts: Array<{ id: string; level: string; status: string; kind: string; message: string; createdAt: string }>;
};

export type UserDetailResponse = {
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    status: string;
    isSuperAdmin: boolean;
  };
  platformAccounts: Array<{
    id: string;
    provider: { type: string; displayName: string };
    externalSubjectId: string;
    displayName?: string | null;
    enabled: boolean;
  }>;
  personalAuthorizations: Array<{
    id: string;
    provider: { type: string; displayName: string };
    accountKey: string;
    enabled: boolean;
    status: string;
    scopes: string[];
    expiresAt?: string | null;
    refreshExpiresAt?: string | null;
    lastRefreshAt?: string | null;
    lastFailureAt?: string | null;
    failureReason?: string | null;
  }>;
  events: Array<{ id: string; type: string; message: string; createdAt: string }>;
  alerts: Array<{ id: string; level: string; status: string; kind: string; message: string; createdAt: string }>;
};

export async function getDashboard() {
  const { data } = await http.get<DashboardResponse>('/dashboard');
  return data;
}

export async function getUserDetail(userId: string) {
  const { data } = await http.get<UserDetailResponse>(`/users/${userId}`);
  return data;
}

export async function createUser(payload: { username: string; display_name?: string }) {
  const { data } = await http.post('/users', payload);
  return data;
}

export async function setUserEnabled(userId: string, enabled: boolean) {
  const { data } = await http.post(`/users/${userId}/${enabled ? 'enable' : 'disable'}`);
  return data;
}

export async function addPlatformAccount(
  userId: string,
  payload: { provider: string; external_subject_id: string; display_name?: string },
) {
  const { data } = await http.post(`/users/${userId}/platform-accounts`, payload);
  return data;
}

export async function setPlatformAccountEnabled(platformAccountId: string, enabled: boolean) {
  const { data } = await http.post(`/platform-accounts/${platformAccountId}/${enabled ? 'enable' : 'disable'}`);
  return data;
}

export async function setPersonalAuthorizationEnabled(
  provider: string,
  userId: string,
  enabled: boolean,
) {
  const { data } = await http.post(`/personal-authorizations/${provider}/${userId}/${enabled ? 'enable' : 'disable'}`);
  return data;
}

export async function setAppAuthorizationEnabled(provider: string, enabled: boolean) {
  const { data } = await http.post(`/app-authorizations/${provider}/${enabled ? 'enable' : 'disable'}`);
  return data;
}
