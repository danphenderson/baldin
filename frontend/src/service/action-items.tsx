import { components } from '../schema';
import { createApiClient } from './api-client';

export type ActionItemRead = components['schemas']['ActionItemRead'];
export type ActionItemDetailRead = components['schemas']['ActionItemDetailRead'];
export type ActionItemCreate = components['schemas']['ActionItemCreate'];
export type ActionItemUpdate = components['schemas']['ActionItemUpdate'];
type ActionItemStatus = components['schemas']['ActionItemStatus'];
type ActionItemKind = components['schemas']['ActionItemKind'];
type ActionItemPriority = components['schemas']['ActionItemPriority'];

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

export const getActionItems = async (
  token: string,
  params?: {
    status?: ActionItemStatus;
    kind?: ActionItemKind;
    priority?: ActionItemPriority;
    due_before?: string;
    due_after?: string;
    page?: number;
    page_size?: number;
    request_count?: boolean;
  },
): Promise<ActionItemDetailRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/action-items/', {
    params: {
      query: {
        status: params?.status,
        kind: params?.kind,
        priority: params?.priority,
        due_before: params?.due_before,
        due_after: params?.due_after,
        page: params?.page,
        page_size: params?.page_size,
        request_count: params?.request_count,
      },
    },
  }));
};

export const createActionItem = async (
  token: string,
  payload: ActionItemCreate,
): Promise<ActionItemRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/action-items/', {
    body: payload,
  }));
};

export const getActionItem = async (
  token: string,
  id: string,
): Promise<ActionItemDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/action-items/{id}', {
    params: { path: { id } },
  }));
};

export const updateActionItem = async (
  token: string,
  id: string,
  payload: ActionItemUpdate,
): Promise<ActionItemRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/action-items/{id}', {
    params: { path: { id } },
    body: payload,
  }));
};

export const deleteActionItem = async (
  token: string,
  id: string,
): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/action-items/{id}', {
    params: { path: { id } },
  }));
};

export const reorderActionItems = async (
  token: string,
  itemIds: string[],
): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.POST('/api/v1/action-items/reorder', {
    body: { item_ids: itemIds },
  }));
};

export const createActionItemFromApplication = async (
  token: string,
  applicationId: string,
): Promise<ActionItemRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/action-items/from-application/{application_id}', {
    params: { path: { application_id: applicationId } },
  }));
};
