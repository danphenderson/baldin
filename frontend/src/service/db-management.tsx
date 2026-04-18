// Path: frontend/src/service/db-management.tsx

import { components } from '../schema';
import { normalizePaginatedResponse, type PaginatedResponse } from './pagination';
import { createApiClient } from './api-client';

export type DbManagementPurgeDomain = components['schemas']['DbManagementPurgeDomain'];
export type DbManagementStatusRead = components['schemas']['DbManagementStatusRead'];
export type DbManagementTableSummaryRead = components['schemas']['DbManagementTableSummaryRead'];
export type DbManagementTableDetailRead = components['schemas']['DbManagementTableDetailRead'];
export type DbManagementUserSummaryRead = components['schemas']['DbManagementUserSummaryRead'];
export type UserDataOperationPreview = components['schemas']['UserDataOperationPreview'];
export type UserDataOperationResult = components['schemas']['UserDataOperationResult'];
type RawDbManagementUsersPage = components['schemas']['PaginatedResponse_DbManagementUserSummaryRead_'];
export type DbManagementUsersPage = PaginatedResponse<DbManagementUserSummaryRead>;

export const DB_MANAGEMENT_PURGE_DOMAINS: DbManagementPurgeDomain[] = [
  'profile',
  'leads',
  'applications',
  'documents',
  'agents',
  'extractors',
  'orchestration',
];

export interface DbManagementUsersQueryParams {
  q?: string;
  is_superuser?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  request_count?: boolean;
}

type DbManagementErrorDetail = unknown;

export class DbManagementServiceError extends Error {
  status: number;

  detail: DbManagementErrorDetail;

  constructor(message: string, status: number, detail: DbManagementErrorDetail) {
    super(message);
    this.name = 'DbManagementServiceError';
    this.status = status;
    this.detail = detail;
  }
}

export const isDbManagementServiceError = (error: unknown): error is DbManagementServiceError => (
  error instanceof DbManagementServiceError
);

const stringifyDetail = (detail: unknown, fallback: string): string => {
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => stringifyDetail(item, fallback))
      .filter(Boolean)
      .join(' ');
  }

  if (detail && typeof detail === 'object') {
    const maybeMessage = (detail as { message?: unknown; detail?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }

    const nestedDetail = (detail as { detail?: unknown }).detail;
    if (nestedDetail !== undefined) {
      return stringifyDetail(nestedDetail, fallback);
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const toDbManagementServiceError = (
  status: number,
  detail: unknown,
): DbManagementServiceError => {
  const fallback = status === 403
    ? 'You do not have permission to manage the database.'
    : status === 404
      ? 'That database management resource could not be found.'
      : status === 409
        ? 'That database management action is blocked by a safeguard.'
        : 'Database management request failed.';

  return new DbManagementServiceError(stringifyDetail(detail, fallback), status, detail);
};

const unwrap = <T,>(
  result: { data?: T; error?: unknown; response: Response },
): T => {
  if (result.error !== undefined) {
    throw toDbManagementServiceError(result.response.status, result.error);
  }
  return result.data as T;
};

export const getDbManagementStatus = async (
  token: string,
): Promise<DbManagementStatusRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/db-management/status'));
};

export const getDbManagementTables = async (
  token: string,
): Promise<DbManagementTableSummaryRead[]> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/db-management/tables'));
};

export const getDbManagementTable = async (
  token: string,
  tableName: string,
): Promise<DbManagementTableDetailRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/db-management/tables/{table_name}', {
    params: { path: { table_name: tableName } },
  }));
};

export const getDbManagementUsers = async (
  token: string,
  params: DbManagementUsersQueryParams = {},
): Promise<DbManagementUsersPage> => {
  const client = createApiClient(token);
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 20;
  const response = unwrap<RawDbManagementUsersPage>(await client.GET('/api/v1/db-management/users', {
    params: {
      query: {
        q: params.q,
        is_superuser: params.is_superuser,
        is_active: params.is_active,
        page,
        page_size: pageSize,
        request_count: params.request_count,
      },
    },
  }));

  return normalizePaginatedResponse(response, {
    page,
    page_size: pageSize,
  });
};

export const previewUserCleanup = async (
  token: string,
  userId: string,
  domains?: DbManagementPurgeDomain[],
): Promise<UserDataOperationPreview> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/db-management/users/{user_id}/cleanup-preview', {
    params: {
      path: { user_id: userId },
      query: {
        domains: domains?.length ? domains : undefined,
      },
    },
  }));
};

export const purgeUserData = async (
  token: string,
  userId: string,
  domains?: DbManagementPurgeDomain[],
): Promise<UserDataOperationResult> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/db-management/users/{user_id}/purge', {
    params: {
      path: { user_id: userId },
      query: {
        domains: domains?.length ? domains : undefined,
      },
    },
  }));
};

export const deleteUser = async (
  token: string,
  userId: string,
): Promise<UserDataOperationResult> => {
  const client = createApiClient(token);
  return unwrap(await client.DELETE('/api/v1/db-management/users/{user_id}', {
    params: { path: { user_id: userId } },
  }));
};
