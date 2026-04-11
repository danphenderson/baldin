// Path: frontend/src/service/data-orchestration.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { FULL_LIST_PAGE_SIZE, normalizePaginatedResponse, type PaginatedResponse } from './pagination';

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
type RawOrchestrationEventPage = components['schemas']['PaginatedResponse_OrchestrationEventRead_'];
type RawOrchestrationPipelinePage = components['schemas']['PaginatedResponse_OrchestrationPipelineRead_'];

export type OrchestrationEventPaginatedRead = PaginatedResponse<OrchestrationEventRead>;

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
// Helpers
// ---------------------------------------------------------------------------

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
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/orchestration-pipelines/events', { body }));
};

export const getOrchestrationEvent = async (token: string, id: string): Promise<OrchestrationEventRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/orchestration-pipelines/events/{id}', {
    params: { path: { id } },
  }));
};

export const getOrchestrationEvents = async (
  token: string,
  params?: EventQueryParams,
): Promise<OrchestrationEventPaginatedRead> => {
  const client = createApiClient(token);
  const page = unwrap<RawOrchestrationEventPage>(await client.GET('/api/v1/orchestration-pipelines/events', {
    params: {
      query: {
        status: params?.status ?? undefined,
        pipeline_id: params?.pipeline_id ?? undefined,
        page: params?.page,
        page_size: params?.page_size,
      },
    },
  }));
  return normalizePaginatedResponse(page, {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 20,
  });
};

export const updateOrchestrationEvent = async (token: string, id: string, body: OrchestrationEventUpdate): Promise<OrchestrationEventRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/orchestration-pipelines/events/{id}', {
    params: { path: { id } },
    body,
  }));
};

export const deleteOrchestrationEvent = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  // DELETE not exposed in schema for this path; cast to bypass type check
  unwrap(await (client.DELETE as Function)('/api/v1/orchestration-pipelines/events/{id}', {
    params: { path: { id } },
  }));
};

// ---------------------------------------------------------------------------
// Pipeline API
// ---------------------------------------------------------------------------

export const createOrchestrationPipeline = async (token: string, body: OrchestrationPipelineCreate): Promise<OrchestrationPipelineRead> => {
  const client = createApiClient(token);
  const pipeline = unwrap(await client.POST('/api/v1/orchestration-pipelines/pipelines', { body }));
  return normalizePipeline(pipeline);
};

export const getOrchestrationPipeline = async (token: string, id: string): Promise<OrchestrationPipelineRead> => {
  const client = createApiClient(token);
  const pipeline = unwrap(await client.GET('/api/v1/orchestration-pipelines/pipelines/{id}', {
    params: { path: { id } },
  }));
  return normalizePipeline(pipeline);
};

export const updateOrchestrationPipeline = async (token: string, id: string, body: OrchestrationPipelineUpdate): Promise<OrchestrationPipelineRead> => {
  const client = createApiClient(token);
  const pipeline = unwrap(await client.PATCH('/api/v1/orchestration-pipelines/pipelines/{id}', {
    params: { path: { id } },
    body,
  }));
  return normalizePipeline(pipeline);
};

export const getOrchestrationPipelines = async (token: string): Promise<OrchestrationPipelineRead[]> => {
  const client = createApiClient(token);
  const page = unwrap<RawOrchestrationPipelinePage>(await client.GET('/api/v1/orchestration-pipelines/pipelines', {
    params: {
      query: {
        page: 1,
        page_size: FULL_LIST_PAGE_SIZE,
      },
    },
  }));
  return normalizePaginatedResponse(page, { page: 1, page_size: FULL_LIST_PAGE_SIZE }).items.map(normalizePipeline);
};

export const deleteOrchestrationPipeline = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/orchestration-pipelines/pipelines/{id}', {
    params: { path: { id } },
  }));
};

export const retryOrchestrationEvent = async (token: string, eventId: string): Promise<OrchestrationEventRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/orchestration-pipelines/events/{event_id}/retry', {
    params: { path: { event_id: eventId } },
  }));
};
