// Path: frontend/src/service/leads.tsx

import { components } from '../schema';

export type LeadRead = components['schemas']['LeadRead'];
export type LeadUpdate = components['schemas']['LeadUpdate'];
export type LeadCreate = components['schemas']['LeadCreate'];
export type Pagination = components['schemas']['Pagination'];
export type LeadsPaginatedRead = components['schemas']['LeadsPaginatedRead'];

// types that are exported from other services
type OrchestrationEventRead = components['schemas']['OrchestrationEventRead-Output'];


const BASE_URL = "/leads"; // Can be moved to a config file or environment variable


const createRequestOptions = (token: string | null, method: string, body?: any): RequestInit => {
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


const fetchAPI = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    // Custom error handling can be implemented here
    throw new Error('API request failed');
  }
  return response.json();
};


export const getLeads = async (token: string, pagination: Pagination): Promise<LeadsPaginatedRead> => {
  const resquestOptions = createRequestOptions(token, "GET");
  return await fetchAPI(`${BASE_URL}/?page=${pagination.page}&page_size=${pagination.page_size}`, resquestOptions);
};

export const getLead = async (token: string, id: string): Promise<LeadRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const createLead = async (token: string, lead: LeadCreate): Promise<LeadRead> => {
  const requestOptions = createRequestOptions(token, "POST", lead);
  return fetchAPI(BASE_URL, requestOptions);
};

export const updateLead = async (token: string, id: string, lead: LeadUpdate): Promise<LeadRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", lead);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const deleteLead = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const loadLeadDatabase = async (token: string, params: any): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(token, "POST", params);
  return fetchAPI(`${BASE_URL}/load_database`, requestOptions);
}

export const erichLeadDataLake = async (): Promise<OrchestrationEventRead> => {
  const requestOptions = createRequestOptions(null, "POST");
  return fetchAPI(`${BASE_URL}/enrich_data_lake`, requestOptions);
}
