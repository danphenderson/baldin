// Path: frontend/src/service/leads.tsx

import { components } from '../schema';

export type LeadRead = components['schemas']['LeadRead'];
export type LeadUpdate = components['schemas']['LeadUpdate'];
export type LeadCreate = components['schemas']['LeadCreate'];
export type Pagination = components['schemas']['Pagination'];
export type LeadsPaginatedRead = components['schemas']['LeadsPaginatedRead'];

// types that are exported from other services
type OrchestrationEventRead = components['schemas']['OrchestrationEventRead-Output'];

const BASE_URL = `${process.env.REACT_APP_API_URL}/leads`; // Can be moved to a config file or environment variable


const createRequestOptions = (token: string | null, method: string, body?: any, isFormData?: boolean): RequestInit => {
  if (!token) {
    console.log("Authorization token is required")
    throw new Error("Authorization token is required");
  }

  let headers = new Headers({
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  });

  if (isFormData) {
    // For file uploads, let the browser set 'Content-Type' to 'multipart/form-data' with the correct boundary.
    // Also, the body should be a FormData object & not a JSON string.
    const formData = new FormData();
    headers.delete("Content-Type");
    if (body) {
      for (const [key, value] of Object.entries(body)) {
        formData.append(key, value as string);
      }
    }
    return {
      method: method,
      headers: headers,
      body: formData,
    };
  } else {
    return {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : null,
    };
  }
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
  return fetchAPI(`${BASE_URL}/`, requestOptions);
};

export const updateLead = async (token: string, id: string, lead: LeadUpdate): Promise<LeadRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", lead);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const deleteLead = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const getLeadOrchestrationEvents = async (token: string, id: string): Promise<OrchestrationEventRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}/orchestration_events`, requestOptions);
};

export const seedLeads = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/seed`, requestOptions);
}

export const extractLead = async (token: string, extraction_url: string): Promise<LeadRead> => {
  // extraction_url is a query parameter that is passed to the backend to extract the lead
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/extract?extraction_url=${extraction_url}`, requestOptions);
}
