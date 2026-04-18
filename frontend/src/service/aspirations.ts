import { components } from '../schema';
import { createApiClient } from './api-client';
import { fetchAllPages, FULL_LIST_PAGE_SIZE, normalizePaginatedResponse } from './pagination';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AspirationKind = components['schemas']['AspirationKind'];
export type AspirationItem = components['schemas']['AspirationSummaryRead'];
export type AspirationSuggestionDraft = components['schemas']['AspirationSuggestionDraft'];
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
type AspirationSuggestResponse = components['schemas']['AspirationSuggestResponse'];

/* ------------------------------------------------------------------ */
/*  Error categories (D8)                                              */
/* ------------------------------------------------------------------ */

export type SuggestErrorCategory =
  | 'no_signal'
  | 'rate_limited'
  | 'ai_disabled'
  | 'duplicate'
  | 'network'
  | 'unknown';

export class AspirationServiceError extends Error {
  category: SuggestErrorCategory;

  constructor(category: SuggestErrorCategory, message: string) {
    super(message);
    this.name = 'AspirationServiceError';
    this.category = category;
  }
}

const NO_SIGNAL_PATTERNS = [
  'no usable',
  'insufficient profile',
  'not enough profile',
];

function classifySuggestError(status: number, detail: string): SuggestErrorCategory {
  if (status === 400) {
    const lower = detail.toLowerCase();
    if (NO_SIGNAL_PATTERNS.some((p) => lower.includes(p))) {
      return 'no_signal';
    }
    return 'unknown';
  }
  if (status === 409) return 'duplicate';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'ai_disabled';
  if (status >= 500) return 'unknown';
  return 'unknown';
}

function classifyCreateError(status: number): SuggestErrorCategory {
  if (status === 409) return 'duplicate';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'ai_disabled';
  if (status >= 500) return 'unknown';
  return 'unknown';
}

/* ------------------------------------------------------------------ */
/*  Unwrap helpers                                                     */
/* ------------------------------------------------------------------ */

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

function getDetailString(error: unknown): string {
  const detail = (error as { detail?: unknown })?.detail;
  if (typeof detail === 'string') return detail;
  if (detail) return JSON.stringify(detail);
  return 'API request failed';
}

function unwrapSuggest<T>(
  result: { data?: T; error?: unknown; response: Response },
): T {
  if (result.error !== undefined) {
    const message = getDetailString(result.error);
    const category = classifySuggestError(result.response.status, message);
    throw new AspirationServiceError(category, message);
  }
  return result.data as T;
}

function unwrapCreate<T>(
  result: { data?: T; error?: unknown; response: Response },
): T {
  if (result.error !== undefined) {
    const message = getDetailString(result.error);
    const category = classifyCreateError(result.response.status);
    throw new AspirationServiceError(category, message);
  }
  return result.data as T;
}

const listAspirationsPage = async (
  token: string,
  kind: AspirationKind | undefined,
  page: number,
): Promise<ReturnType<typeof normalizePaginatedResponse<AspirationItem>>> => {
  const client = createApiClient(token);
  const response = unwrap<AspirationPage>(await client.GET('/api/v1/aspirations/', {
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
  return fetchAllPages<AspirationItem>(
    (page) => listAspirationsPage(token, kind, page),
    FULL_LIST_PAGE_SIZE,
  );
};

export const getAspirationSuggestions = async (token: string): Promise<AspirationSuggestionDraft[]> => {
  const client = createApiClient(token);
  let result;
  try {
    result = await client.POST('/api/v1/aspirations/suggest');
  } catch {
    throw new AspirationServiceError('network', 'Unable to reach the server. Check your connection and try again.');
  }
  const response = unwrapSuggest<AspirationSuggestResponse>(result);
  return response.suggestions ?? [];
};

/* ------------------------------------------------------------------ */
/*  Adapter interface                                                  */
/* ------------------------------------------------------------------ */

export interface AspirationAdapter {
  list(kind: AspirationKind): Promise<AspirationItem[]>;
  suggest(kind: AspirationKind): Promise<AspirationSuggestionDraft[]>;
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

    async suggest(kind) {
      const suggestions = await getAspirationSuggestions(token);
      return suggestions.filter((suggestion) => suggestion.kind === kind);
    },

    async create(kind, data) {
      const client = createApiClient(token);
      let result;
      try {
        result = await client.POST('/api/v1/aspirations/', {
          body: { ...data, kind },
        });
      } catch {
        throw new AspirationServiceError('network', 'Unable to reach the server. Check your connection and try again.');
      }
      return unwrapCreate<AspirationRead>(result);
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

interface CreateInMemoryAdapterOptions {
  suggestions?: AspirationSuggestionDraft[];
}

export function createInMemoryAdapter(options: CreateInMemoryAdapterOptions = {}): AspirationAdapter {
  const store = new Map<string, AspirationItem>();
  const suggestions = options.suggestions ?? [];

  return {
    async list(kind) {
      return Array.from(store.values())
        .filter((item) => item.kind === kind)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async suggest(kind) {
      return suggestions.filter((suggestion) => suggestion.kind === kind);
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
