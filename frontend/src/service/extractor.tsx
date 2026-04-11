// Path: frontend/src/service/extractor.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { API_URL } from '../config/env';

export type ExtractorResponse = components['schemas']['ExtractorResponse'];
type ExtractorRunBody = components['schemas']['Body_extractor_runner_api_v1_extractors__id__run_post'];
export type ExtractorRun = Omit<ExtractorRunBody, 'file'> & {
  file?: File | null;
};
export type ExtractorRead = components['schemas']['ExtractorRead'];
export type ExtractorCreate = components['schemas']['ExtractorCreate'];
export type ExtractorUpdate = components['schemas']['ExtractorUpdate'];
export type ExtractorExmpleCreate = components['schemas']['ExtractorExampleCreate'];
export type ExtractorExampleRead = components['schemas']['ExtractorExampleRead'];

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

export const getExtractors = async (token: string): Promise<ExtractorRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/extractors/'));
};

export const getExtractor = async (token: string, id: string): Promise<ExtractorRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/extractors/{id}', {
    params: { path: { id } },
  }));
};

export const createExtractor = async (token: string, extractor: ExtractorCreate): Promise<ExtractorRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/extractors/', {
    body: extractor,
  }));
};

export const updateExtractor = async (token: string, id: string, extractor: ExtractorUpdate): Promise<ExtractorRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/extractors/{id}', {
    params: { path: { id } },
    body: extractor,
  }));
};

export const deleteExtractor = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/extractors/{id}', {
    params: { path: { id } },
  }));
};

export const getExtractorExamples = async (token: string, id: string): Promise<ExtractorExampleRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/extractors/{id}/examples', {
    params: { path: { id } },
  }));
};

export const createExtractorExample = async (token: string, id: string, example: ExtractorExmpleCreate): Promise<ExtractorExampleRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/extractors/{id}/examples', {
    params: { path: { id } },
    body: example,
  }));
};

export const deleteExtractorExample = async (token: string, id: string, exampleId: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/extractors/{id}/examples/{example_id}', {
    params: { path: { id, example_id: exampleId } },
  }));
};

// TODO: Migrate to shared client once openapi-fetch multipart/form-data support is verified
export const runExtractor = async (token: string, id: string, runner: ExtractorRun): Promise<ExtractorResponse> => {
  const isFileUpload = !!runner.file;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  let body: BodyInit;
  if (isFileUpload) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(runner)) {
      if (value !== null && value !== undefined) {
        formData.append(key, value instanceof File ? value : String(value));
      }
    }
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(runner);
  }

  const response = await fetch(`${API_URL}/extractors/${id}/run`, {
    method: 'POST',
    headers,
    body,
  });
  if (!response.ok) {
    const bodySnippet = await response.text().catch(() => '');
    throw new Error(`API request failed: POST ${API_URL}/extractors/${id}/run ${response.status} ${response.statusText}${bodySnippet ? ` — ${bodySnippet.slice(0, 200)}` : ''}`);
  }
  return response.json();
};

export type ExtractorVersionRead = components['schemas']['ExtractorVersionRead'];

export const getExtractorVersions = async (token: string, id: string): Promise<ExtractorVersionRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/extractors/{id}/versions', {
    params: { path: { id } },
  }));
};
