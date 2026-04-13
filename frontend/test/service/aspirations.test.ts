import { describe, expect, it } from 'vitest';
import { createInMemoryAdapter } from '@/service/aspirations';
import type { AspirationAdapter } from '@/service/aspirations';

describe('createInMemoryAdapter', () => {
  let adapter: AspirationAdapter;

  const setup = () => {
    adapter = createInMemoryAdapter();
  };

  it('returns an empty list for a kind with no items', async () => {
    setup();
    const result = await adapter.list('role');
    expect(result).toEqual([]);
  });

  it('creates items and lists them by kind', async () => {
    setup();
    await adapter.create('role', { label: 'Frontend Engineer' });
    await adapter.create('company', { label: 'Acme Corp' });
    await adapter.create('role', { label: 'Staff Engineer', reason: 'Growth path' });

    const roles = await adapter.list('role');
    expect(roles).toHaveLength(2);
    expect(roles.map((r) => r.label)).toContain('Frontend Engineer');
    expect(roles.map((r) => r.label)).toContain('Staff Engineer');

    const companies = await adapter.list('company');
    expect(companies).toHaveLength(1);
    expect(companies[0]?.label).toBe('Acme Corp');
  });

  it('assigns unique IDs and timestamps on create', async () => {
    setup();
    const a = await adapter.create('role', { label: 'A' });
    const b = await adapter.create('role', { label: 'B' });

    expect(a.id).not.toBe(b.id);
    expect(a.created_at).toBeDefined();
    expect(a.updated_at).toBeDefined();
    expect(a.kind).toBe('role');
  });

  it('preserves optional fields on create', async () => {
    setup();
    const item = await adapter.create('company', {
      label: 'Widgets Inc',
      reason: 'Great culture',
      notes: 'Applied before',
    });

    expect(item.reason).toBe('Great culture');
    expect(item.notes).toBe('Applied before');
  });

  it('updates an existing item', async () => {
    setup();
    const created = await adapter.create('role', { label: 'Engineer' });
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 5));
    const updated = await adapter.update(created.id, { label: 'Senior Engineer', reason: 'Promotion target' });

    expect(updated.id).toBe(created.id);
    expect(updated.label).toBe('Senior Engineer');
    expect(updated.reason).toBe('Promotion target');
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updated_at).getTime(),
    );
  });

  it('throws on update for a non-existent ID', async () => {
    setup();
    await expect(adapter.update('non-existent', { label: 'Foo' })).rejects.toThrow('not found');
  });

  it('removes an existing item', async () => {
    setup();
    const created = await adapter.create('role', { label: 'To Delete' });
    await adapter.remove(created.id);
    const roles = await adapter.list('role');
    expect(roles).toHaveLength(0);
  });

  it('throws on remove for a non-existent ID', async () => {
    setup();
    await expect(adapter.remove('non-existent')).rejects.toThrow('not found');
  });

  it('returns items sorted newest-first', async () => {
    setup();
    const first = await adapter.create('role', { label: 'First' });
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 5));
    const second = await adapter.create('role', { label: 'Second' });

    const roles = await adapter.list('role');
    expect(roles[0]?.label).toBe('Second');
    expect(roles[1]?.label).toBe('First');
  });
});
