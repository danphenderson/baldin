// Path: frontend/src/service/review.tsx

import { API_URL } from '../config/env';

const BASE_URL = `${API_URL}/review`;

const createRequestOptions = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) throw new Error('Authorization token is required');
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  };
};

const fetchAPI = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = 'API request failed';
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }
  if (response.status === 204 || response.status === 205) return null;
  return response.json();
};

export interface ReviewItem {
  item_type: 'crawler_run' | 'extraction_event' | 'lead';
  item_id: string;
  created_at: string;
  summary: string | null;
  detail: Record<string, unknown> | null;
}

export interface ReviewBatchItem {
  item_type: string;
  item_id: string;
  action: 'approve' | 'reject';
}

export interface ReviewBatchResponse {
  processed: number;
  errors: string[];
}

export const getReviewItems = async (
  token: string,
  itemType?: string,
  page = 1,
  pageSize = 20,
): Promise<ReviewItem[]> => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (itemType) params.set('item_type', itemType);
  return fetchAPI(`${BASE_URL}/items?${params}`, createRequestOptions(token, 'GET'));
};

export const approveReviewItem = async (
  token: string,
  itemType: string,
  itemId: string,
): Promise<{ message: string }> =>
  fetchAPI(`${BASE_URL}/items/${itemType}/${itemId}/approve`, createRequestOptions(token, 'POST'));

export const rejectReviewItem = async (
  token: string,
  itemType: string,
  itemId: string,
): Promise<{ message: string }> =>
  fetchAPI(`${BASE_URL}/items/${itemType}/${itemId}/reject`, createRequestOptions(token, 'POST'));

export const batchReviewItems = async (
  token: string,
  items: ReviewBatchItem[],
): Promise<ReviewBatchResponse> =>
  fetchAPI(`${BASE_URL}/items/batch`, createRequestOptions(token, 'POST', { items }));
