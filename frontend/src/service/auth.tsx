// Path: frontend/src/service/auth.tsx

import { components } from '../schema';

const BASE_URL = `${process.env.REACT_APP_API_URL}/auth`; // Can be moved to a config file

const JSON_HEADERS = {"Content-Type": "application/json"};

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
    headers: JSON_HEADERS,
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

export const logout = async () => {
  await fetchApi(`${BASE_URL}/jwt/logout`, {
    method: "POST",
    headers: JSON_HEADERS,
  });
}

export const forgotPassword = async (email: string) => {
  await fetchApi(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email }),
  });
}

export const resetPassword = async (token: string, password: string) => {
  await fetchApi(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token, password }),
  });
}

export const requestVerifyToken = async (email: string) => {
  await fetchApi(`${BASE_URL}/request-verify-token`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email }),
  });
}

export const verify = async (token: string) => {
  await fetchApi(`${BASE_URL}/verify`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token }),
  });
}
