// Path: frontend/src/service/review.tsx

import { components } from '../schema';
import { createApiClient } from './api-client';

const unwrap = <T,>(
  result: { data?: T; error?: unknown; response: Response },
): T => {
  if (result.error !== undefined) {
    const detail = result.error as { detail?: unknown };
    let message = 'API request failed';
    if (detail?.detail) {
      message = typeof detail.detail === 'string' ? detail.detail : JSON.stringify(detail.detail);
    }
    throw new Error(message);
  }
  return result.data as T;
};

export type ReviewItemType = components['schemas']['ReviewItemType'];

export type ReviewItem = components['schemas']['ReviewItemRead'];

export interface ReviewBatchItem {
  item_type: ReviewItemType;
  item_id: string;
  action: 'approve' | 'reject';
}

export interface ReviewBatchResponse {
  processed: number;
  errors?: string[];
}

export const getReviewItems = async (
  token: string,
  itemType?: ReviewItemType,
  page = 1,
  pageSize = 20,
): Promise<ReviewItem[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/review/items', {
    params: {
      query: {
        item_type: itemType,
        page,
        page_size: pageSize,
      },
    },
  }));
};

export const approveReviewItem = async (
  token: string,
  itemType: ReviewItemType,
  itemId: string,
): Promise<{ message: string }> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/review/items/{item_type}/{item_id}/approve', {
    params: { path: { item_type: itemType, item_id: itemId } },
  })) as { message: string };
};

export const rejectReviewItem = async (
  token: string,
  itemType: ReviewItemType,
  itemId: string,
): Promise<{ message: string }> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/review/items/{item_type}/{item_id}/reject', {
    params: { path: { item_type: itemType, item_id: itemId } },
  })) as { message: string };
};

export const batchReviewItems = async (
  token: string,
  items: ReviewBatchItem[],
): Promise<ReviewBatchResponse> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/review/items/batch', {
    body: { items },
  }));
};
