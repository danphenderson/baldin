// Path: frontend/src/service/applications.tsx

import { components } from "../schema";
import { API_URL } from '../config/env';

export type ApplicationRead = components['schemas']['ApplicationRead'];
export type ApplicationCreate = components['schemas']['ApplicationCreate'];
export type ApplicationUpdate = components['schemas']['ApplicationUpdate'];
type ApplicationResumeAttach = components['schemas']['ApplicationResumeAttach'];
type ApplicationCoverLetterAttach = components['schemas']['ApplicationCoverLetterAttach'];

// do not export these types, as they should be asscessed from the resume and cover-letter services
type ResumeRead = components['schemas']['ResumeRead'];
type CoverLetterRead = components['schemas']['CoverLetterRead'];

const BASE_URL = `${API_URL}/applications/`;

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
    let message = `API request failed for ${url}: ${response.status} ${response.statusText}`;
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


export const getApplicationResumes = async (token: string, id: string): Promise<ResumeRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchAPI(`${BASE_URL}${id}/resumes`, requestOptions);
};

export const getApplicationCoverLetters = async (token: string, id: string): Promise<CoverLetterRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchAPI(`${BASE_URL}${id}/cover_letters`, requestOptions);
};

export const createApplicationResume = async (token: string, id: string, resumeId: string): Promise<ResumeRead> => {
  const payload: ApplicationResumeAttach = { resume_id: resumeId };
  const requestOptions = createRequestOptions(token, "POST", payload);
  return fetchAPI(`${BASE_URL}${id}/resumes`, requestOptions);
}

export const createApplicationCoverLetter = async (token: string, id: string, coverLetterId: string): Promise<CoverLetterRead> => {
  const payload: ApplicationCoverLetterAttach = { cover_letter_id: coverLetterId };
  const requestOptions = createRequestOptions(token, "POST", payload);
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

export const deleteApplication = async (token: string, id: string): Promise<void> =>  {
  const requestOptions = createRequestOptions(token, "DELETE");
  await fetchAPI(`${BASE_URL}${id}`, requestOptions);
};

export const generatecoverLetter = async (token: string, id: string, template_id: string): Promise<CoverLetterRead> =>  {
  const requestOptions = createRequestOptions(token, "POST");
  const url = `${BASE_URL}${id}/cover_letters/generate?template_id=${template_id}`
  return fetchAPI(url, requestOptions);
}
