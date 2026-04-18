// Path: frontend/src/service/users.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
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

const unwrap = <T,>(
  result: { data?: T; error?: unknown; response: Response },
): T => {
  if (result.error !== undefined) {
    const detail = result.error as { detail?: unknown };
    let message = 'API request failed';
    if (detail?.detail) {
      message = typeof detail.detail === 'string' ? detail.detail : JSON.stringify(detail.detail);
    }
    throw new Error(message);
  }
  return result.data as T;
};

export const getUser = async (token: string): Promise<UserRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/users/me'));
};

export const updateUser = async (token: string, user: UserUpdate): Promise<UserRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/users/me', {
    body: user,
  }));
};

export const getUserProfile = async (token: string): Promise<UserProfile> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/users/me/profile'));
};

// CONTRACT GAP: GET /users (list all users, superuser only) is not in schema.d.ts typed paths.
// Keeping a thin manual fetch until the backend adds it to the OpenAPI spec.
export const getUsers = async (token: string): Promise<UserRead[]> => {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('API request failed');
  return response.json();
};

export const seedUsers = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/api/v1/users/seed'));
};

export const updatePlacement = async (token: string, data: PlacementUpdate): Promise<UserRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/users/me/placement', {
    body: data,
  }));
};

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Upload or replace the current user's avatar image.
 * Accepts JPEG, PNG, WebP, or GIF up to 5 MB.
 */
// TODO: Migrate to shared client once openapi-fetch multipart/form-data support is verified
export const uploadAvatar = async (token: string, file: File): Promise<UserRead> => {
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error(
      `Avatar file exceeds the 5 MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    let message = 'Avatar upload failed';
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

/**
 * Build the full URL for a user's avatar image.
 * Returns undefined when no avatar is set (avatarUri is falsy),
 * so callers can pass the result directly to MUI Avatar's src prop.
 */
export const avatarUrl = (
  userId?: string | null,
  avatarUri?: string | null,
): string | undefined => {
  if (!userId || !avatarUri) return undefined;
  return `${API_URL}/users/${userId}/avatar`;
};

// TODO: Migrate to shared client once openapi-fetch multipart/form-data support is verified
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

  const response = await fetch(`${API_URL}/users/me/profile/extract`, {
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
