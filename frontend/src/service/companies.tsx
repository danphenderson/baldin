// Path: frontend/src/service/companies.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { FULL_LIST_PAGE_SIZE, normalizePaginatedResponse } from './pagination';

export type CompanyRead = components['schemas']['CompanyRead'];
export type CompanyCreate = components['schemas']['CompanyCreate'];
export type CompanyUpdate = components['schemas']['CompanyUpdate'];
type CompanyListPage = components['schemas']['PaginatedResponse_CompanyRead_'];

const unwrap = <T,>(
  result: { data?: T; error?: unknown; response: Response },
): T => {
  if (result.error !== undefined) {
    const detail = result.error as { detail?: unknown };
    let message = 'API request failed';
    if (detail?.detail) {
      message = typeof detail.detail === 'string' ? detail.detail : JSON.stringify(detail.detail);
    }
    throw new Error(message);
  }
  return result.data as T;
};

export const getCompanies = async (token: string): Promise<CompanyRead[]> => {
  const client = createApiClient(token);
  const page = unwrap<CompanyListPage>(await client.GET('/api/v1/companies/', {
    params: {
      query: {
        page: 1,
        page_size: FULL_LIST_PAGE_SIZE,
      },
    },
  }));
  return normalizePaginatedResponse(page, { page: 1, page_size: FULL_LIST_PAGE_SIZE }).items;
};

export const getCompany = async (token: string, id: string): Promise<CompanyRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/companies/{id}', {
    params: { path: { id } },
  }));
};

export const createCompany = async (token: string, company: CompanyCreate): Promise<CompanyRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/companies/', {
    body: company,
  }));
};

export const updateCompany = async (token: string, id: string, company: CompanyUpdate): Promise<CompanyRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/companies/{id}', {
    params: { path: { id } },
    body: company,
  }));
};

export const deleteCompany = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/companies/{id}', {
    params: { path: { id } },
  }));
};

export const getCompanyLeads = async (token: string, id: string): Promise<components['schemas']['LeadRead'][]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/companies/{id}/leads', {
    params: { path: { id } },
  }));
};

export const extractCompany = async (token: string, extractionUrl: string): Promise<CompanyRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/companies/extract', {
    params: { query: { extraction_url: extractionUrl } },
  }));
};
