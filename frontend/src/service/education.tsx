// Path: frontend/src/service/education.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';

export type EducationRead = components['schemas']['EducationRead'];
export type EducationCreate = components['schemas']['EducationCreate'];
export type EducationUpdate = components['schemas']['EducationUpdate'];

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

export const getEducations = async (token: string): Promise<EducationRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/education/'));
};

export const getEducation = async (token: string, id: string): Promise<EducationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/education/{id}', {
    params: { path: { id } },
  }));
};

export const createEducation = async (token: string, education: EducationCreate): Promise<EducationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/education/', {
    body: education,
  }));
};

export const updateEducation = async (token: string, id: string, education: EducationUpdate): Promise<EducationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/education/{id}', {
    params: { path: { id } },
    body: education,
  }));
};

export const deleteEducation = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/education/{id}', {
    params: { path: { id } },
  }));
};

export const seedEducations = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/api/v1/education/seed'));
};
