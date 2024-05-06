// Path: frontend/src/service/experiences.tsx

import { components } from "../schema";

export type ExperienceRead = components['schemas']['ExperienceRead'];
export type ExperienceUpdate = components['schemas']['ExperienceUpdate'];
export type ExperienceCreate = components['schemas']['ExperienceCreate'];


// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/experiences/';

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

export const getExperiences = async (token: string): Promise<ExperienceRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}`, requestOptions);
};

export const getExperience = async (token: string, id: string): Promise<ExperienceRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
};


export const createExperience = async (token: string, experience: ExperienceCreate): Promise<ExperienceRead> => {
  const requestOptions = createRequestOptions(token, "POST", experience);
  return fetchAPI(BASE_URL, requestOptions);
};

export const updateExperience = async (token: string, id: string, experience: ExperienceUpdate): Promise<ExperienceRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", experience);
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
};


export const deleteExperience = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const seedExperiences = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}seed`, requestOptions);
}
