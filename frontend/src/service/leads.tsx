import { components } from '../schema';
import { createApiClient } from './api-client';

export type LeadRead = components['schemas']['LeadRead'];
export type LeadDetailRead = components['schemas']['LeadDetailRead'];
export type LeadCreate = components['schemas']['LeadCreate'];
export type LeadUpdate = components['schemas']['LeadSharedUpdate'];
export type LeadSharedUpdate = components['schemas']['LeadSharedUpdate'];
export type LeadExtractResponse = components['schemas']['LeadExtractResponse'];
export type LeadExtractDisposition = components['schemas']['LeadExtractDisposition'];
export type LeadRegistrationRead = components['schemas']['LeadRegistrationRead'];
export type LeadRegistrationUpdate = components['schemas']['LeadRegistrationUpdate'];
export type LeadViewerPermissionsRead = components['schemas']['LeadViewerPermissionsRead'];
export type LeadCommentRead = components['schemas']['LeadCommentRead'];
export type LeadCommentCreate = components['schemas']['LeadCommentCreate'];
export type LeadParticipantSummaryRead = components['schemas']['LeadParticipantSummaryRead'];
export type Pagination = components['schemas']['Pagination'];
export type LeadsPaginatedRead = components['schemas']['LeadsPaginatedRead'];

type LeadErrorDetail = unknown;

export class LeadServiceError extends Error {
  status: number;

  detail: LeadErrorDetail;

  constructor(message: string, status: number, detail: LeadErrorDetail) {
    super(message);
    this.name = 'LeadServiceError';
    this.status = status;
    this.detail = detail;
  }
}

export const isLeadServiceError = (error: unknown): error is LeadServiceError => (
  error instanceof LeadServiceError
);

const stringifyDetail = (detail: unknown, fallback: string): string => {
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => stringifyDetail(item, fallback))
      .filter(Boolean)
      .join(' ');
  }

  if (detail && typeof detail === 'object') {
    const maybeMessage = (detail as { message?: unknown; detail?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }

    const nestedDetail = (detail as { detail?: unknown }).detail;
    if (nestedDetail !== undefined) {
      return stringifyDetail(nestedDetail, fallback);
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const toLeadServiceError = (status: number, detail: unknown): LeadServiceError => {
  const fallback = status === 400
    ? 'The server rejected that lead request.'
    : status === 403
      ? 'You do not have permission to do that on this lead.'
      : status === 404
        ? 'That lead or collaboration thread could not be found.'
        : 'Lead request failed.';

  return new LeadServiceError(stringifyDetail(detail, fallback), status, detail);
};

const unwrap = <T,>(
  result: { data?: T; error?: unknown; response: Response },
): T => {
  if (result.error !== undefined) {
    throw toLeadServiceError(result.response.status, result.error);
  }
  return result.data as T;
};

export const getLeads = async (token: string, pagination: Pagination): Promise<LeadsPaginatedRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/leads/', {
    params: {
      query: {
        page: pagination.page,
        page_size: pagination.page_size,
        request_count: pagination.request_count,
      },
    },
  }));
};

export const getLead = async (token: string, id: string): Promise<LeadDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/leads/{id}', {
    params: { path: { id } },
  }));
};

export const createLead = async (token: string, lead: LeadCreate): Promise<LeadRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/leads/', {
    body: lead,
  }));
};

export const updateLead = async (token: string, id: string, lead: LeadSharedUpdate): Promise<LeadRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/leads/{id}', {
    params: { path: { id } },
    body: lead,
  }));
};

export const deleteLead = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/leads/{id}', {
    params: { path: { id } },
  }));
};

export const seedLeads = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/leads/seed'));
};

export const extractLead = async (token: string, extractionUrl: string): Promise<LeadExtractResponse> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/leads/extract', {
    params: { query: { extraction_url: extractionUrl } },
  }));
};

export const createLeadRegistration = async (token: string, leadId: string): Promise<LeadRegistrationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/leads/{id}/registration', {
    params: { path: { id: leadId } },
  }));
};

export const updateLeadRegistration = async (
  token: string,
  leadId: string,
  registration: LeadRegistrationUpdate,
): Promise<LeadRegistrationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/leads/{id}/registration', {
    params: { path: { id: leadId } },
    body: registration,
  }));
};

export const deleteLeadRegistration = async (token: string, leadId: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/leads/{id}/registration', {
    params: { path: { id: leadId } },
  }));
};

export const getLeadComments = async (token: string, leadId: string): Promise<LeadCommentRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/leads/{id}/comments', {
    params: { path: { id: leadId } },
  }));
};

export const createLeadComment = async (
  token: string,
  leadId: string,
  comment: LeadCommentCreate,
): Promise<LeadCommentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/leads/{id}/comments', {
    params: { path: { id: leadId } },
    body: comment,
  }));
};

export const createLeadCommentReply = async (
  token: string,
  leadId: string,
  commentId: string,
  comment: LeadCommentCreate,
): Promise<LeadCommentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/leads/{id}/comments/{comment_id}/replies', {
    params: { path: { id: leadId, comment_id: commentId } },
    body: comment,
  }));
};
