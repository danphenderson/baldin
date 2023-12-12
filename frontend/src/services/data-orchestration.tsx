import { components } from "../schema";

type OrchestrationEventRead = components['schemas']['OrchestrationEventRead'];

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
  return await response.json();
};

export const getOrchestrations = (): Promise<OrchestrationEventRead[] > => {
  return fetchAPI(`${BASE_URL}/events`);
};

export const getOrchestrationSuccesses = (): Promise<OrchestrationEventRead[]> => {
  return fetchAPI(`${BASE_URL}/events/success`);
};

export const getOrchestrationFailures = (): Promise<OrchestrationEventRead[]> => {
  return fetchAPI(`${BASE_URL}/events/failure`);
};
