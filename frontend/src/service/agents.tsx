import { components } from '../schema';
import { createApiClient } from './api-client';
import { FULL_LIST_PAGE_SIZE, normalizePaginatedResponse, type PaginatedResponse } from './pagination';

export type AgentKind = components['schemas']['AgentKind'];
export type AgentSummaryRead = components['schemas']['AgentSummaryRead'];
export type AgentRead = components['schemas']['AgentRead'];
export type AgentCreate = components['schemas']['AgentCreate'];
export type AgentUpdate = components['schemas']['AgentUpdate'];
export type AgentRunExecuteRequest = components['schemas']['AgentRunExecuteRequest'];
export type AgentRunRead = components['schemas']['AgentRunRead'];
export type AgentRunSummaryRead = components['schemas']['AgentRunSummaryRead'];
export type AgentRunStatus = components['schemas']['AgentRunStatus'];
export type AgentRunTriggerKind = components['schemas']['AgentRunTriggerKind'];

type AgentListPage = components['schemas']['PaginatedResponse_AgentSummaryRead_'];
type RawAgentRunsPaginatedRead = components['schemas']['PaginatedResponse_AgentRunSummaryRead_'];

export type AgentRunsPaginatedRead = PaginatedResponse<AgentRunSummaryRead>;

export interface AgentListFilters {
  kind?: AgentKind;
}

export interface AgentRunsPagination {
  page?: number;
  page_size?: number;
}

const DEFAULT_RUNS_PAGE = 1;
const DEFAULT_RUNS_PAGE_SIZE = 20;

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

export const getAgents = async (token: string, filters?: AgentListFilters): Promise<AgentSummaryRead[]> => {
  const client = createApiClient(token);
  const page = unwrap<AgentListPage>(await client.GET('/api/v1/agents/', {
    params: {
      query: {
        kind: filters?.kind,
        page: 1,
        page_size: FULL_LIST_PAGE_SIZE,
      },
    },
  }));

  return normalizePaginatedResponse(page, { page: 1, page_size: FULL_LIST_PAGE_SIZE }).items;
};

export const getAgent = async (token: string, id: string): Promise<AgentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/agents/{id}', {
    params: { path: { id } },
  }));
};

export const createAgent = async (token: string, agent: AgentCreate): Promise<AgentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/agents/', {
    body: agent,
  }));
};

export const updateAgent = async (token: string, id: string, agent: AgentUpdate): Promise<AgentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/agents/{id}', {
    params: { path: { id } },
    body: agent,
  }));
};

export const deleteAgent = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/agents/{id}', {
    params: { path: { id } },
  }));
};

export const getAgentRuns = async (
  token: string,
  id: string,
  pagination?: AgentRunsPagination,
): Promise<AgentRunsPaginatedRead> => {
  const page = pagination?.page ?? DEFAULT_RUNS_PAGE;
  const pageSize = pagination?.page_size ?? DEFAULT_RUNS_PAGE_SIZE;
  const client = createApiClient(token);
  const response = unwrap<RawAgentRunsPaginatedRead>(await client.GET('/api/v1/agents/{id}/runs', {
    params: {
      path: { id },
      query: {
        page,
        page_size: pageSize,
      },
    },
  }));

  return normalizePaginatedResponse(response, { page, page_size: pageSize });
};

export const runAgent = async (
  token: string,
  id: string,
  payload: AgentRunExecuteRequest,
): Promise<AgentRunRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/agents/{id}/run', {
    params: { path: { id } },
    body: payload,
  }));
};

export const getRunsBySessionDocument = async (
  token: string,
  sessionDocumentId: string,
  pagination?: AgentRunsPagination,
): Promise<AgentRunsPaginatedRead> => {
  const page = pagination?.page ?? DEFAULT_RUNS_PAGE;
  const pageSize = pagination?.page_size ?? DEFAULT_RUNS_PAGE_SIZE;
  const client = createApiClient(token);
  const response = unwrap<RawAgentRunsPaginatedRead>(await client.GET('/api/v1/agents/runs', {
    params: {
      query: {
        session_document_id: sessionDocumentId,
        page,
        page_size: pageSize,
      },
    },
  }));

  return normalizePaginatedResponse(response, { page, page_size: pageSize });
};
