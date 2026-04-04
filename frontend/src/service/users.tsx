// Path: frontend/src/service/users.tsx

import { components } from '../schema';
import { API_URL } from '../config/env';

export type UserRead = components['schemas']['UserRead'];
export type UserUpdate = components['schemas']['UserUpdate'];
export type UserProfile = components['schemas']['UserProfileRead'];

const BASE_URL = `${API_URL}/users/me`;

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

export const getUserProfile = async (token: string): Promise<UserProfile> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(`${BASE_URL}/profile`, requestOptions);
}

// super-user only
export const getUsers = async (token: string): Promise<UserRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(`${API_URL}/users`, requestOptions);
};

export const seedUsers = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return await fetchApi(`${API_URL}/users/seed`, requestOptions);
}
