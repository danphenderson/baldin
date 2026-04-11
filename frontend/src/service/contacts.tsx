// Path: frontend/src/service/contacts.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';

export type ContactRead = components['schemas']['ContactRead'];
export type ContactCreate = components['schemas']['ContactCreate'];
export type ContactUpdate = components['schemas']['ContactUpdate'];

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

export const getContacts = async (token: string): Promise<ContactRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/contacts/'));
};

export const getContact = async (token: string, id: string): Promise<ContactRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/contacts/{id}', {
    params: { path: { id } },
  }));
};

export const createContact = async (token: string, contact: ContactCreate): Promise<ContactRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/contacts/', {
    body: contact,
  }));
};

export const updateContact = async (token: string, id: string, contact: ContactUpdate): Promise<ContactRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/contacts/{id}', {
    params: { path: { id } },
    body: contact,
  }));
};

export const deleteContact = async (token: string, id: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/contacts/{id}', {
    params: { path: { id } },
  }));
};

export const seedContacts = async (token: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/api/v1/contacts/seed'));
};
