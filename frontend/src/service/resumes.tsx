// Path: frontend/src/service/resumes.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { API_URL } from '../config/env';

export type ResumeRead = components['schemas']['ResumeRead'];
export type ResumeUpdate = components['schemas']['ResumeUpdate'];
export type ResumeCreate = components['schemas']['ResumeCreate'];
type SeedOperationAccepted = components['schemas']['SeedOperationAccepted'];

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

// Base Resume Crud
export const getResumes = async (token: string): Promise<ResumeRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/resumes/'));
};

export const getResume = async (token: string, id: string): Promise<ResumeRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/resumes/{resume_id}', {
    params: { query: { id } },
  }));
};

export const createResume = async (token: string, resume: ResumeCreate): Promise<ResumeRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/resumes/', {
    body: resume,
  }));
};

export const updateResume = async (token: string, id: string, resume: ResumeUpdate): Promise<ResumeRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/resumes/{resume_id}', {
    params: { query: { id } },
    body: resume,
  }));
};

export const deleteResume = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/resumes/{resume_id}', {
    params: { query: { id } },
  }));
};

// Resume Templates
export const getResumeTemplates = async (token: string): Promise<ResumeRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/resumes/', {
    params: { query: { content_type: 'template' } },
  }));
};

// TODO: Ensure resume content_type is set to 'template' when creating/updating
export const createResumeTemplate = async (token: string, resume: ResumeCreate): Promise<ResumeRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/resumes/', {
    body: resume,
  }));
};

export const updateResumeTemplate = async (token: string, id: string, resume: ResumeUpdate): Promise<ResumeRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/resumes/{resume_id}', {
    params: { query: { id } },
    body: resume,
  }));
};

export const getResumeTemplate = async (token: string, id: string): Promise<ResumeRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/resumes/{resume_id}', {
    params: { query: { id } },
  }));
};

export const seedResumes = async (token: string): Promise<SeedOperationAccepted> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/resumes/seed'));
};

// TODO: Migrate to shared client once binary/blob download support is verified in openapi-fetch
export const downloadResume = async (token: string, id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/resumes/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to download resume');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resume-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
