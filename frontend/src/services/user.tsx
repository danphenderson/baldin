import { components } from '../schema.d';

export type UserRead = components['schemas']['UserRead'];
export type UserUpdate = components['schemas']['UserUpdate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = "/users/me";

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

const fetchApi = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    // Custom error handling can be implemented here
    throw new Error('API request failed');
  }
  return response.json();
};

export const getUser = async (token: string): Promise<UserRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(BASE_URL, requestOptions);
};

export const updateUser = async (token: string, user: UserUpdate): Promise<UserRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", user);
  return await fetchApi(BASE_URL, requestOptions);
};
