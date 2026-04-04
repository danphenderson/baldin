// Path: frontend/src/service/data-orchestration.tsx

import { components } from "../schema";
import { API_URL } from '../config/env';

// ---------------------------------------------------------------------------
// Types re-exported from the generated OpenAPI schema
// ---------------------------------------------------------------------------

export type OrchestrationEventRead = components['schemas']['OrchestrationEventRead-Output'];
export type OrchestrationEventCreate = components['schemas']['OrchestrationEventCreate'];
export type OrchestrationEventUpdate = components['schemas']['OrchestrationEventUpdate'];
export type OrchestrationEventStatus = components['schemas']['OrchestrationEventStatusType'];

type RawOrchestrationPipelineRead = components['schemas']['OrchestrationPipelineRead'];
export type OrchestrationPipelineRead = Omit<RawOrchestrationPipelineRead, 'orchestration_events'> & {
  events: OrchestrationEventRead[];
  run_count: number;
  failure_count: number;
  last_run_status: string | null;
  last_run_at: string | null;
};
export type OrchestrationPipelineCreate = components['schemas']['OrchestrationPipelineCreate'];
export type OrchestrationPipelineUpdate = components['schemas']['OrchestrationPipelineUpdate'];

export type OrchestrationEventPaginatedRead = {
  items: OrchestrationEventRead[];
  total: number;
  page: number;
  page_size: number;
};

/** Filters accepted by the paginated events endpoint. */
export interface EventQueryParams {
  status?: OrchestrationEventStatus | null;
  pipeline_id?: string | null;
  page?: number;
  page_size?: number;
}

// ---------------------------------------------------------------------------
// Display helpers (WF-08)
// ---------------------------------------------------------------------------

export interface URIDisplay {
  name: string;
  type: string;
}

/** Parse a raw URI value (string, object, or null) into a display-friendly shape. */
export const parseURI = (raw: unknown): URIDisplay | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return parseURI(JSON.parse(raw)); } catch { return null; }
  }
  if (typeof raw === 'object' && raw !== null && 'name' in raw && 'type' in raw) {
    return { name: String((raw as Record<string, unknown>).name), type: String((raw as Record<string, unknown>).type) };
  }
  return null;
};

/** Summarize a URI for card / list display (e.g. "api: My Endpoint"). */
export const formatURI = (raw: unknown): string | null => {
  const parsed = parseURI(raw);
  return parsed ? `${parsed.type}: ${parsed.name}` : null;
};

/** Turn a raw payload (object | string | null) into a displayable record. */
export const normalizePayload = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const BASE_URL = `${API_URL}/data_orchestration`;

const createRequestOptions = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) {
    throw new Error("Authorization token is required");
  }

  return {
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  };
};

const fetchAPI = async <T,>(url: string, options: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = 'API request failed';
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Keep the default message when the error response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204 || response.status === 205) {
    return null as T;
  }
  return response.json() as Promise<T>;
};

const normalizePipeline = (
  pipeline: RawOrchestrationPipelineRead,
): OrchestrationPipelineRead => {
  const { orchestration_events, ...rest } = pipeline;
  return {
    ...rest,
    events: orchestration_events ?? [],
    run_count: rest.run_count ?? 0,
    failure_count: rest.failure_count ?? 0,
    last_run_status: rest.last_run_status ?? null,
    last_run_at: rest.last_run_at ?? null,
  };
};

// ---------------------------------------------------------------------------
// Event API
// ---------------------------------------------------------------------------

export const createOrchestrationEvent = async (token: string, body: OrchestrationEventCreate): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "POST", body);
  return fetchAPI<OrchestrationEventRead>(`${BASE_URL}/events`, requestOptions);
};

export const getOrchestrationEvent = async (token: string, id: string): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI<OrchestrationEventRead>(`${BASE_URL}/events/${id}`, requestOptions);
};

export const getOrchestrationEvents = async (
  token: string,
  params?: EventQueryParams,
): Promise<OrchestrationEventPaginatedRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.pipeline_id) qs.set('pipeline_id', params.pipeline_id);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.page_size) qs.set('page_size', String(params.page_size));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return fetchAPI<OrchestrationEventPaginatedRead>(`${BASE_URL}/events${suffix}`, requestOptions);
};

export const updateOrchestrationEvent = async (token: string, id: string, body: OrchestrationEventUpdate): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "PUT", body);
  return fetchAPI<OrchestrationEventRead>(`${BASE_URL}/events/${id}`, requestOptions);
};

export const deleteOrchestrationEvent = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetchAPI<void>(`${BASE_URL}/events/${id}`, requestOptions);
};

// ---------------------------------------------------------------------------
// Pipeline API
// ---------------------------------------------------------------------------

export const createOrchestrationPipeline = async (token: string, body: OrchestrationPipelineCreate): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "POST", body);
  const pipeline = await fetchAPI<RawOrchestrationPipelineRead>(`${BASE_URL}/pipelines`, requestOptions);
  return normalizePipeline(pipeline);
};

export const getOrchestrationPipeline = async (token: string, id: string): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  const pipeline = await fetchAPI<RawOrchestrationPipelineRead>(`${BASE_URL}/pipelines/${id}`, requestOptions);
  return normalizePipeline(pipeline);
};

export const updateOrchestrationPipeline = async (token: string, id: string, body: OrchestrationPipelineUpdate): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "PUT", body);
  const pipeline = await fetchAPI<RawOrchestrationPipelineRead>(`${BASE_URL}/pipelines/${id}`, requestOptions);
  return normalizePipeline(pipeline);
};

export const getOrchestrationPipelines = async (token: string): Promise<OrchestrationPipelineRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  const pipelines = await fetchAPI<RawOrchestrationPipelineRead[]>(`${BASE_URL}/pipelines`, requestOptions);
  return pipelines.map(normalizePipeline);
};

export const deleteOrchestrationPipeline = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetchAPI<void>(`${BASE_URL}/pipelines/${id}`, requestOptions);
};
