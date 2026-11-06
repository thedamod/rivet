export interface OAuthCredentials {
  clientId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  refreshExpiresAt?: number;
}
export interface OAuthStatus {
  configured: boolean;
  authenticated: boolean;
  pending: null | {
    userCode: string;
    verificationUri: string;
    expiresAt: number;
    interval: number;
  };
}
export function createOAuthSession(options: {
  clientId: string;
  storage?: {
    load(): Promise<OAuthCredentials | null>;
    save(value: OAuthCredentials | null): Promise<void>;
  };
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}): {
  begin(): Promise<OAuthStatus>;
  poll(): Promise<OAuthStatus>;
  cancel(): Promise<OAuthStatus>;
  logout(): Promise<OAuthStatus>;
  status(): Promise<OAuthStatus>;
  accessToken(): Promise<string | null>;
  invalidate(token: string | null): Promise<void>;
};
export const scopes: string;
