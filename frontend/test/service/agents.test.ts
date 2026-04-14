import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyAgentSurfaceRun,
  createAgentSurfaceRun,
  deleteAgent,
  dismissAgentSurfaceRun,
  getFilteredAgentRuns,
  getAgentRuns,
  getAgents,
  runAgent,
  updateAgent,
} from '@/service/agents';

describe('agents service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists agents across multiple pages with the generated kind filter', async () => {
    const firstPageItems = Array.from({ length: 100 }, (_, index) => ({
      id: `agent-${index + 1}`,
      created_at: '2026-04-11T12:00:00Z',
      updated_at: '2026-04-11T12:00:00Z',
      user_id: 'user-1',
      name: `Cover Letter Workspace ${index + 1}`,
      description: 'Builds a draft workspace',
      kind: 'cover_letter',
      is_enabled: true,
    }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: firstPageItems,
          total: 101,
          page: 1,
          page_size: 100,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            {
              id: 'agent-101',
              created_at: '2026-04-11T12:00:00Z',
              updated_at: '2026-04-11T12:00:00Z',
              user_id: 'user-1',
              name: 'Cover Letter Workspace 101',
              description: 'Builds a draft workspace',
              kind: 'cover_letter',
              is_enabled: true,
            },
          ],
          total: 101,
          page: 2,
          page_size: 100,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const result = await getAgents('token-123', { kind: 'cover_letter' });

    expect(result).toHaveLength(101);
    expect(result[0]?.kind).toBe('cover_letter');
    const firstRequest = fetchMock.mock.calls[0][0] as Request;
    const secondRequest = fetchMock.mock.calls[1][0] as Request;
    expect(firstRequest.url).toContain('/agents/');
    expect(firstRequest.url).toContain('kind=cover_letter');
    expect(firstRequest.url).toContain('page=1');
    expect(firstRequest.url).toContain('page_size=100');
    expect(firstRequest.method).toBe('GET');
    expect(firstRequest.headers.get('Authorization')).toBe('Bearer token-123');
    expect(secondRequest.url).toContain('page=2');
    expect(secondRequest.url).toContain('page_size=100');
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

  it('lists filtered surface runs with source and apply-state query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [],
        total: 0,
        page: 3,
        page_size: 10,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await getFilteredAgentRuns('token-123', {
      source_document_id: 'doc-1',
      source_field_key: 'cover_letter_notes',
      source_route: '/applications/app-1',
      source_anchor_id: 'block-7',
      apply_status: 'pending',
      page: 3,
      page_size: 10,
    });

    expect(result.page).toBe(3);
    expect(result.page_size).toBe(10);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/agents/runs');
    expect(request.url).toContain('source_document_id=doc-1');
    expect(request.url).toContain('source_field_key=cover_letter_notes');
    expect(request.url).toContain('source_route=%2Fapplications%2Fapp-1');
    expect(request.url).toContain('source_anchor_id=block-7');
    expect(request.url).toContain('apply_status=pending');
    expect(request.url).toContain('page=3');
    expect(request.url).toContain('page_size=10');
  });

  it('posts the surface-run lifecycle through create, apply, and dismiss routes', async () => {
    const runResponse = {
      id: 'run-7',
      created_at: '2026-04-11T12:05:00Z',
      updated_at: '2026-04-11T12:05:01Z',
      agent_id: 'agent-1',
      user_id: 'user-1',
      application_id: 'app-9',
      parent_run_id: null,
      trigger_kind: 'surface_mention',
      status: 'completed',
      source_surface_kind: 'multiline_text_field',
      source_document_id: null,
      source_field_key: 'cover_letter_notes',
      source_route: '/applications/app-9',
      source_anchor_id: 'anchor-1',
      apply_status: 'pending',
      applied_at: null,
      suggested_edit: {
        operation: 'append_to_surface',
        content_format: 'plain_text',
        content: 'Updated text',
        summary: 'Adds a stronger closing.',
      },
      session_document_id: null,
      session_version_id: null,
      session_document: null,
      session_version: null,
      error_summary: null,
      completed_at: '2026-04-11T12:05:01Z',
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(runResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ...runResponse,
        apply_status: 'applied',
        applied_at: '2026-04-11T12:05:15Z',
        session_document_id: 'doc-2',
        session_version_id: 'ver-4',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ...runResponse,
        apply_status: 'dismissed',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    vi.stubGlobal('fetch', fetchMock);

    const createdRun = await createAgentSurfaceRun('token-123', 'agent-1', {
      surface_kind: 'multiline_text_field',
      source_route: '/applications/app-9',
      source_field_key: 'cover_letter_notes',
      anchor_id: 'anchor-1',
      content_format: 'plain_text',
      surface_content: 'Original text',
      prompt_text: 'Strengthen the closing paragraph.',
      requested_apply_mode: 'append_to_surface',
    });
    expect(createdRun.id).toBe('run-7');

    const createRequest = fetchMock.mock.calls[0][0] as Request;
    expect(createRequest.url).toContain('/agents/agent-1/surface-runs');
    expect(createRequest.method).toBe('POST');
    expect(await createRequest.json()).toEqual(expect.objectContaining({
      source_field_key: 'cover_letter_notes',
      prompt_text: 'Strengthen the closing paragraph.',
    }));

    const appliedRun = await applyAgentSurfaceRun('token-123', 'run-7', {
      session_document_id: 'doc-2',
      session_version_id: 'ver-4',
    });
    expect(appliedRun.apply_status).toBe('applied');

    const applyRequest = fetchMock.mock.calls[1][0] as Request;
    expect(applyRequest.url).toContain('/agents/runs/run-7/apply');
    expect(applyRequest.method).toBe('POST');
    expect(await applyRequest.json()).toEqual({
      session_document_id: 'doc-2',
      session_version_id: 'ver-4',
    });

    const dismissedRun = await dismissAgentSurfaceRun('token-123', 'run-7');
    expect(dismissedRun.apply_status).toBe('dismissed');

    const dismissRequest = fetchMock.mock.calls[2][0] as Request;
    expect(dismissRequest.url).toContain('/agents/runs/run-7/dismiss');
    expect(dismissRequest.method).toBe('POST');
  });
});
