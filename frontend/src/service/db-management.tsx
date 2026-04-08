// Path: frontend/src/service/db-management.tsx

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

export const listTables = async (token: string): Promise<string[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/db-management/list-tables'));
};

export const tableDetails = async (token: string, tableName: string): Promise<unknown> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/db-management/table-details/{table_name}', {
    params: { path: { table_name: tableName } },
  }));
};
