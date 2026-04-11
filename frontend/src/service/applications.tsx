// Path: frontend/src/service/applications.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { FULL_LIST_PAGE_SIZE, normalizePaginatedResponse } from './pagination';

export type ApplicationRead = components['schemas']['ApplicationRead'];
export type ApplicationCreate = components['schemas']['ApplicationCreate'];
export type ApplicationUpdate = components['schemas']['ApplicationUpdate'];
export type ApplicationCreationIntent = 'registered' | 'applied';
type ApplicationDocumentAttach = components['schemas']['ApplicationDocumentAttach'];
type DocumentRead = components['schemas']['DocumentRead'];
type ApplicationListPage = components['schemas']['PaginatedResponse_ApplicationRead_'];

const unwrap = <T,>(
  result: { data?: T; error?: unknown; response: Response },
): T => {
  if (result.error !== undefined) {
    const detail = result.error as { detail?: unknown };
    let message = `API request failed: ${result.response.status}`;
    if (detail?.detail) {
      message = typeof detail.detail === 'string' ? detail.detail : JSON.stringify(detail.detail);
    }
    throw new Error(message);
  }
  return result.data as T;
};

export const getApplications = async (token: string): Promise<ApplicationRead[]> => {
  const client = createApiClient(token);
  const page = unwrap<ApplicationListPage>(await client.GET('/api/v1/applications/', {
    params: {
      query: {
        page: 1,
        page_size: FULL_LIST_PAGE_SIZE,
      },
    },
  }));
  return normalizePaginatedResponse(page, { page: 1, page_size: FULL_LIST_PAGE_SIZE }).items;
};

export const findExistingApplicationForLead = async (token: string, leadId: string): Promise<ApplicationRead | null> => {
  const applications = await getApplications(token);
  return applications.find((application) => application.lead_id === leadId) ?? null;
};

export const getApplicationStateLabel = (
  application: Pick<ApplicationRead, 'outcome' | 'stage'>,
): string => (application.outcome ?? application.stage ?? 'tracked').replace(/_/g, ' ');

export const getApplication = async (token: string, id: string): Promise<ApplicationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/applications/{id}', {
    params: { path: { id } },
  }));
};

export const createApplication = async (token: string, application: ApplicationCreate): Promise<ApplicationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/applications/', {
    body: application,
  }));
};

export const updateApplication = async (token: string, id: string, application: ApplicationUpdate): Promise<ApplicationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/applications/{id}', {
    params: { path: { id } },
    body: application,
  }));
};

export const deleteApplication = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/applications/{id}', {
    params: { path: { id } },
  }));
};

/* ------------------------------------------------------------------ */
/*  Unified document endpoints                                         */
/* ------------------------------------------------------------------ */

export const getApplicationDocuments = async (token: string, id: string): Promise<DocumentRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/applications/{id}/documents', {
    params: { path: { id } },
  }));
};

export const addApplicationDocument = async (token: string, id: string, documentId: string, versionId?: string): Promise<DocumentRead> => {
  const payload: ApplicationDocumentAttach = { document_id: documentId, version_id: versionId ?? null };
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/applications/{id}/documents', {
    params: { path: { id } },
    body: payload,
  }));
};

export const detachApplicationDocument = async (token: string, id: string, documentId: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/applications/{id}/documents/{document_id}', {
    params: { path: { id, document_id: documentId } },
  }));
};
