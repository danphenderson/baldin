import { components } from '../schema';
import { createApiClient } from './api-client';

export type ActivityFeedItem = components['schemas']['ActivityFeedItem'];
export type ActivityFeedRead = components['schemas']['ActivityFeedRead'];
export type CommandCenterSummary = components['schemas']['CommandCenterSummary'];

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

export const getActivityFeed = async (
  token: string,
  params?: {
    page?: number;
    page_size?: number;
    since?: string;
    entity_type?: string;
  },
): Promise<ActivityFeedRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/activity-feed/', {
    params: {
      query: {
        page: params?.page,
        page_size: params?.page_size,
        since: params?.since,
        entity_type: params?.entity_type,
      },
    },
  }));
};

export const getCommandCenterSummary = async (
  token: string,
): Promise<CommandCenterSummary> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/activity-feed/summary'));
};
