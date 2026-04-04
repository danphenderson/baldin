import { components } from '../schema';
import { API_URL } from '../config/env';

export type AutomationTaskRead = {
  id: string;
  created_at?: string;
  updated_at?: string;
  status?: string | null;
  task_type?: string | null;
  [key: string]: unknown;
};

export type LeadDiscoveryTaskCreate = Record<string, unknown>;
export type LeadEnrichmentTaskCreate = Record<string, unknown>;
export type LinkedInEasyApplyTaskCreate = Record<string, unknown>;

const BASE_URL = `${API_URL}/automation_tasks`;

const createRequestOptions = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) {
    throw new Error('Authorization token is required');
  }

  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  };
};

const fetchAPI = async <T,>(url: string, options: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = 'API request failed';
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
    return null as T;
  }

  return response.json() as Promise<T>;
};

export const getAutomationTasks = async (
  token: string,
  params?: { status?: string; task_type?: string; limit?: number },
): Promise<AutomationTaskRead[]> => {
  const requestOptions = createRequestOptions(token, 'GET');
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.task_type) query.set('task_type', params.task_type);
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return fetchAPI<AutomationTaskRead[]>(`${BASE_URL}${suffix}`, requestOptions);
};

export const getAutomationTask = async (token: string, id: string): Promise<AutomationTaskRead> => {
  const requestOptions = createRequestOptions(token, 'GET');
  return fetchAPI<AutomationTaskRead>(`${BASE_URL}/${id}`, requestOptions);
};

export const createLeadDiscoveryTask = async (
  token: string,
  payload: LeadDiscoveryTaskCreate,
): Promise<AutomationTaskRead> => {
  const requestOptions = createRequestOptions(token, 'POST', payload);
  return fetchAPI<AutomationTaskRead>(`${BASE_URL}/discover`, requestOptions);
};

export const createLeadEnrichmentTask = async (
  token: string,
  payload: LeadEnrichmentTaskCreate,
): Promise<AutomationTaskRead> => {
  const requestOptions = createRequestOptions(token, 'POST', payload);
  return fetchAPI<AutomationTaskRead>(`${BASE_URL}/enrich`, requestOptions);
};

export const createLinkedInEasyApplyTask = async (
  token: string,
  payload: LinkedInEasyApplyTaskCreate,
): Promise<AutomationTaskRead> => {
  const requestOptions = createRequestOptions(token, 'POST', payload);
  return fetchAPI<AutomationTaskRead>(`${BASE_URL}/linkedin-easy-apply`, requestOptions);
};
