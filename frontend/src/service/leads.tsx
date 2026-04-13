import { components } from '../schema';
import { createApiClient } from './api-client';
import { normalizePaginatedResponse, type PaginatedResponse } from './pagination';

export type LeadRead = components['schemas']['LeadSummaryRead'];
export type LeadDetailRead = components['schemas']['LeadDetailRead'];
export type LeadCreate = components['schemas']['LeadCreate'];
export type LeadUpdate = components['schemas']['LeadSharedUpdate'];
export type LeadSharedUpdate = components['schemas']['LeadSharedUpdate'];
export type LeadRankInput = components['schemas']['LeadRankInput'];
export type LeadRankResponse = components['schemas']['LeadRankResponse'];
export type LeadRankedEntryRead = components['schemas']['LeadRankedEntryRead'];
export type LeadExtractResponse = components['schemas']['LeadExtractResponse'];
export type LeadExtractDisposition = components['schemas']['LeadExtractDisposition'];
export type LeadRegistrationRead = components['schemas']['LeadRegistrationRead'];
export type LeadRegistrationUpdate = components['schemas']['LeadRegistrationUpdate'];
export type LeadViewerPermissionsRead = components['schemas']['LeadViewerPermissionsRead'];
export type LeadCommentRead = components['schemas']['LeadCommentRead'];
export type LeadCommentCreate = components['schemas']['LeadCommentCreate'];
export type LeadParticipantSummaryRead = components['schemas']['LeadParticipantSummaryRead'];
type RawLeadsPaginatedRead = components['schemas']['PaginatedResponse_LeadSummaryRead_'];
export type LeadsPaginatedRead = PaginatedResponse<LeadRead>;
export const MAX_ASPIRATION_MATCH_LEADS = 20;
export interface Pagination {
  page: number;
  page_size: number;
  request_count?: boolean;
}

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
  const page = unwrap<RawLeadsPaginatedRead>(await client.GET('/api/v1/leads/', {
    params: {
      query: {
        page: pagination.page,
        page_size: pagination.page_size,
        request_count: pagination.request_count,
      },
    },
  }));
  return normalizePaginatedResponse(page, {
    page: pagination.page,
    page_size: pagination.page_size,
  });
};

export const getLead = async (token: string, id: string): Promise<LeadDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/leads/{id}', {
    params: { path: { id } },
  }));
};

export const createLead = async (token: string, lead: LeadCreate): Promise<LeadRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/leads/', {
    body: lead,
  }));
};

export const updateLead = async (token: string, id: string, lead: LeadSharedUpdate): Promise<LeadRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/leads/{id}', {
    params: { path: { id } },
    body: lead,
  }));
};

export const deleteLead = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/leads/{id}', {
    params: { path: { id } },
  }));
};

export const seedLeads = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/api/v1/leads/seed'));
};

export const extractLead = async (token: string, extractionUrl: string): Promise<LeadExtractResponse> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/leads/extract', {
    params: { query: { extraction_url: extractionUrl } },
  }));
};

export const rankLeads = async (
  token: string,
  leads: LeadRankInput[],
  k = 5,
): Promise<LeadRankResponse> => {
  if (leads.length > MAX_ASPIRATION_MATCH_LEADS) {
    throw new Error(
      `Aspiration matching is limited to ${MAX_ASPIRATION_MATCH_LEADS} leads at a time. Narrow your filters and try again.`,
    );
  }
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/documents/rag/rank-leads', {
    body: { leads, k },
  }));
};

export const createLeadRegistration = async (token: string, leadId: string): Promise<LeadRegistrationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/leads/{id}/registration', {
    params: { path: { id: leadId } },
  }));
};

export const updateLeadRegistration = async (
  token: string,
  leadId: string,
  registration: LeadRegistrationUpdate,
): Promise<LeadRegistrationRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/leads/{id}/registration', {
    params: { path: { id: leadId } },
    body: registration,
  }));
};

export const deleteLeadRegistration = async (token: string, leadId: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/leads/{id}/registration', {
    params: { path: { id: leadId } },
  }));
};

export const getLeadComments = async (token: string, leadId: string): Promise<LeadCommentRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/leads/{id}/comments', {
    params: { path: { id: leadId } },
  }));
};

export const createLeadComment = async (
  token: string,
  leadId: string,
  comment: LeadCommentCreate,
): Promise<LeadCommentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/leads/{id}/comments', {
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
  return unwrap(await client.POST('/api/v1/leads/{id}/comments/{comment_id}/replies', {
    params: { path: { id: leadId, comment_id: commentId } },
    body: comment,
  }));
};
