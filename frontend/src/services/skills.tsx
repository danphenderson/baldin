import { components } from "../schema.d";

export type SkillRead = components['schemas']['SkillRead'];
export type SkillCreate = components['schemas']['SkillCreate'];
export type SkillUpdate = components['schemas']['SkillUpdate'];


// TODO - pull this from the environment schema.d.ts
const BASE_URL = '/skills/';


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
