// Path: frontend/src/service/certificates.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';
import { fetchAllPages, FULL_LIST_PAGE_SIZE } from './pagination';

export type CertificateRead = components['schemas']['CertificateRead'];
export type CertificateCreate = components['schemas']['CertificateCreate'];
export type CertificateUpdate = components['schemas']['CertificateUpdate'];
type CertificateListPage = components['schemas']['PaginatedResponse_CertificateRead_'];

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

export const getCertificates = async (token: string): Promise<CertificateRead[]> => {
  const client = createApiClient(token);
  return fetchAllPages<CertificateRead>(async (page, pageSize) => unwrap<CertificateListPage>(await client.GET('/api/v1/certificates/', {
    params: {
      query: {
        page,
        page_size: pageSize,
      },
    },
  })), FULL_LIST_PAGE_SIZE);
};

export const getCertificate = async (token: string, id: string): Promise<CertificateRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/certificates/{id}', {
    params: { path: { id } },
  }));
};

export const createCertificate = async (token: string, certificate: CertificateCreate): Promise<CertificateRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/certificates/', {
    body: certificate,
  }));
};

export const updateCertificate = async (token: string, id: string, certificate: CertificateUpdate): Promise<CertificateRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/certificates/{id}', {
    params: { path: { id } },
    body: certificate,
  }));
};

export const deleteCertificate = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/certificates/{id}', {
    params: { path: { id } },
  }));
};

export const seedCertificates = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/api/v1/certificates/seed'));
};
