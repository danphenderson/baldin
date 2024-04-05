// Path: frontend/src/service/education.tsx

import { components } from "../schema";

export type EducationRead = components['schemas']['EducationRead'];
export type EducationCreate = components['schemas']['EducationCreate'];
export type EducationUpdate = components['schemas']['EducationUpdate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/education/';

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
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}
