import { components } from "../schema";

export type ApplicationRead = components['schemas']['ApplicationRead'];
export type ApplicationCreate = components['schemas']['ApplicationCreate'];
export type ApplicationUpdate = components['schemas']['ApplicationUpdate'];

// do not export these types, as they should be asscessed from the resume and cover-letter services
type ResumeRead = components['schemas']['ResumeRead'];
type CoverLetterRead = components['schemas']['CoverLetterRead'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/applications';
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};



const fetchAPI = async (url: string, method: string) => {
  const requestOptions = {
    method: method,
    headers: DEFAULT_HEADERS,
  };

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error(`API request failed for ${url}`);
  }
  return response.json();
};


export const getApplications = async (): Promise<ApplicationRead[]> => {
  return fetchAPI(`${BASE_URL}`, "GET");
};


export const getApplication = async (id: string): Promise<ApplicationRead> => {
  return fetchAPI(`${BASE_URL}/${id}`, "GET");
};

export const createApplication = async (application: ApplicationCreate): Promise<ApplicationRead>  => {
  return fetchAPI(`${BASE_URL}`, "POST");
};

export const updateApplication = async (id: string, application: ApplicationUpdate): Promise<ApplicationRead> =>  {
  return fetchAPI(`${BASE_URL}/${id}`, "PUT");
};

export const deleteApplication = async (id: string): Promise<ApplicationRead> =>  {
  return fetchAPI(`${BASE_URL}/${id}`, "DELETE");
};
