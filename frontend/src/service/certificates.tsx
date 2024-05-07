// Path: frontend/src/service/certificates.tsx

import { components } from "../schema";

export type CertificateRead = components['schemas']['CertificateRead'];
export type CertificateCreate = components['schemas']['CertificateCreate'];
export type CertificateUpdate = components['schemas']['CertificateUpdate'];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = `${process.env.REACT_APP_API_URL}/certificate/`;

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

export const getCertificates = async (token: string): Promise<CertificateRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}`, requestOptions);
};

export const getCertificate = async (token: string, id: string): Promise<CertificateRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const createCertificate = async (token: string, certificate: CertificateCreate): Promise<CertificateRead> => {
  const requestOptions = createRequestOptions(token, "POST", certificate);
  return fetchAPI(BASE_URL, requestOptions);
}

export const updateCertificate = async (token: string, id: string, certificate: CertificateUpdate): Promise<CertificateRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", certificate);
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const deleteCertificate = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}${id}`, requestOptions);
}

export const seedCertificates = async (token: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "POST");
  return fetchAPI(`${BASE_URL}seed`, requestOptions);
}
