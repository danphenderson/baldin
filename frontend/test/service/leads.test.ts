import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLeadComment,
  extractLead,
  LeadServiceError,
} from '@/service/leads';

describe('lead service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the extract endpoint and returns the collaboration disposition payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        lead: {
          id: 'lead-1',
          title: 'Senior Product Designer',
          description: 'Lead description',
          location: 'Remote',
          salary: null,
          job_function: 'Design',
          employment_type: 'Full-time',
          seniority_level: 'Senior',
          education_level: null,
          hiring_manager: null,
          created_at: '2026-04-05T12:00:00Z',
          updated_at: '2026-04-05T12:00:00Z',
          url: 'https://jobs.example.com/roles/123',
          canonical_url: 'https://jobs.example.com/roles/123',
          companies: [],
          interest_count: 3,
          comment_count: 4,
          viewer_is_registered: true,
          viewer_permissions: {
            can_register: false,
            can_leave_registration: true,
            can_update_registration: true,
            can_update_shared_fields: false,
            can_clear_or_overwrite_shared_fields: false,
            can_delete_shared_lead: false,
            can_view_comments: true,
            can_post_comments: true,
          },
        },
        disposition: 'matched_existing_joined',
        submitted_url: 'https://jobs.example.com/roles/123?ref=mail',
        normalized_url: 'https://jobs.example.com/roles/123',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await extractLead('token-123', 'https://jobs.example.com/roles/123?ref=mail');

    expect(result.disposition).toBe('matched_existing_joined');
    expect(result.normalized_url).toBe('https://jobs.example.com/roles/123');
    // openapi-fetch passes a Request object to fetch rather than (url, options)
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/leads/extract');
    expect(request.url).toContain('extraction_url=');
    expect(request.method).toBe('POST');
    expect(request.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('throws a LeadServiceError for non-422 collaboration failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Commenting is disabled for this lead.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(createLeadComment('token-123', 'lead-1', {
      content: 'Can anyone share recruiter timing?',
      anonymous: true,
    })).rejects.toMatchObject({
      name: 'LeadServiceError',
      status: 403,
      message: 'Commenting is disabled for this lead.',
    });
  });
});
