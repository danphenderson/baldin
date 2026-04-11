import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteAgent,
  getAgentRuns,
  getAgents,
  runAgent,
  updateAgent,
} from './agents';

describe('agents service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists agents with the generated kind filter and full-list pagination defaults', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [
          {
            id: 'agent-1',
            created_at: '2026-04-11T12:00:00Z',
            updated_at: '2026-04-11T12:00:00Z',
            user_id: 'user-1',
            name: 'Cover Letter Workspace',
            description: 'Builds a draft workspace',
            kind: 'cover_letter',
            is_enabled: true,
          },
        ],
        total: 1,
        page: 1,
        page_size: 500,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await getAgents('token-123', { kind: 'cover_letter' });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe('cover_letter');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/agents/');
    expect(request.url).toContain('kind=cover_letter');
    expect(request.url).toContain('page=1');
    expect(request.url).toContain('page_size=500');
    expect(request.method).toBe('GET');
    expect(request.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('returns normalized run-history pagination with session metadata intact', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [
          {
            id: 'run-1',
            created_at: '2026-04-11T12:00:00Z',
            updated_at: '2026-04-11T12:00:01Z',
            agent_id: 'agent-1',
            user_id: 'user-1',
            application_id: 'app-1',
            parent_run_id: null,
            trigger_kind: 'manual',
            status: 'completed',
            session_document_id: 'doc-1',
            session_version_id: 'ver-3',
            session_document: {
              id: 'doc-1',
              title: 'Acme cover letter workspace',
              kind: 'cell_doc',
              status: 'active',
            },
            session_version: {
              id: 'ver-3',
              created_at: '2026-04-11T12:00:01Z',
              updated_at: '2026-04-11T12:00:01Z',
              version_number: 3,
              name: 'Agent rerun',
              content_format: 'tiptap_json',
            },
            error_summary: null,
            completed_at: '2026-04-11T12:00:01Z',
          },
        ],
        total: 7,
        page: 2,
        page_size: 5,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await getAgentRuns('token-123', 'agent-1', { page: 2, page_size: 5 });

    expect(result.total).toBe(7);
    expect(result.page).toBe(2);
    expect(result.page_size).toBe(5);
    expect(result.items[0]?.session_document_id).toBe('doc-1');
    expect(result.items[0]?.session_version_id).toBe('ver-3');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/agents/agent-1/runs');
    expect(request.url).toContain('page=2');
    expect(request.url).toContain('page_size=5');
    expect(request.method).toBe('GET');
  });

  it('posts agent execution with application and session ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'run-2',
        created_at: '2026-04-11T12:05:00Z',
        updated_at: '2026-04-11T12:05:01Z',
        agent_id: 'agent-1',
        user_id: 'user-1',
        application_id: 'app-9',
        parent_run_id: 'run-1',
        trigger_kind: 'manual',
        status: 'completed',
        session_document_id: 'doc-4',
        session_version_id: 'ver-8',
        session_document: {
          id: 'doc-4',
          title: 'Acme rerun workspace',
          kind: 'cell_doc',
          status: 'active',
        },
        session_version: {
          id: 'ver-8',
          created_at: '2026-04-11T12:05:01Z',
          updated_at: '2026-04-11T12:05:01Z',
          version_number: 8,
          name: 'Rerun',
          content_format: 'tiptap_json',
        },
        error_summary: null,
        completed_at: '2026-04-11T12:05:01Z',
        input_context: {
          application_id: 'app-9',
        },
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await runAgent('token-123', 'agent-1', {
      application_id: 'app-9',
      session_document_id: 'doc-4',
    });

    expect(result.session_document_id).toBe('doc-4');
    expect(result.session_version_id).toBe('ver-8');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/agents/agent-1/run');
    expect(request.method).toBe('POST');
    expect(request.headers.get('Authorization')).toBe('Bearer token-123');
    expect(await request.json()).toEqual({
      application_id: 'app-9',
      session_document_id: 'doc-4',
    });
  });

  it('patches agent state updates through the generated update payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'agent-1',
        created_at: '2026-04-11T12:00:00Z',
        updated_at: '2026-04-11T12:08:00Z',
        user_id: 'user-1',
        name: 'Cover Letter Workspace',
        description: 'Builds a draft workspace',
        kind: 'cover_letter',
        is_enabled: false,
        instructions: 'Focus on concise positioning.',
        configuration: {},
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await updateAgent('token-123', 'agent-1', { is_enabled: false });

    expect(result.is_enabled).toBe(false);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/agents/agent-1');
    expect(request.method).toBe('PATCH');
    expect(await request.json()).toEqual({ is_enabled: false });
  });

  it('resolves 204 deletes and surfaces API detail on failure', async () => {
    const deleteFetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    vi.stubGlobal('fetch', deleteFetch);

    await expect(deleteAgent('token-123', 'agent-1')).resolves.toBeUndefined();
    const deleteRequest = deleteFetch.mock.calls[0][0] as Request;
    expect(deleteRequest.url).toContain('/agents/agent-1');
    expect(deleteRequest.method).toBe('DELETE');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Agent is still referenced by session history.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(deleteAgent('token-123', 'agent-1')).rejects.toThrow('Agent is still referenced by session history.');
  });
});
