import { components } from '../schema.d';

export type LeadRead = components['schemas']['LeadRead'];
export type LeadUpdate = components['schemas']['LeadUpdate'];
export type LeadCreate = components['schemas']['LeadCreate'];
export type Pagination = components['schemas']['Pagination'];
export type LeadsPaginatedRead = components['schemas']['LeadsPaginatedRead'];

// types that are exported from other services
type OrchestrationEventRead = components['schemas']['OrchestrationEventRead'];


const BASE_URL = "/leads"; // Can be moved to a config file or environment variable
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const fetchApi = async (url: string, options: RequestInit): Promise<Response> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    // You can customize the error handling here
    throw new Error('API request failed with status ${response.status}: ${response.statusText}`');
  }
  return response;
};

export const getLeads = async (pagination: Pagination): Promise<LeadsPaginatedRead> => {
  const response = await fetchApi(`${BASE_URL}/?page=${pagination.page}&page_size=${pagination.page_size}`, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
};

export const getLead = async (id: string): Promise<LeadRead> => {
  const response = await fetchApi(`${BASE_URL}/${id}`, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
};

export const createLead = async (lead: LeadCreate): Promise<LeadRead> => {
  const response = await fetchApi(BASE_URL, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(lead),
  });
  return response.json();
};

export const updateLead = async (id: string, lead: LeadUpdate): Promise<LeadRead> => {
  const response = await fetchApi(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(lead),
  });
  return response.json();
};

export const deleteLead = async (id: string): Promise<void> => {
  await fetchApi(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: DEFAULT_HEADERS,
  });
};

export const loadLeadDatabase = async (): Promise<OrchestrationEventRead> => {
  const response = await fetchApi(`${BASE_URL}/load_database`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
}

export const erichLeadDataLake = async (): Promise<OrchestrationEventRead> => {
  const response = await fetchApi(`${BASE_URL}/erich_datalake`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
}
