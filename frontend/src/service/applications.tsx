// Path: frontend/src/service/applications.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';

export type ApplicationRead = components['schemas']['ApplicationRead'];
export type ApplicationCreate = components['schemas']['ApplicationCreate'];
export type ApplicationUpdate = components['schemas']['ApplicationUpdate'];
type ApplicationResumeAttach = components['schemas']['ApplicationResumeAttach'];
type ApplicationCoverLetterAttach = components['schemas']['ApplicationCoverLetterAttach'];
type ApplicationDocumentAttach = components['schemas']['ApplicationDocumentAttach'];

// do not export these types, as they should be asscessed from the resume and cover-letter services
type ResumeRead = components['schemas']['ResumeRead'];
type CoverLetterRead = components['schemas']['CoverLetterRead'];
type DocumentRead = components['schemas']['DocumentRead'];

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
  return unwrap(await client.GET('/applications/'));
};

export const getApplication = async (token: string, id: string): Promise<ApplicationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/applications/{id}', {
    params: { path: { id } },
  }));
};

export const getApplicationResumes = async (token: string, id: string): Promise<ResumeRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/applications/{id}/resumes', {
    params: { path: { id } },
  }));
};

export const getApplicationCoverLetters = async (token: string, id: string): Promise<CoverLetterRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/applications/{id}/cover_letters', {
    params: { path: { id } },
  }));
};

export const createApplicationResume = async (token: string, id: string, resumeId: string): Promise<ResumeRead> => {
  const payload: ApplicationResumeAttach = { resume_id: resumeId };
  const client = createApiClient(token);
  return unwrap(await client.POST('/applications/{id}/resumes', {
    params: { path: { id } },
    body: payload,
  }));
};

export const createApplicationCoverLetter = async (token: string, id: string, coverLetterId: string): Promise<CoverLetterRead> => {
  const payload: ApplicationCoverLetterAttach = { cover_letter_id: coverLetterId };
  const client = createApiClient(token);
  return unwrap(await client.POST('/applications/{id}/cover_letters', {
    params: { path: { id } },
    body: payload,
  }));
};

export const createApplication = async (token: string, application: ApplicationCreate): Promise<ApplicationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/applications/', {
    body: application,
  }));
};

export const updateApplication = async (token: string, id: string, application: ApplicationUpdate): Promise<ApplicationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/applications/{id}', {
    params: { path: { id } },
    body: application,
  }));
};

export const deleteApplication = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/applications/{id}', {
    params: { path: { id } },
  }));
};

export const generatecoverLetter = async (token: string, id: string, template_id: string): Promise<CoverLetterRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/applications/{id}/cover_letters/generate', {
    params: { path: { id }, query: { template_id } },
  }));
};

/* ------------------------------------------------------------------ */
/*  Unified document endpoints                                         */
/* ------------------------------------------------------------------ */

export const getApplicationDocuments = async (token: string, id: string): Promise<DocumentRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/applications/{id}/documents', {
    params: { path: { id } },
  }));
};

export const addApplicationDocument = async (token: string, id: string, documentId: string, versionId?: string): Promise<DocumentRead> => {
  const payload: ApplicationDocumentAttach = { document_id: documentId, version_id: versionId ?? null };
  const client = createApiClient(token);
  return unwrap(await client.POST('/applications/{id}/documents', {
    params: { path: { id } },
    body: payload,
  }));
};

export const detachApplicationDocument = async (token: string, id: string, documentId: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/applications/{id}/documents/{document_id}', {
    params: { path: { id, document_id: documentId } },
  }));
};
