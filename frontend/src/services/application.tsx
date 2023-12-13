import { components } from "../schema.d";

export type ApplicationRead = components['schemas']['ApplicationRead'];
export type ApplicationCreate = components['schemas']['ApplicationCreate'];
export type ApplicationUpdate = components['schemas']['ApplicationUpdate'];

// do not export these types, as they should be asscessed from the resume and cover-letter services
type ResumeRead = components['schemas']['ResumeRead'];
type CoverLetterRead = components['schemas']['CoverLetterRead'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/applications/';
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const createRequestOptions = (token: string, method: string, body?: any): RequestInit => {
  if (!token) {
    console.log("Authorization token is required")
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
    throw new Error(`API request failed for ${url} using options ${JSON.stringify(options)}: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const getApplications = async (token: string): Promise<ApplicationRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  const applications = await fetchAPI(`${BASE_URL}`, requestOptions);

  // Function to add prefix to each key in an object
  const addPrefix = (obj: any, prefix: string) => {
    return Object.keys(obj).reduce((acc: {[key: string]: any}, key) => {
      acc[prefix + key] = obj[key];
      return acc;
    }, {});
  };

  return applications.map((app: any) => {
    const leadWithPrefix = addPrefix(app.lead, 'lead_');
    const userWithPrefix = addPrefix(app.user, 'user_');

    return {
      ...app, // Spread the original application properties
      ...leadWithPrefix, // Spread the lead properties with 'lead_' prefix
      ...userWithPrefix, // Spread the user properties with 'user_' prefix
    };
  });
};


export const getApplicationResumes = async (token: string, id: string): Promise<ApplicationRead> => {
  const requestOptions = createRequestOptions(token, "GET", id);
  return await fetchAPI(`${BASE_URL}${id}/resumes`, requestOptions);
};

export const getApplicationCoverLetters = async (token: string, id: string): Promise<ApplicationRead> => {
  const requestOptions = createRequestOptions(token, "GET", id);
  return await fetchAPI(`${BASE_URL}${id}/resumes`, requestOptions);
};

export const createApplicationResume = async (token: string, id: string, resume: ResumeRead): Promise<ApplicationRead> => {

  const requestOptions = createRequestOptions(token, "POST", resume);
  return fetchAPI(`${BASE_URL}${id}/resumes`, requestOptions);
}

export const createApplicationCoverLetter = async (token: string, id: string, coverLetter: CoverLetterRead): Promise<ApplicationRead> => {
  const requestOptions = createRequestOptions(token, "POST", coverLetter);
  return fetchAPI(`${BASE_URL}${id}/cover_letters`, requestOptions);
}

export const createApplication = async (token: string, application: ApplicationCreate): Promise<ApplicationRead>  => {
  const requestOptions = createRequestOptions(token, "POST", application);
  return fetchAPI(`${BASE_URL}`, requestOptions);
};

export const updateApplication = async (token: string, id: string, application: ApplicationUpdate): Promise<ApplicationRead> =>  {
  const requestOptions = createRequestOptions(token, "PATCH", application);
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
};

export const deleteApplication = async (token: string, id: string): Promise<ApplicationRead> =>  {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
};
