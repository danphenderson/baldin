import { components } from '../schema';
import { createApiClient } from './api-client';
import { FULL_LIST_PAGE_SIZE, normalizePaginatedResponse } from './pagination';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AspirationKind = components['schemas']['AspirationKind'];
export type AspirationItem = components['schemas']['AspirationSummaryRead'];
export type AspirationCreate = Omit<components['schemas']['AspirationCreate'], 'kind'>;
export interface AspirationUpdate {
  label?: string;
  reason?: string | null;
  notes?: string | null;
  priority?: number;
  extracted_attributes?: { [key: string]: unknown } | null;
}
type AspirationRead = components['schemas']['AspirationRead'];
type AspirationPage = components['schemas']['PaginatedResponse_AspirationSummaryRead_'];

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

const listAspirationsPage = async (
  token: string,
  kind: AspirationKind | undefined,
  page: number,
): Promise<ReturnType<typeof normalizePaginatedResponse<AspirationItem>>> => {
  const client = createApiClient(token);
  const response = unwrap<AspirationPage>(await client.GET('/api/v1/aspirations', {
    params: {
      query: {
        kind,
        page,
        page_size: FULL_LIST_PAGE_SIZE,
      },
    },
  }));
  return normalizePaginatedResponse(response, { page, page_size: FULL_LIST_PAGE_SIZE });
};

export const getAspirations = async (
  token: string,
  kind?: AspirationKind,
): Promise<AspirationItem[]> => {
  let page = 1;
  let total = 0;
  const items: AspirationItem[] = [];

  do {
    const nextPage = await listAspirationsPage(token, kind, page);
    total = nextPage.total;
    items.push(...nextPage.items);
    if (nextPage.items.length === 0) {
      break;
    }
    page += 1;
  } while (items.length < total);

  return items;
};

/* ------------------------------------------------------------------ */
/*  Adapter interface                                                  */
/* ------------------------------------------------------------------ */

export interface AspirationAdapter {
  list(kind: AspirationKind): Promise<AspirationItem[]>;
  create(kind: AspirationKind, data: AspirationCreate): Promise<AspirationItem>;
  update(id: string, data: AspirationUpdate): Promise<AspirationItem>;
  remove(id: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  API adapter                                                        */
/* ------------------------------------------------------------------ */

export function createApiAdapter(token: string): AspirationAdapter {
  return {
    async list(kind) {
      return getAspirations(token, kind);
    },

    async create(kind, data) {
      const client = createApiClient(token);
      return unwrap<AspirationRead>(await client.POST('/api/v1/aspirations', {
        body: { ...data, kind },
      }));
    },

    async update(id, data) {
      const client = createApiClient(token);
      return unwrap<AspirationRead>(await client.PATCH('/api/v1/aspirations/{id}', {
        params: { path: { id } },
        body: data,
      }));
    },

    async remove(id) {
      const client = createApiClient(token);
      unwrap(await client.DELETE('/api/v1/aspirations/{id}', {
        params: { path: { id } },
      }));
    },
  };
}

/* ------------------------------------------------------------------ */
/*  In-memory adapter                                                  */
/* ------------------------------------------------------------------ */

export function createInMemoryAdapter(): AspirationAdapter {
  const store = new Map<string, AspirationItem>();

  return {
    async list(kind) {
      return Array.from(store.values())
        .filter((item) => item.kind === kind)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async create(kind, data) {
      const now = new Date().toISOString();
      const item: AspirationItem = {
        id: crypto.randomUUID(),
        kind,
        label: data.label,
        notes: data.notes,
        reason: data.reason,
        created_at: now,
        updated_at: now,
      };
      store.set(item.id, item);
      return item;
    },

    async update(id, data) {
      const existing = store.get(id);
      if (!existing) throw new Error(`Aspiration ${id} not found`);
      const updated: AspirationItem = {
        ...existing,
        ...data,
        updated_at: new Date().toISOString(),
      };
      store.set(id, updated);
      return updated;
    },

    async remove(id) {
      if (!store.has(id)) throw new Error(`Aspiration ${id} not found`);
      store.delete(id);
    },
  };
}
