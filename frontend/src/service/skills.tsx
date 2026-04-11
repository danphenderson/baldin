// Path: frontend/src/service/skills.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { API_URL } from '../config/env';
import { FULL_LIST_PAGE_SIZE, normalizePaginatedResponse } from './pagination';

export type SkillRead = components['schemas']['SkillRead'];
export type SkillCreate = components['schemas']['SkillCreate'];
export type SkillUpdate = components['schemas']['SkillUpdate'];
type SkillExtractBody = components['schemas']['Body_extract_user_skills_api_v1_skills_extract_post'];
type SkillListPage = components['schemas']['PaginatedResponse_SkillRead_'];
export type SkillExtractRequest = Omit<SkillExtractBody, 'file'> & {
  file?: File | null;
};
export type SkillExtractResponse = Record<string, string>;

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

export const getSkills = async (token: string): Promise<SkillRead[]> => {
  const client = createApiClient(token);
  const page = unwrap<SkillListPage>(await client.GET('/api/v1/skills/', {
    params: {
      query: {
        page: 1,
        page_size: FULL_LIST_PAGE_SIZE,
      },
    },
  }));
  return normalizePaginatedResponse(page, { page: 1, page_size: FULL_LIST_PAGE_SIZE }).items;
};

export const getSkill = async (token: string, id: string): Promise<SkillRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/skills/{id}', {
    params: { path: { id } },
  }));
};

export const createSkill = async (token: string, skill: SkillCreate): Promise<SkillRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/skills/', {
    body: skill,
  }));
};

export const updateSkill = async (token: string, id: string, skill: SkillUpdate): Promise<SkillRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/skills/{id}', {
    params: { path: { id } },
    body: skill,
  }));
};

export const deleteSkill = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/skills/{id}', {
    params: { path: { id } },
  }));
};

// TODO: Migrate to shared client once openapi-fetch multipart/form-data support is verified
export const extractSkill = async (token: string, data: SkillExtractRequest): Promise<SkillExtractResponse> => {
  const isFileUpload = !!data.file;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  let body: BodyInit;
  if (isFileUpload) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        formData.append(key, value instanceof File ? value : String(value));
      }
    }
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}/skills/extract`, { method: 'POST', headers, body });
  if (!response.ok) {
    let message = 'API request failed';
    try {
      const err = await response.json();
      if (err?.detail) message = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch { /* keep default */ }
    throw new Error(message);
  }
  return response.json() as Promise<SkillExtractResponse>;
};

export const seedSkills = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/api/v1/skills/seed'));
};
