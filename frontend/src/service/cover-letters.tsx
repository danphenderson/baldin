// Path: frontend/src/service/cover-letters.tsx

import { components } from "../schema";

// do not export these types, as they should be asscessed from the resume and cover-letter services
export type CoverLetterRead = components['schemas']['CoverLetterRead'];
export type CoverLetterUpdate = components['schemas']['CoverLetterUpdate'];
export type CoverLetterCreate = components['schemas']['CoverLetterCreate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/cover_letters';


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

// Base Cover Letter Crud
export const getCoverLetters = async (token: string): Promise<CoverLetterRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/`, requestOptions);
};

export const getCoverLetter = async (token: string, id: string): Promise<CoverLetterRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const createCoverLetter = async (token: string, coverLetter: CoverLetterCreate): Promise<CoverLetterRead> => {
  const requestOptions = createRequestOptions(token, "POST", coverLetter);
  return fetchAPI(`${BASE_URL}/`, requestOptions);
}

export const updateCoverLetter = async (token: string, id: string, coverLetter: CoverLetterUpdate): Promise<CoverLetterRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", coverLetter);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const deleteCoverLetter = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

// Cover Letter Templates
export const getCoverLetterTemplates = async (token: string): Promise<CoverLetterRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  const url = `${BASE_URL}/?content_type=template`; // Add the query parameter
  return fetchAPI(url, requestOptions);
};

// TODO: Ensure cover letter content_type is set to 'template' when creating a new template
// Otherwise, there is no added benifit of declaring the functions below
export const createCoverLetterTemplate = async (token: string, coverLetter: CoverLetterCreate): Promise<CoverLetterRead> => {
  const requestOptions = createRequestOptions(token, "POST", coverLetter);
  return fetchAPI(`${BASE_URL}/`, requestOptions);
}

export const getCoverLetterTemplate = async (token: string, id: string): Promise<CoverLetterRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const updateCoverLetterTemplate = async (token: string, id: string, coverLetter: CoverLetterUpdate): Promise<CoverLetterRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", coverLetter);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const deleteCoverLetterTemplate = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
}

export const seedCoverLetters = async (token: string): Promise<CoverLetterRead[]> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}/seed`, requestOptions);
}
