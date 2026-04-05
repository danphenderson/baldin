// Path: frontend/src/service/documents.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

/* ------------------------------------------------------------------ */
/*  Types (derived from generated schema)                              */
/* ------------------------------------------------------------------ */

export type DocumentRead = components['schemas']['DocumentRead'];
export type DocumentDetailRead = components['schemas']['DocumentDetailRead'];
export type DocumentCreate = components['schemas']['DocumentCreate'];
export type DocumentUpdate = components['schemas']['DocumentUpdate'];
export type DocumentVersionRead = components['schemas']['DocumentVersionRead'];
export type DocumentVersionCreate = components['schemas']['DocumentVersionCreate'];
export type DocumentPinRequest = components['schemas']['DocumentPinRequest'];
export type DocumentGenerateRequest = components['schemas']['DocumentGenerateRequest'];
export type DocumentKind = components['schemas']['DocumentKind'];
export type DocumentStatus = components['schemas']['DocumentStatus'];

const BASE_URL = `${API_URL}/documents`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const createRequestOptions = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) throw new Error('Authorization token is required');
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  };
};

const fetchAPI = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = 'API request failed';
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch { /* keep default */ }
    throw new Error(message);
  }
  if (response.status === 204 || response.status === 205) return null;
  return response.json();
};

/* ------------------------------------------------------------------ */
/*  Document CRUD                                                      */
/* ------------------------------------------------------------------ */

export const getDocuments = async (
  token: string,
  filters?: { kind?: string; status?: string; is_pinned?: boolean; search?: string },
): Promise<DocumentRead[]> => {
  const params = new URLSearchParams();
  if (filters?.kind) params.set('kind', filters.kind);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.is_pinned !== undefined) params.set('is_pinned', String(filters.is_pinned));
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return fetchAPI(`${BASE_URL}/${qs ? `?${qs}` : ''}`, createRequestOptions(token, 'GET'));
};

export const getDocument = async (token: string, id: string): Promise<DocumentDetailRead> => {
  return fetchAPI(`${BASE_URL}/${id}`, createRequestOptions(token, 'GET'));
};

export const createDocument = async (token: string, payload: DocumentCreate): Promise<DocumentDetailRead> => {
  return fetchAPI(`${BASE_URL}/`, createRequestOptions(token, 'POST', payload));
};

export const updateDocument = async (token: string, id: string, payload: DocumentUpdate): Promise<DocumentRead> => {
  return fetchAPI(`${BASE_URL}/${id}`, createRequestOptions(token, 'PATCH', payload));
};

export const deleteDocument = async (token: string, id: string): Promise<void> => {
  await fetchAPI(`${BASE_URL}/${id}`, createRequestOptions(token, 'DELETE'));
};

/* ------------------------------------------------------------------ */
/*  Versions                                                           */
/* ------------------------------------------------------------------ */

export const getVersions = async (token: string, docId: string): Promise<DocumentVersionRead[]> => {
  return fetchAPI(`${BASE_URL}/${docId}/versions`, createRequestOptions(token, 'GET'));
};

export const createVersion = async (
  token: string,
  docId: string,
  payload: DocumentVersionCreate,
): Promise<DocumentVersionRead> => {
  return fetchAPI(`${BASE_URL}/${docId}/versions`, createRequestOptions(token, 'POST', payload));
};

export const getVersion = async (
  token: string,
  docId: string,
  versionId: string,
): Promise<DocumentVersionRead> => {
  return fetchAPI(`${BASE_URL}/${docId}/versions/${versionId}`, createRequestOptions(token, 'GET'));
};

/* ------------------------------------------------------------------ */
/*  Pinning                                                            */
/* ------------------------------------------------------------------ */

export const pinDocument = async (token: string, id: string, pinned = true): Promise<DocumentRead> => {
  return fetchAPI(`${BASE_URL}/${id}/pin`, createRequestOptions(token, 'POST', { pinned }));
};

export const getPinnedDocuments = async (token: string): Promise<DocumentRead[]> => {
  return fetchAPI(`${BASE_URL}/pinned`, createRequestOptions(token, 'GET'));
};

/* ------------------------------------------------------------------ */
/*  Generation                                                         */
/* ------------------------------------------------------------------ */

export const generateDocument = async (
  token: string,
  payload: DocumentGenerateRequest,
): Promise<DocumentDetailRead> => {
  return fetchAPI(`${BASE_URL}/generate`, createRequestOptions(token, 'POST', payload));
};

/* ------------------------------------------------------------------ */
/*  Download                                                           */
/* ------------------------------------------------------------------ */

export const downloadDocument = async (token: string, id: string): Promise<void> => {
  const options = createRequestOptions(token, 'GET');
  const response = await fetch(`${BASE_URL}/${id}/download`, options);
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `document-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
