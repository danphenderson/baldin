// Path: frontend/src/service/companies.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

export type CompanyRead = components['schemas']['CompanyRead'];
export type CompanyCreate = components['schemas']['CompanyCreate'];
export type CompanyUpdate = components['schemas']['CompanyUpdate'];

const BASE_URL = `${API_URL}/companies`;

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

export const getCompanies = async (token: string): Promise<CompanyRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/`, requestOptions);
};

export const getCompany = async (token: string, id: string): Promise<CompanyRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const createCompany = async (token: string, company: CompanyCreate): Promise<CompanyRead> => {
  const requestOptions = createRequestOptions(token, "POST", company);
  return fetchAPI(`${BASE_URL}/`, requestOptions);
};

export const updateCompany = async (token: string, id: string, company: CompanyUpdate): Promise<CompanyRead> => {
  const requestOptions = createRequestOptions(token, "PUT", company);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const deleteCompany = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const getCompanyLeads = async (token: string, id: string): Promise<any[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}/leads`, requestOptions);
};

export const extractCompany = async (token: string, extractionUrl: string): Promise<CompanyRead> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/extract?extraction_url=${encodeURIComponent(extractionUrl)}`, requestOptions);
};
