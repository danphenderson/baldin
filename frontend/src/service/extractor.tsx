// Path: frontend/src/service/extractor.tsx

import { components } from "../schema";

export type ExtractorResponse = components['schemas']['ExtractorResponse'];
export type ExtractorRun = components['schemas']['ExtractorRun'];
export type ExtractorRead = components['schemas']['ExtractorRead'];
export type ExtractorCreate = components['schemas']['ExtractorCreate'];
export type ExtractorUpdate = components['schemas']['ExtractorUpdate'];
export type ExtractorExmpleCreate = components['schemas']['ExtractorExampleCreate'];
export type ExtractorExampleRead = components['schemas']['ExtractorExampleRead'];

const BASE_URL = `${process.env.REACT_APP_API_URL}/extractor`;


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
    throw new Error(`API request failed for ${url} using options ${JSON.stringify(options)}: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const getExtractors = async (token: string): Promise<ExtractorRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/`, requestOptions);
};

export const getExtractor = async (token: string, id: string): Promise<ExtractorRead> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};


export const createExtractor = async (token: string, extractor: ExtractorCreate): Promise<ExtractorRead> => {
  const requestOptions = createRequestOptions(token, "POST", extractor);
  return fetchAPI(BASE_URL, requestOptions);
};


export const updateExtractor = async (token: string, id: string, extractor: ExtractorUpdate): Promise<ExtractorRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", extractor);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const deleteExtractor = async (token: string, id: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const getExtractorExamples = async (token: string, id: string): Promise<ExtractorExampleRead[]> => {
  const requestOptions = createRequestOptions(token, "GET");
  return fetchAPI(`${BASE_URL}/${id}/examples`, requestOptions);
}


export const createExtractorExample = async (token: string, id: string, example: ExtractorExmpleCreate): Promise<ExtractorExampleRead> => {
  const requestOptions = createRequestOptions(token, "POST", example);
  return fetchAPI(`${BASE_URL}/${id}/examples`, requestOptions);
};

export const deleteExtractorExample = async (token: string, id: string, exampleId: string): Promise<void> => {
  const requestOptions = createRequestOptions(token, "DELETE");
  return fetchAPI(`${BASE_URL}/${id}/examples/${exampleId}`, requestOptions);
};

export const updateExtractorExample = async (token: string, id: string, exampleId: string, example: ExtractorExmpleCreate): Promise<ExtractorExampleRead> => {
  const requestOptions = createRequestOptions(token, "PATCH", example);
  return fetchAPI(`${BASE_URL}/${id}/examples/${exampleId}`, requestOptions);
};

export const runExtractor = async (token: string, id: string, runner: ExtractorRun): Promise<ExtractorResponse> => {
  // Check if there is a file in the runner object to decide on form data or JSON
  const isFileUpload = runner.file ? true : false;
  const requestOptions = createRequestOptions(token, "POST", runner, isFileUpload);
  return fetchAPI(`${BASE_URL}/${id}/run`, requestOptions);
};
