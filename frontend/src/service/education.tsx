// Path: frontend/src/service/education.tsx

import { components } from "../schema";
import { API_URL } from '../config/env';

export type EducationRead = components['schemas']['EducationRead'];
export type EducationCreate = components['schemas']['EducationCreate'];
export type EducationUpdate = components['schemas']['EducationUpdate'];

const BASE_URL = `${API_URL}/education/`;

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

export const getEducations = async (token: string): Promise<EducationRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}`, requestOptions);
};

export const getEducation = async (token: string, id: string): Promise<EducationRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
};

export const createEducation = async (token: string, education: EducationCreate): Promise<EducationRead> => {
  const requestOptions = createRequestOptions(token, "POST", education);
  return fetchAPI(BASE_URL, requestOptions);
}

export const updateEducation = async (token: string, id: string, education: EducationUpdate): Promise<EducationRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", education);
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const deleteEducation = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const seedEducations = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}seed`, requestOptions);
}
