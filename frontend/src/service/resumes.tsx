// Path: frontend/src/service/resumes.tsx

import { components } from "../schema";

export type ResumeRead = components['schemas']['ResumeRead'];
export type ResumeUpdate = components['schemas']['ResumeUpdate'];
export type ResumeCreate = components['schemas']['ResumeCreate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/resumes';


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

// Base Resume Crud
export const getResumes = async (token: string): Promise<ResumeRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/`, requestOptions);
};

export const getResume = async (token: string, id: string): Promise<ResumeRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const createResume = async (token: string, resume: ResumeCreate): Promise<ResumeRead> => {
  const requestOptions = createRequestOptions(token, "POST", resume);
  return fetchAPI(`${BASE_URL}/`, requestOptions);
}

export const updateResume = async (token: string, id: string, resume: ResumeUpdate): Promise<ResumeRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", resume);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const deleteResume = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}


// Resume Templates
export const getResumeTemplates = async (token: string): Promise<ResumeRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/?content_type=template`, requestOptions);
}


// TODO: Ensure resume content_type is set to 'template' when creating, getting, and updating a new resume template
// Otherwise, there is no added benefit of declaring the functions below
export const createResumeTemplate = async (token: string, resume: ResumeCreate): Promise<ResumeRead> => {
  const requestOptions = createRequestOptions(token, "POST", resume);
  return fetchAPI(`${BASE_URL}/`, requestOptions);
}

export const updateResumeTemplate = async (token: string, id: string, resume: ResumeUpdate): Promise<ResumeRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", resume);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const getResumeTemplate = async (token: string, id: string): Promise<ResumeRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}
