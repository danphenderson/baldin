// Path: frontend/src/service/experiences.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';

export type ExperienceRead = components['schemas']['ExperienceRead'];
export type ExperienceUpdate = components['schemas']['ExperienceUpdate'];
export type ExperienceCreate = components['schemas']['ExperienceCreate'];

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

export const getExperiences = async (token: string): Promise<ExperienceRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/experiences/'));
};

export const getExperience = async (token: string, id: string): Promise<ExperienceRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/experiences/{experience_id}', {
    params: { query: { id } },
  }));
};

export const createExperience = async (token: string, experience: ExperienceCreate): Promise<ExperienceRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/experiences/', {
    body: experience,
  }));
};

export const updateExperience = async (token: string, id: string, experience: ExperienceUpdate): Promise<ExperienceRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PUT('/experiences/{experience_id}', {
    params: { query: { id } },
    body: experience,
  }));
};

export const deleteExperience = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/experiences/{experience_id}', {
    params: { query: { id } },
  }));
};

export const seedExperiences = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/experiences/seed'));
};
