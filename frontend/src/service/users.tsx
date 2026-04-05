// Path: frontend/src/service/users.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

export type UserRead = components['schemas']['UserRead'];
export type UserUpdate = components['schemas']['UserUpdate'];
export type UserProfile = components['schemas']['UserProfileRead'];
export type ProfileExtractResponse = components['schemas']['ProfileExtractResponse'];
export type PlacementUpdate = components['schemas']['PlacementUpdate'];

export interface ProfileExtractSource {
  url?: string | null;
  file?: File | null;
  text?: string | null;
}

export interface ProfileExtractRequest {
  file?: File | null;
  url?: string | null;
  text?: string | null;
  mode?: 'entire_document' | 'retrieval';
  llm?: string | null;
  sources?: ProfileExtractSource[];
}

const BASE_URL = `${API_URL}/users/me`;

const createRequestOptions = (token: string, method: string, body?: any): RequestInit => {
  if (!token) {
    throw new Error("Authorization token is required");
  }

  return {
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  };
};

const fetchApi = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    // Custom error handling can be implemented here
    throw new Error('API request failed');
  }
  return response.json();
};

export const getUser = async (token: string): Promise<UserRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(BASE_URL, requestOptions);
};

export const updateUser = async (token: string, user: UserUpdate): Promise<UserRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", user);
  return await fetchApi(BASE_URL, requestOptions);
};

export const getUserProfile = async (token: string): Promise<UserProfile> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(`${BASE_URL}/profile`, requestOptions);
}

// super-user only
export const getUsers = async (token: string): Promise<UserRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(`${API_URL}/users`, requestOptions);
};

export const seedUsers = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return await fetchApi(`${API_URL}/users/seed`, requestOptions);
}

export const updatePlacement = async (token: string, data: PlacementUpdate): Promise<UserRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", data);
  return await fetchApi(`${BASE_URL}/placement`, requestOptions);
};

export const extractProfile = async (
  token: string,
  data: ProfileExtractRequest,
): Promise<ProfileExtractResponse> => {
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const formData = new FormData();

  // Multi-source mode
  if (data.sources && data.sources.length > 0) {
    const sourcesMeta: Array<{ url?: string; text?: string; file_index?: number }> = [];
    let fileIdx = 0;
    data.sources.forEach((source) => {
      const entry: { url?: string; text?: string; file_index?: number } = {};
      if (source.file) {
        entry.file_index = fileIdx;
        formData.append('source_files', source.file);
        fileIdx++;
      }
      if (source.url) entry.url = source.url;
      if (source.text) entry.text = source.text;
      sourcesMeta.push(entry);
    });
    formData.append('sources_json', JSON.stringify(sourcesMeta));
  } else {
    // Single-source backward compat
    if (data.file) {
      formData.append('file', data.file);
    }
    if (data.url) {
      formData.append('url', data.url);
    }
    if (data.text) {
      formData.append('text', data.text);
    }
  }

  formData.append('mode', data.mode ?? 'entire_document');
  if (data.llm) {
    formData.append('llm', data.llm);
  }

  const response = await fetch(`${BASE_URL}/profile/extract`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) {
    let message = 'Profile extraction failed';
    try {
      const err = await response.json();
      if (err?.detail) {
        message = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      }
    } catch { /* keep default message */ }
    throw new Error(message);
  }
  return response.json();
};
