// Path: frontend/src/service/db-management.tsx

import { components } from '../schema';



// TODO - pull this from the environment schema.d.ts
const BASE_URL = `${process.env.REACT_APP_API_URL}/db-management`;

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

export const listTables = async (token: string): Promise<string[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(`${BASE_URL}/list-tables`, requestOptions);
}

export const tableDetails = async (token: string, tableName: string): Promise<any> => {
  const requestOptions = createRequestOptions(token, "GET");
  return await fetchApi(`${BASE_URL}/table-details/${tableName}`, requestOptions);
}
