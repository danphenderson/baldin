// Path: frontend/src/service/skills.tsx
import { components } from "../schema";
import { API_URL } from '../config/env';

export type ContactRead = components['schemas']['ContactRead'];
export type ContactCreate = components['schemas']['ContactCreate'];
export type ContactUpdate = components['schemas']['ContactUpdate'];


const BASE_URL = `${API_URL}/contacts/`;

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
  await fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const seedContacts = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}seed`, requestOptions);
}

// Path: frontend/src/services/skills.tsx
