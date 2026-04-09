// Path: frontend/src/service/crawlers.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';

export type CrawlerPipelineCreate = components['schemas']['CrawlerPipelineCreate'];
export type CrawlerPipelineRead = components['schemas']['CrawlerPipelineRead'];
export type CrawlerPipelineUpdate = components['schemas']['CrawlerPipelineUpdate'];
export type CrawlerRunRead = components['schemas']['CrawlerRunRead'];
type RawCrawlerRunsPaginatedRead = components['schemas']['CrawlerRunsPaginatedRead'];
export type CrawlerRunsPaginatedRead = {
  items: CrawlerRunRead[];
  total: number;
  page: number;
  page_size: number;
};
export type CrawlerRunDetailRead = components['schemas']['CrawlerRunDetailRead'];
export type CrawlerRunStatus = components['schemas']['CrawlerRunStatus'];
export type CrawlerSourceType = components['schemas']['CrawlerSourceType'];
export type CrawlerTriggerType = components['schemas']['CrawlerTriggerType'];

export interface CrawlerRunQueryParams {
  pipeline_id?: string;
  source?: CrawlerSourceType;
  status?: CrawlerRunStatus;
  trigger_type?: CrawlerTriggerType;
  page?: number;
  page_size?: number;
  request_count?: boolean;
}

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

// ---------------------------------------------------------------------------
// Pipeline CRUD
// ---------------------------------------------------------------------------

export const getCrawlerPipelines = async (token: string): Promise<CrawlerPipelineRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/crawlers/pipelines'));
};

export const getCrawlerPipeline = async (token: string, id: string): Promise<CrawlerPipelineRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/crawlers/pipelines/{pipeline_id}', {
    params: { path: { pipeline_id: id } },
  }));
};

export const createCrawlerPipeline = async (token: string, pipeline: CrawlerPipelineCreate): Promise<CrawlerPipelineRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/crawlers/pipelines', {
    body: pipeline,
  }));
};

export const updateCrawlerPipeline = async (token: string, id: string, pipeline: CrawlerPipelineUpdate): Promise<CrawlerPipelineRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/crawlers/pipelines/{pipeline_id}', {
    params: { path: { pipeline_id: id } },
    body: pipeline,
  }));
};

// ---------------------------------------------------------------------------
// Run operations
// ---------------------------------------------------------------------------

export const getCrawlerRuns = async (
  token: string,
  params?: CrawlerRunQueryParams,
): Promise<CrawlerRunsPaginatedRead> => {
  const client = createApiClient(token);
  const response = unwrap<RawCrawlerRunsPaginatedRead>(await client.GET('/crawlers/runs', {
    params: {
      query: {
        pipeline_id: params?.pipeline_id ?? undefined,
        source: params?.source ?? undefined,
        status: params?.status ?? undefined,
        trigger_type: params?.trigger_type ?? undefined,
        page: params?.page,
        page_size: params?.page_size,
        request_count: params?.request_count,
      },
    },
  }));
  return {
    items: response.items ?? [],
    total: response.total ?? 0,
    page: response.page ?? params?.page ?? 1,
    page_size: response.page_size ?? params?.page_size ?? 10,
  };
};

export const getCrawlerRunDetail = async (token: string, runId: string): Promise<CrawlerRunDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/crawlers/runs/{run_id}', {
    params: { path: { run_id: runId } },
  }));
};

export const triggerCrawlerRun = async (token: string, pipelineId: string): Promise<CrawlerRunRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/crawlers/pipelines/{pipeline_id}/runs', {
    params: { path: { pipeline_id: pipelineId } },
  }));
};

export const cancelCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/crawlers/runs/{run_id}/cancel', {
    params: { path: { run_id: runId } },
  }));
};

export const pauseCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/crawlers/runs/{run_id}/pause', {
    params: { path: { run_id: runId } },
  }));
};

export const resumeCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/crawlers/runs/{run_id}/resume', {
    params: { path: { run_id: runId } },
  }));
};

export const retryCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/crawlers/runs/{run_id}/retry', {
    params: { path: { run_id: runId } },
  }));
};
