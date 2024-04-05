// Path: frontend/src/service/data-orchestration.tsx

import { components } from "../schema";

export type OrchestrationEventRead = components['schemas']['OrchestrationEventRead'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = `/data_orchestration`;
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const fetchAPI = async (url: string): Promise<OrchestrationEventRead[]> => {
  const requestOptions = {
    method: "GET",
    headers: DEFAULT_HEADERS,
  };
  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error('API request failed');
  }
  return response.json();
};

export const getOrchestrations = async (): Promise<OrchestrationEventRead[] > => {
  return fetchAPI(`${BASE_URL}/events`);
};

export const getOrchestrationSuccesses = async (): Promise<OrchestrationEventRead[]> => {
  return fetchAPI(`${BASE_URL}/events/success`);
};

export const getOrchestrationFailures = async (): Promise<OrchestrationEventRead[]> => {
  return fetchAPI(`${BASE_URL}/events/failure`);
};
