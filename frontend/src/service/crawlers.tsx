// Path: frontend/src/service/crawlers.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

export type CrawlerPipelineCreate = components['schemas']['CrawlerPipelineCreate'];
export type CrawlerPipelineRead = components['schemas']['CrawlerPipelineRead'];
export type CrawlerPipelineUpdate = components['schemas']['CrawlerPipelineUpdate'];
export type CrawlerRunRead = components['schemas']['CrawlerRunRead'];
export type CrawlerRunDetailRead = components['schemas']['CrawlerRunDetailRead'];
export type CrawlerRunStatus = components['schemas']['CrawlerRunStatus'];
export type CrawlerSourceType = components['schemas']['CrawlerSourceType'];
export type CrawlerTriggerType = components['schemas']['CrawlerTriggerType'];

const BASE_URL = `${API_URL}/crawlers`;

const createRequestOptions = (token: string, method: string, body?: any): RequestInit => {
  if (!token) {
    throw new Error("Authorization token is required");
  }
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  };
};

const fetchAPI = async (url: string, options: RequestInit) => {
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
    return null;
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Pipeline CRUD
// ---------------------------------------------------------------------------

export const getCrawlerPipelines = async (token: string): Promise<CrawlerPipelineRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/pipelines/`, requestOptions);
};

export const getCrawlerPipeline = async (token: string, id: string): Promise<CrawlerPipelineRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/pipelines/${id}`, requestOptions);
};

export const createCrawlerPipeline = async (token: string, pipeline: CrawlerPipelineCreate): Promise<CrawlerPipelineRead> => {
  const requestOptions = createRequestOptions(token, "POST", pipeline);
  return fetchAPI(`${BASE_URL}/pipelines/`, requestOptions);
};

export const updateCrawlerPipeline = async (token: string, id: string, pipeline: CrawlerPipelineUpdate): Promise<CrawlerPipelineRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", pipeline);
  return fetchAPI(`${BASE_URL}/pipelines/${id}`, requestOptions);
};

// ---------------------------------------------------------------------------
// Run operations
// ---------------------------------------------------------------------------

export const getCrawlerRuns = async (token: string, pipelineId?: string): Promise<CrawlerRunRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  const url = pipelineId
    ? `${BASE_URL}/runs/?pipeline_id=${pipelineId}`
    : `${BASE_URL}/runs/`;
  return fetchAPI(url, requestOptions);
};

export const getCrawlerRunDetail = async (token: string, runId: string): Promise<CrawlerRunDetailRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/runs/${runId}`, requestOptions);
};

export const triggerCrawlerRun = async (token: string, pipelineId: string): Promise<CrawlerRunRead> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/pipelines/${pipelineId}/runs`, requestOptions);
};

export const cancelCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/runs/${runId}/cancel`, requestOptions);
};

export const pauseCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/runs/${runId}/pause`, requestOptions);
};

export const resumeCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/runs/${runId}/resume`, requestOptions);
};

export const retryCrawlerRun = async (token: string, runId: string): Promise<CrawlerRunRead> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/runs/${runId}/retry`, requestOptions);
};
