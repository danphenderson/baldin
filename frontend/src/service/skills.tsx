// Path: frontend/src/service/skills.tsx

import { components } from "../schema";

export type SkillRead = components['schemas']['SkillRead'];
export type SkillCreate = components['schemas']['SkillCreate'];
export type SkillUpdate = components['schemas']['SkillUpdate'];

type ExtractorRun = components['schemas']['ExtractorRun'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/skills/';


const createRequestOptions = (token: string, method: string, body?: any, isFormData?: boolean): RequestInit => {
  if (!token) {
    console.log("Authorization token is required")
    throw new Error("Authorization token is required");
  }
  let headers = new Headers({
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  });

  if (isFormData) {
    // For file uploads, let the browser set 'Content-Type' to 'multipart/form-data' with the correct boundary.
    // Also, the body should be a FormData object & not a JSON string.
    const formData = new FormData();
    headers.delete("Content-Type");
    if (body) {
      for (const [key, value] of Object.entries(body)) {
        formData.append(key, value as string);
      }
    }
    return {
      method: method,
      headers: headers,
      body: formData,
    };
  } else {
    return {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : null,
    };
  }
};


const fetchAPI = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    // Custom error handling can be implemented here
    throw new Error('API request failed');
  }
  return response.json();
};

export const getSkills = async (token: string): Promise<SkillRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}`, requestOptions);
};


export const getSkill = async (token: string, id: string): Promise<SkillRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
};

export const createSkill = async (token: string, skill: SkillCreate): Promise<SkillRead> => {
  const requestOptions = createRequestOptions(token, "POST", skill);
  return fetchAPI(BASE_URL, requestOptions);
}

export const updateSkill = async (token: string, id: string, skill: SkillUpdate): Promise<SkillRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", skill);
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const deleteSkill = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const extractSkill = async (token: string, data: ExtractorRun): Promise<ExtractorRun> => {
  const requestOptions = createRequestOptions(token, "POST", data, true);
  return fetchAPI(`${BASE_URL}extract`, requestOptions);
}
