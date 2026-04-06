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
export type DocumentContentFormat = components['schemas']['ContentFormat'];
export type DocumentShareRole = components['schemas']['DocumentShareRole'];
export type DocumentShareRead = components['schemas']['DocumentShareRead'];
export type DocumentShareCandidateRead = components['schemas']['DocumentShareCandidateRead'];
export type DocumentActivityRead = components['schemas']['DocumentActivityRead'];
export type DocumentActivityType = components['schemas']['DocumentActivityType'];
export type DocumentCollaborationBootstrapRead = components['schemas']['DocumentCollaborationBootstrapRead'];

const BASE_URL = `${API_URL}/documents`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const createRequestOptions = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) throw new Error('Authorization token is required');
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
};

const withQuery = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): string => {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const suffix = params.toString();
  return `${path}${suffix ? `?${suffix}` : ''}`;
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
  return fetchAPI(
    withQuery(`${BASE_URL}/`, {
      kind: filters?.kind,
      status: filters?.status,
      is_pinned: filters?.is_pinned,
      search: filters?.search,
    }),
    createRequestOptions(token, 'GET'),
  );
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

/* ------------------------------------------------------------------ */
/*  Upload                                                             */
/* ------------------------------------------------------------------ */

export async function uploadDocument(
  token: string,
  file: File,
  title: string,
  kind: string,
): Promise<DocumentDetailRead> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('kind', kind);

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }
  return response.json();
}

/* ------------------------------------------------------------------ */
/*  Original PDF download                                              */
/* ------------------------------------------------------------------ */

export async function downloadOriginal(token: string, documentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/documents/${documentId}/original`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'original.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Shares                                                             */
/* ------------------------------------------------------------------ */

export async function getDocumentShares(token: string, documentId: string): Promise<DocumentShareRead[]> {
  return fetchAPI(`${BASE_URL}/${documentId}/shares`, createRequestOptions(token, 'GET'));
}

export async function getDocumentShareCandidates(
  token: string,
  documentId: string,
  params?: { q?: string; limit?: number },
): Promise<DocumentShareCandidateRead[]> {
  return fetchAPI(
    withQuery(`${BASE_URL}/${documentId}/share-candidates`, {
      q: params?.q,
      limit: params?.limit,
    }),
    createRequestOptions(token, 'GET'),
  );
}

export async function createDocumentShare(
  token: string,
  documentId: string,
  sharedWithUserId: string,
  role: DocumentShareRole = 'viewer',
): Promise<DocumentShareRead> {
  return fetchAPI(
    `${BASE_URL}/${documentId}/shares`,
    createRequestOptions(token, 'POST', { shared_with_user_id: sharedWithUserId, role }),
  );
}

export async function updateDocumentShare(
  token: string,
  documentId: string,
  shareId: string,
  role: DocumentShareRole,
): Promise<DocumentShareRead> {
  return fetchAPI(
    `${BASE_URL}/${documentId}/shares/${shareId}`,
    createRequestOptions(token, 'PATCH', { role }),
  );
}

export async function revokeDocumentShare(token: string, documentId: string, shareId: string): Promise<void> {
  await fetchAPI(
    `${BASE_URL}/${documentId}/shares/${shareId}`,
    createRequestOptions(token, 'DELETE'),
  );
}

export async function getSharedWithMe(token: string): Promise<DocumentRead[]> {
  return fetchAPI(`${BASE_URL}/shared-with-me`, createRequestOptions(token, 'GET'));
}

/* ------------------------------------------------------------------ */
/*  Collaboration bootstrap                                            */
/* ------------------------------------------------------------------ */

export async function requestDocumentCollaborationBootstrap(
  token: string,
  documentId: string,
): Promise<DocumentCollaborationBootstrapRead> {
  return fetchAPI(
    withQuery(`${BASE_URL}/${documentId}/collaborate/bootstrap`, { token }),
    createRequestOptions(token, 'POST'),
  );
}

/* ------------------------------------------------------------------ */
/*  Activity                                                           */
/* ------------------------------------------------------------------ */

export async function getDocumentActivity(
  token: string,
  documentId: string,
  params?: { limit?: number },
): Promise<DocumentActivityRead[]> {
  return fetchAPI(
    withQuery(`${BASE_URL}/${documentId}/activity`, { limit: params?.limit }),
    createRequestOptions(token, 'GET'),
  );
}
