// Path: frontend/src/service/auth.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

const BASE_URL = `${API_URL}/api/v1/auth`;

const JSON_HEADERS = {"Content-Type": "application/json"};

const createAuthHeaders = (token?: string) => ({
  ...JSON_HEADERS,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const fetchApi = async (url: string, options: RequestInit): Promise<Response> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json();
    const detail = data.detail;
    if (typeof detail === 'object' && detail !== null && 'reason' in detail) {
      throw new Error(detail.reason);
    }
    throw new Error(typeof detail === 'string' ? detail : 'API request failed');
  }
  return response;
};

export const register = async (user: components['schemas']['UserCreate']) => {
  await fetchApi(`${BASE_URL}/register`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify(user),
  });
}

// ---------------------------------------------------------------------------
// Login – MFA aware
// ---------------------------------------------------------------------------

export interface LoginResult {
  /** Set when MFA is NOT required – the caller can proceed to the app. */
  access_token?: string;
  /** Set when MFA IS required – the caller must show a TOTP prompt. */
  mfa_required?: boolean;
  mfa_token?: string;
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const body = new URLSearchParams({ username: email, password }).toString();

  const response = await fetchApi(`${BASE_URL}/jwt/login`, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: body,
  });

  const data = await response.json();
  return data as LoginResult;
}

export const mfaLoginVerify = async (mfaToken: string, code: string): Promise<string> => {
  const response = await fetchApi(`${BASE_URL}/mfa/login-verify`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ mfa_token: mfaToken, code }),
  });
  const data = await response.json();
  return data.access_token;
};

export const devBootstrapSuperuserSession = async (): Promise<string> => {
  const response = await fetchApi(`${BASE_URL}/jwt/dev-bootstrap-superuser`, {
    method: "POST",
    headers: JSON_HEADERS,
  });
  const data = await response.json();
  return data.access_token;
};

// ---------------------------------------------------------------------------
// MFA management
// ---------------------------------------------------------------------------

export interface MFASetup {
  secret: string;
  provisioning_uri: string;
}

export const mfaStatus = async (token: string): Promise<boolean> => {
  const response = await fetchApi(`${BASE_URL}/mfa/status`, {
    method: "GET",
    headers: createAuthHeaders(token),
  });
  const data = await response.json();
  return data.mfa_enabled;
};

export const mfaSetup = async (token: string): Promise<MFASetup> => {
  const response = await fetchApi(`${BASE_URL}/mfa/setup`, {
    method: "POST",
    headers: createAuthHeaders(token),
  });
  return response.json();
};

export const mfaVerify = async (token: string, code: string): Promise<boolean> => {
  const response = await fetchApi(`${BASE_URL}/mfa/verify`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  return data.mfa_enabled;
};

export const mfaDisable = async (token: string, code: string): Promise<boolean> => {
  const response = await fetchApi(`${BASE_URL}/mfa/disable`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  return data.mfa_enabled;
};

// ---------------------------------------------------------------------------
// Existing helpers (unchanged)
// ---------------------------------------------------------------------------

export const logout = async (token: string) => {
  if (!token) {
    throw new Error('Authorization token is required');
  }

  await fetchApi(`${BASE_URL}/jwt/logout`, {
    method: "POST",
    headers: createAuthHeaders(token),
  });
}

export const forgotPassword = async (email: string) => {
  await fetchApi(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify({ email }),
  });
}

export const resetPassword = async (token: string, password: string) => {
  await fetchApi(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify({ token, password }),
  });
}

export const requestVerifyToken = async (email: string) => {
  await fetchApi(`${BASE_URL}/request-verify-token`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify({ email }),
  });
}

export const verify = async (token: string) => {
  await fetchApi(`${BASE_URL}/verify`, {
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify({ token }),
  });
}
