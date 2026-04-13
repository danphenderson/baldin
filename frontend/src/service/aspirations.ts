/**
 * Aspirations domain layer — types and transport-agnostic adapter.
 *
 * The `AspirationAdapter` interface is the contract boundary between UI
 * components and persistence.  The current implementation uses an in-memory
 * store so pages can be developed before backend routes exist.
 *
 * ## Swapping to the real API
 *
 * 1. Add backend aspiration routes and regenerate `openapi.json` / `schema.d.ts`.
 * 2. Implement `createApiAdapter(token)` in this file using the
 *    `createApiClient` + `unwrap` pattern from `./agents.ts`.
 * 3. Import generated types from `../schema.d.ts` and alias them here.
 * 4. In the page wrappers (`roles-page.tsx`, `companies-page.tsx`), replace
 *    `createInMemoryAdapter()` with `createApiAdapter(token)`.
 *    No other component changes are needed.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AspirationKind = 'role' | 'company';

export interface AspirationItem {
  id: string;
  kind: AspirationKind;
  label: string;
  notes?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export type AspirationCreate = Pick<AspirationItem, 'label' | 'notes' | 'reason'>;

export type AspirationUpdate = Partial<AspirationCreate>;

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
