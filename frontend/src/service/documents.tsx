// Path: frontend/src/service/documents.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { API_URL } from '../config/env';
import { FULL_LIST_PAGE_SIZE, normalizePaginatedResponse } from './pagination';

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
type DocumentListPage = components['schemas']['PaginatedResponse_DocumentRead_'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Document CRUD                                                      */
/* ------------------------------------------------------------------ */

export const getDocuments = async (
  token: string,
  filters?: { kind?: DocumentKind; status?: DocumentStatus; is_pinned?: boolean; search?: string },
): Promise<DocumentRead[]> => {
  const client = createApiClient(token);
  const page = unwrap<DocumentListPage>(await client.GET('/api/v1/documents/', {
    params: {
      query: {
        kind: filters?.kind,
        status: filters?.status,
        is_pinned: filters?.is_pinned,
        search: filters?.search,
        page: 1,
        page_size: FULL_LIST_PAGE_SIZE,
      },
    },
  }));
  return normalizePaginatedResponse(page, { page: 1, page_size: FULL_LIST_PAGE_SIZE }).items;
};

export const getDocument = async (token: string, id: string): Promise<DocumentDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/{document_id}', {
    params: { path: { document_id: id } },
  }));
};

export const createDocument = async (token: string, payload: DocumentCreate): Promise<DocumentDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/documents/', {
    body: payload,
  }));
};

export const updateDocument = async (token: string, id: string, payload: DocumentUpdate): Promise<DocumentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/documents/{document_id}', {
    params: { path: { document_id: id } },
    body: payload,
  }));
};

export const deleteDocument = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/documents/{document_id}', {
    params: { path: { document_id: id } },
  }));
};

/* ------------------------------------------------------------------ */
/*  Versions                                                           */
/* ------------------------------------------------------------------ */

export const getVersions = async (token: string, docId: string): Promise<DocumentVersionRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/{document_id}/versions', {
    params: { path: { document_id: docId } },
  }));
};

export const createVersion = async (
  token: string,
  docId: string,
  payload: DocumentVersionCreate,
): Promise<DocumentVersionRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/documents/{document_id}/versions', {
    params: { path: { document_id: docId } },
    body: payload,
  }));
};

export const getVersion = async (
  token: string,
  docId: string,
  versionId: string,
): Promise<DocumentVersionRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/{document_id}/versions/{version_id}', {
    params: { path: { document_id: docId, version_id: versionId } },
  }));
};

/* ------------------------------------------------------------------ */
/*  Pinning                                                            */
/* ------------------------------------------------------------------ */

export const pinDocument = async (token: string, id: string, pinned = true): Promise<DocumentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/documents/{document_id}/pin', {
    params: { path: { document_id: id } },
    body: { pinned },
  }));
};

export const getPinnedDocuments = async (token: string): Promise<DocumentRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/pinned'));
};

/* ------------------------------------------------------------------ */
/*  Generation                                                         */
/* ------------------------------------------------------------------ */

export const generateDocument = async (
  token: string,
  payload: DocumentGenerateRequest,
): Promise<DocumentDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/documents/generate', {
    body: payload,
  }));
};

/* ------------------------------------------------------------------ */
/*  Shared with me                                                     */
/* ------------------------------------------------------------------ */

export const getSharedWithMe = async (token: string): Promise<DocumentRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/shared-with-me'));
};

/* ------------------------------------------------------------------ */
/*  Download (binary — kept as thin manual wrapper)                    */
/* ------------------------------------------------------------------ */

// TODO: Migrate to shared client once binary/blob download support is verified in openapi-fetch
export const downloadDocument = async (token: string, id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/documents/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
/*  Upload (multipart — kept as thin manual wrapper)                   */
/* ------------------------------------------------------------------ */

// TODO: Migrate to shared client once openapi-fetch multipart/form-data support is verified
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
/*  Original PDF download (binary — kept as thin manual wrapper)       */
/* ------------------------------------------------------------------ */

// TODO: Migrate to shared client once binary/blob download support is verified in openapi-fetch
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
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/{document_id}/shares', {
    params: { path: { document_id: documentId } },
  }));
}

export async function getDocumentShareCandidates(
  token: string,
  documentId: string,
  params?: { q?: string; limit?: number },
): Promise<DocumentShareCandidateRead[]> {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/{document_id}/share-candidates', {
    params: {
      path: { document_id: documentId },
      query: { q: params?.q, limit: params?.limit },
    },
  }));
}

export async function createDocumentShare(
  token: string,
  documentId: string,
  sharedWithUserId: string,
  role: DocumentShareRole = 'viewer',
): Promise<DocumentShareRead> {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/documents/{document_id}/shares', {
    params: { path: { document_id: documentId } },
    body: { shared_with_user_id: sharedWithUserId, role },
  }));
}

export async function updateDocumentShare(
  token: string,
  documentId: string,
  shareId: string,
  role: DocumentShareRole,
): Promise<DocumentShareRead> {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/documents/{document_id}/shares/{share_id}', {
    params: { path: { document_id: documentId, share_id: shareId } },
    body: { role },
  }));
}

export async function revokeDocumentShare(token: string, documentId: string, shareId: string): Promise<void> {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/documents/{document_id}/shares/{share_id}', {
    params: { path: { document_id: documentId, share_id: shareId } },
  }));
}

/* ------------------------------------------------------------------ */
/*  Activity                                                           */
/* ------------------------------------------------------------------ */

export async function getDocumentActivity(
  token: string,
  documentId: string,
  params?: { limit?: number },
): Promise<DocumentActivityRead[]> {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/documents/{document_id}/activity', {
    params: {
      path: { document_id: documentId },
      query: { limit: params?.limit },
    },
  }));
}

/* ------------------------------------------------------------------ */
/*  Collaboration                                                      */
/* ------------------------------------------------------------------ */

export async function requestDocumentCollaborationBootstrap(
  token: string,
  documentId: string,
): Promise<DocumentCollaborationBootstrapRead> {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/documents/{document_id}/collaborate/bootstrap', {
    params: { path: { document_id: documentId } },
  }));
}
