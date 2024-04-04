// Path: frontend/src/services/skills.tsx
import { components } from "../schema";

export type ContactRead = components['schemas']['ContactRead'];
export type ContactCreate = components['schemas']['ContactCreate'];
export type ContactUpdate = components['schemas']['ContactUpdate'];


// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/contacts/';

const createRequestOptions = (token: string, method: string, body?: any): RequestInit => {
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

export const getContacts = async (token: string): Promise<ContactRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}`, requestOptions);
};

export const getContact = async (token: string, id: string): Promise<ContactRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const createContact = async (token: string, contact: ContactCreate): Promise<ContactRead> => {
  const requestOptions = createRequestOptions(token, "POST", contact);
  return fetchAPI(BASE_URL, requestOptions);
}

export const updateContact = async (token: string, id: string, contact: ContactUpdate): Promise<ContactRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", contact);
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const deleteContact = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

// Path: frontend/src/services/skills.tsx
