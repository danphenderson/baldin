import { components } from "../schema.d";

// do not export these types, as they should be asscessed from the resume and cover-letter services
export type ResumeRead = components['schemas']['ResumeRead'];
export type ResumeUpdate = components['schemas']['ResumeUpdate'];
export type ResumeCreate = components['schemas']['ResumeCreate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/resumes';
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


export const getResumes = async (): Promise<ResumeRead[]> => {
  const response = await fetchApi(`${BASE_URL}/`, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
};

export const getResume = async (id: string): Promise<ResumeRead> => {
  const response = await fetchApi(`${BASE_URL}/${id}`, {
    method: "GET",
    headers: DEFAULT_HEADERS,
  });
  return response.json();
};


export const createResume = async (resume: ResumeCreate): Promise<ResumeRead> => {
  const response = await fetchApi(BASE_URL, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(resume),
  });
  return response.json();
};

export const updateResume = async (id: string, resume: ResumeUpdate): Promise<ResumeRead> => {
  const response = await fetchApi(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(resume),
  });
  return response.json();
};

export const deleteResume = async (id: string): Promise<void> => {
  await fetchApi(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: DEFAULT_HEADERS,
  });
};
