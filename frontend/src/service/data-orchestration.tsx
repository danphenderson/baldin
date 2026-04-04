// Path: frontend/src/service/data-orchestration.tsx

import { components } from "../schema";
import { API_URL } from '../config/env';

export type OrchestrationEventRead = components['schemas']['OrchestrationEventRead-Output'];
export type OrchestrationEventCreate = components['schemas']['OrchestrationEventCreate'];
export type OrchestrationEventUpdate = components['schemas']['OrchestrationEventUpdate'];
export type OrchestrationEventStatus = components['schemas']['OrchestrationEventStatusType'];

type RawOrchestrationPipelineRead = components['schemas']['OrchestrationPipelineRead'];
export type OrchestrationPipelineRead = Omit<RawOrchestrationPipelineRead, 'orchestration_events'> & {
  events: OrchestrationEventRead[];
};
export type OrchestrationPipelineCreate = components['schemas']['OrchestrationPipelineCreate'];
export type OrchestrationPipelineUpdate = components['schemas']['OrchestrationPipelineUpdate'];

const BASE_URL = `${API_URL}/data_orchestration`;

const createRequestOptions = (token: string, method: string, body?: any): RequestInit => {
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
  };
};

export const createOrchestrationEvent = async (token: string, body: OrchestrationEventCreate): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "POST", body);
  return fetchAPI<OrchestrationEventRead>(`${BASE_URL}/events`, requestOptions);
};

export const getOrchestrationEvent = async (token: string, id: string): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI<OrchestrationEventRead>(`${BASE_URL}/events/${id}`, requestOptions);
}

export const getOrchestrationEvents = async (token: string): Promise<OrchestrationEventRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI<OrchestrationEventRead[]>(`${BASE_URL}/events`, requestOptions);
}

export const updateOrchestrationEvent = async (token: string, id: string, body: OrchestrationEventUpdate): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "PUT", body);
  return fetchAPI<OrchestrationEventRead>(`${BASE_URL}/events/${id}`, requestOptions);
}

export const deleteOrchestrationEvent = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetchAPI<void>(`${BASE_URL}/events/${id}`, requestOptions);
}

export const createOrchestrationPipeline = async (token: string, body: OrchestrationPipelineCreate): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "POST", body);
  const pipeline = await fetchAPI<RawOrchestrationPipelineRead>(`${BASE_URL}/pipelines`, requestOptions);
  return normalizePipeline(pipeline);
};

export const getOrchestrationPipeline = async (token: string, id: string): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  const pipeline = await fetchAPI<RawOrchestrationPipelineRead>(`${BASE_URL}/pipelines/${id}`, requestOptions);
  return normalizePipeline(pipeline);
}

export const updateOrchestrationPipeline = async (token: string, id: string, body: OrchestrationPipelineUpdate): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "PUT", body);
  const pipeline = await fetchAPI<RawOrchestrationPipelineRead>(`${BASE_URL}/pipelines/${id}`, requestOptions);
  return normalizePipeline(pipeline);
}

export const getOrchestrationPipelines = async (token: string): Promise<OrchestrationPipelineRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  const pipelines = await fetchAPI<RawOrchestrationPipelineRead[]>(`${BASE_URL}/pipelines`, requestOptions);
  return pipelines.map(normalizePipeline);
}

export const deleteOrchestrationPipeline = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetchAPI<void>(`${BASE_URL}/pipelines/${id}`, requestOptions);
}
