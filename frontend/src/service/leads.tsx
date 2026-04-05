// Path: frontend/src/service/leads.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

export type LeadRead = components['schemas']['LeadRead'];
export type LeadUpdate = components['schemas']['LeadUpdate'];
export type LeadCreate = components['schemas']['LeadCreate'];
export type Pagination = components['schemas']['Pagination'];
export type LeadsPaginatedRead = components['schemas']['LeadsPaginatedRead'];

const BASE_URL = `${API_URL}/leads`;


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
  await fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const seedLeads = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/seed`, requestOptions);
}

export const extractLead = async (token: string, extraction_url: string): Promise<LeadRead> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/extract?extraction_url=${encodeURIComponent(extraction_url)}`, requestOptions);
}
