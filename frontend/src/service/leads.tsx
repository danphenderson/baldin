import { components } from '../schema';
import { API_URL } from '../config/env';

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

const BASE_URL = `${API_URL}/leads`;

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

const buildRequest = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) {
    throw new Error('Authorization token is required');
  }

  const headers = new Headers({
    Authorization: `Bearer ${token}`,
  });

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
  };
};

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

const parseError = async (response: Response): Promise<LeadServiceError> => {
  let detail: unknown = null;

  try {
    const text = await response.text();
    if (text) {
      try {
        detail = JSON.parse(text);
      } catch {
        detail = text;
      }
    }
  } catch {
    detail = null;
  }

  const fallback = response.status === 400
    ? 'The server rejected that lead request.'
    : response.status === 403
      ? 'You do not have permission to do that on this lead.'
      : response.status === 404
        ? 'That lead or collaboration thread could not be found.'
        : 'Lead request failed.';

  return new LeadServiceError(stringifyDetail(detail, fallback), response.status, detail);
};

const fetchAPI = async <T,>(url: string, options: RequestInit): Promise<T> => {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204 || response.status === 205) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null as T;
  }

  return response.json() as Promise<T>;
};

const buildLeadListQuery = (pagination: Pagination): string => {
  const params = new URLSearchParams();

  if (pagination.page !== undefined) {
    params.set('page', String(pagination.page));
  }

  if (pagination.page_size !== undefined) {
    params.set('page_size', String(pagination.page_size));
  }

  if (pagination.request_count !== undefined) {
    params.set('request_count', String(Boolean(pagination.request_count)));
  }

  return params.toString();
};

export const getLeads = async (token: string, pagination: Pagination): Promise<LeadsPaginatedRead> => {
  const requestOptions = buildRequest(token, 'GET');
  const query = buildLeadListQuery(pagination);
  const suffix = query ? `/?${query}` : '/';
  return fetchAPI<LeadsPaginatedRead>(`${BASE_URL}${suffix}`, requestOptions);
};

export const getLead = async (token: string, id: string): Promise<LeadDetailRead> => {
  const requestOptions = buildRequest(token, 'GET');
  return fetchAPI<LeadDetailRead>(`${BASE_URL}/${id}`, requestOptions);
};

export const createLead = async (token: string, lead: LeadCreate): Promise<LeadRead> => {
  const requestOptions = buildRequest(token, 'POST', lead);
  return fetchAPI<LeadRead>(`${BASE_URL}/`, requestOptions);
};

export const updateLead = async (token: string, id: string, lead: LeadSharedUpdate): Promise<LeadRead> => {
  const requestOptions = buildRequest(token, 'PATCH', lead);
  return fetchAPI<LeadRead>(`${BASE_URL}/${id}`, requestOptions);
};

export const deleteLead = async (token: string, id: string): Promise<void> => {
  const requestOptions = buildRequest(token, 'DELETE');
  await fetchAPI<void>(`${BASE_URL}/${id}`, requestOptions);
};

export const seedLeads = async (token: string): Promise<void> => {
  const requestOptions = buildRequest(token, 'POST');
  await fetchAPI<void>(`${BASE_URL}/seed`, requestOptions);
};

export const extractLead = async (token: string, extractionUrl: string): Promise<LeadExtractResponse> => {
  const requestOptions = buildRequest(token, 'POST');
  const query = new URLSearchParams({ extraction_url: extractionUrl });
  return fetchAPI<LeadExtractResponse>(`${BASE_URL}/extract?${query.toString()}`, requestOptions);
};

export const createLeadRegistration = async (token: string, leadId: string): Promise<LeadRegistrationRead> => {
  const requestOptions = buildRequest(token, 'POST');
  return fetchAPI<LeadRegistrationRead>(`${BASE_URL}/${leadId}/registration`, requestOptions);
};

export const updateLeadRegistration = async (
  token: string,
  leadId: string,
  registration: LeadRegistrationUpdate,
): Promise<LeadRegistrationRead> => {
  const requestOptions = buildRequest(token, 'PATCH', registration);
  return fetchAPI<LeadRegistrationRead>(`${BASE_URL}/${leadId}/registration`, requestOptions);
};

export const deleteLeadRegistration = async (token: string, leadId: string): Promise<void> => {
  const requestOptions = buildRequest(token, 'DELETE');
  await fetchAPI<void>(`${BASE_URL}/${leadId}/registration`, requestOptions);
};

export const getLeadComments = async (token: string, leadId: string): Promise<LeadCommentRead[]> => {
  const requestOptions = buildRequest(token, 'GET');
  return fetchAPI<LeadCommentRead[]>(`${BASE_URL}/${leadId}/comments`, requestOptions);
};

export const createLeadComment = async (
  token: string,
  leadId: string,
  comment: LeadCommentCreate,
): Promise<LeadCommentRead> => {
  const requestOptions = buildRequest(token, 'POST', comment);
  return fetchAPI<LeadCommentRead>(`${BASE_URL}/${leadId}/comments`, requestOptions);
};

export const createLeadCommentReply = async (
  token: string,
  leadId: string,
  commentId: string,
  comment: LeadCommentCreate,
): Promise<LeadCommentRead> => {
  const requestOptions = buildRequest(token, 'POST', comment);
  return fetchAPI<LeadCommentRead>(`${BASE_URL}/${leadId}/comments/${commentId}/replies`, requestOptions);
};
