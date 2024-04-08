// Path: frontend/src/service/data-orchestration.tsx

import { components } from "../schema";

export type OrchestrationEventRead = components['schemas']['OrchestrationEventRead-Output'];
export type OrchestrationEventCreate = components['schemas']['OrchestrationEventCreate'];
export type OrchestrationEventUpdate = components['schemas']['OrchestrationEventUpdate'];

export type OrchestrationPipelineRead = components['schemas']['OrchestrationPipelineRead'];
export type OrchestrationPipelineCreate = components['schemas']['OrchestrationPipelineCreate'];
export type OrchestrationPipelineUpdate = components['schemas']['OrchestrationPipelineUpdate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = `/data_orchestration`;

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

export const createOrchestrationEvent = async (token: string, body: OrchestrationEventCreate): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "POST", body);
  const response = await fetch(`${BASE_URL}/events`, requestOptions);
  return response.json();
};

export const getOrchestrationEvent = async (token: string, id: string): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  const response = await fetch(`${BASE_URL}/events/${id}`, requestOptions);
  return response.json();
}

export const getOrchestrationEvents = async (token: string): Promise<OrchestrationEventRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  const response = await fetch(`${BASE_URL}/events`, requestOptions);
  return response.json();
}

export const updateOrchestrationEvent = async (token: string, id: string, body: OrchestrationEventUpdate): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "PUT", body);
  const response = await fetch(`${BASE_URL}/events/${id}`, requestOptions);
  return response.json();
}

export const deleteOrchestrationEvent = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetch(`${BASE_URL}/events/${id}`, requestOptions);
}

export const createOrchestrationPipeline = async (token: string, body: OrchestrationPipelineCreate): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "POST", body);
  const response = await fetch(`${BASE_URL}/pipelines`, requestOptions);
  return response.json();
};

export const getOrchestrationPipeline = async (token: string, id: string): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  const response = await fetch(`${BASE_URL}/pipelines/${id}`, requestOptions);
  return response.json();
}

export const updateOrchestrationPipeline = async (token: string, id: string, body: OrchestrationPipelineUpdate): Promise<OrchestrationPipelineRead> => {
  const requestOptions = createRequestOptions(token, "PUT", body);
  const response = await fetch(`${BASE_URL}/pipelines/${id}`, requestOptions);
  return response.json();
}

export const deleteOrchestrationPipeline = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetch(`${BASE_URL}/pipelines/${id}`, requestOptions);
}
