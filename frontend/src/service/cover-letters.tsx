// Path: frontend/src/service/resumes.tsx

import { components } from "../schema";

// do not export these types, as they should be asscessed from the resume and cover-letter services
export type CoverLetterRead = components['schemas']['CoverLetterRead'];
export type CoverLetterUpdate = components['schemas']['CoverLetterUpdate'];
export type CoverLetterCreate = components['schemas']['CoverLetterCreate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/cover_letters';
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};


const fetchApi = async (url: string, options: RequestInit): Promise<Response> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    // You can customize the error handling here
    throw new Error('API request failed');
  }
  return response;
};

export const getCoverLetters = async (): Promise<CoverLetterRead[]> => {
  const response = await fetchApi(`${BASE_URL}/`, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
};

export const getCoverLetter = async (id: string): Promise<CoverLetterRead> => {
  const response = await fetchApi(`${BASE_URL}/${id}`, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
};

export const createCoverLetter = async (coverLetter: CoverLetterCreate): Promise<CoverLetterRead> => {
  const response = await fetchApi(BASE_URL, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(coverLetter),
  });
  return response.json();
};

export const updateCoverLetter = async (id: string, coverLetter: CoverLetterUpdate): Promise<CoverLetterRead> => {
  const response = await fetchApi(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(coverLetter),
  });
  return response.json();
};

export const deleteCoverLetter = async (id: string): Promise<void> => {
  await fetchApi(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: DEFAULT_HEADERS,
  });
};
