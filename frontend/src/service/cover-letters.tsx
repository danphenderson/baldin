// Path: frontend/src/service/cover-letters.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { API_URL } from '../config/env';

export type CoverLetterRead = components['schemas']['CoverLetterRead'];
export type CoverLetterUpdate = components['schemas']['CoverLetterUpdate'];
export type CoverLetterCreate = components['schemas']['CoverLetterCreate'];
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

// Base Cover Letter Crud
export const getCoverLetters = async (token: string): Promise<CoverLetterRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/cover_letters/'));
};

export const getCoverLetter = async (token: string, id: string): Promise<CoverLetterRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/cover_letters/{cover_letter_id}', {
    params: { query: { id } },
  }));
};

export const createCoverLetter = async (token: string, coverLetter: CoverLetterCreate): Promise<CoverLetterRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/cover_letters/', {
    body: coverLetter,
  }));
};

export const updateCoverLetter = async (token: string, id: string, coverLetter: CoverLetterUpdate): Promise<CoverLetterRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/cover_letters/{cover_letter_id}', {
    params: { query: { id } },
    body: coverLetter,
  }));
};

export const deleteCoverLetter = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/cover_letters/{cover_letter_id}', {
    params: { query: { id } },
  }));
};

// Cover Letter Templates
export const getCoverLetterTemplates = async (token: string): Promise<CoverLetterRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/cover_letters/', {
    params: { query: { content_type: 'template' } },
  }));
};

// TODO: Ensure cover letter content_type is set to 'template' when creating a new template
export const createCoverLetterTemplate = async (token: string, coverLetter: CoverLetterCreate): Promise<CoverLetterRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/cover_letters/', {
    body: coverLetter,
  }));
};

export const getCoverLetterTemplate = async (token: string, id: string): Promise<CoverLetterRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/cover_letters/{cover_letter_id}', {
    params: { query: { id } },
  }));
};

export const updateCoverLetterTemplate = async (token: string, id: string, coverLetter: CoverLetterUpdate): Promise<CoverLetterRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/cover_letters/{cover_letter_id}', {
    params: { query: { id } },
    body: coverLetter,
  }));
};

export const deleteCoverLetterTemplate = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/cover_letters/{cover_letter_id}', {
    params: { query: { id } },
  }));
};

export const seedCoverLetters = async (token: string): Promise<SeedOperationAccepted> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/cover_letters/seed'));
};

// TODO: Migrate to shared client once binary/blob download support is verified in openapi-fetch
export const downloadCoverLetter = async (token: string, id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/cover_letters/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to download cover letter');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
