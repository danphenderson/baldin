// Path: frontend/src/service/auth.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

const BASE_URL = `${API_URL}/auth`;

const JSON_HEADERS = {"Content-Type": "application/json"};

const createAuthHeaders = (token?: string) => ({
  ...JSON_HEADERS,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const fetchApi = async (url: string, options: RequestInit): Promise<Response> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'API request failed');
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

export const login = async (email: string, password: string): Promise<string> => {
  const body = new URLSearchParams({ username: email, password }).toString();

  const response = await fetchApi(`${BASE_URL}/jwt/login`, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: body,
  });

  const data = await response.json();
  return data.access_token;
}

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
