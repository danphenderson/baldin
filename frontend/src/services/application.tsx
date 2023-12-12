import { components } from "../schema";

type ApplicationEventRead = components['schemas'][''];

// TODO - pull this from the environment schema.d.ts
const BASE_URL = "/data_orchestration/events";
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};



const fetchAPI = async (url: string): Promise<ApplicationEventRead[]> => {
  const requestOptions = {
    method: "GET",
    headers: DEFAULT_HEADERS,
  };
  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error('API request failed');
  }
  const orchestrationData: ApplicationEventRead[] = await response.json();
  return orchestrationData;
};  n
