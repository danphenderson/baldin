import { expect, test, type Page, type Route } from '@playwright/test';

const mockUser = {
  id: 'user-1',
  email: 'qa@baldin.test',
  first_name: 'QA',
  last_name: 'User',
  is_active: true,
  is_superuser: false,
  is_verified: true,
  subscription_tier: 'pro',
  subscription_expires_at: null,
  created_at: '2026-04-12T00:00:00Z',
  updated_at: '2026-04-12T00:00:00Z',
};

const mockApplication = {
  id: 'app-1',
  lead_id: 'lead-1',
  status: 'applied',
  stage: 'applied',
  outcome: null,
  created_at: '2026-04-12T00:00:00Z',
  updated_at: '2026-04-12T00:00:00Z',
  next_step: null,
  next_step_due: null,
  document_metadata: {
    total_count: 2,
    has_resume: true,
    has_cover_letter: true,
    kinds: ['resume', 'cover_letter'],
  },
  lead: {
    id: 'lead-1',
    title: 'Senior Frontend Engineer',
    location: 'Remote, US',
    salary: '$150k',
    companies: [{ id: 'company-1', name: 'Acme Corp' }],
  },
};

const mockAgent = {
  id: 'agent-1',
  name: 'Cover Letter Agent',
  description: 'Writes cover letters',
  kind: 'cover_letter',
  is_enabled: true,
  instructions: 'Keep it sharp.',
  configuration: {},
  created_at: '2026-04-12T00:00:00Z',
  updated_at: '2026-04-12T00:00:00Z',
  user_id: 'user-1',
};

const mockSession = {
  id: 'session-1',
  created_at: '2026-04-12T00:00:00Z',
  updated_at: '2026-04-12T00:10:00Z',
  agent_id: 'agent-1',
  title: 'Acme intro',
  model_name: 'gpt-5.4-mini-2026-03-17',
  status: 'active',
  message_count: 3,
  last_message_at: '2026-04-12T00:09:00Z',
  application_id: 'app-1',
  user_id: 'user-1',
  message_history: {
    has_more_before: false,
    next_before: null,
  },
  messages: [
    {
      id: 'message-system',
      role: 'system',
      content: 'Use the application context and keep responses concise.',
      created_at: '2026-04-12T00:00:00Z',
      metadata: {},
    },
    {
      id: 'message-user',
      role: 'user',
      content: 'Draft a short intro.',
      created_at: '2026-04-12T00:01:00Z',
      metadata: {},
    },
    {
      id: 'message-assistant',
      role: 'assistant',
      content: 'Here is a strong intro.',
      created_at: '2026-04-12T00:01:05Z',
      metadata: {},
    },
  ],
};

const jsonResponse = (route: Route, body: unknown) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function mockAuthenticatedApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('baldin_token', 'e2e-token');
  });

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === 'GET' && path === '/api/v1/users/me') {
      return jsonResponse(route, mockUser);
    }

    if (method === 'GET' && path === '/api/v1/messages/unread') {
      return jsonResponse(route, { total_unread: 0 });
    }

    if (method === 'GET' && path === '/api/v1/companies/') {
      return jsonResponse(route, { items: [], total: 0, page: 1, page_size: 500 });
    }

    if (method === 'GET' && path === '/api/v1/applications/') {
      return jsonResponse(route, { items: [mockApplication], total: 1, page: 1, page_size: 500 });
    }

    if (method === 'GET' && path === '/api/v1/agents/runs') {
      return jsonResponse(route, { items: [], total: 0, page: 1, page_size: 20 });
    }

    if (method === 'GET' && path === '/api/v1/agents/agent-1') {
      return jsonResponse(route, mockAgent);
    }

    if (method === 'GET' && path === '/api/v1/agents/chat/session-1') {
      return jsonResponse(route, mockSession);
    }

    if (method === 'GET' && path === '/api/v1/agents/chat/session-1/history') {
      return jsonResponse(route, { items: [], has_more_before: false, next_before: null });
    }

    if (method === 'GET' && path === '/api/v1/documents/pinned') {
      return jsonResponse(route, [
        { id: 'doc-1', title: 'Pinned Resume', kind: 'resume', status: 'active', is_pinned: true },
      ]);
    }

    if (method === 'GET' && path === '/api/v1/applications/app-1/documents') {
      return jsonResponse(route, [
        { id: 'doc-2', title: 'Job Description', kind: 'job_description', status: 'active', is_pinned: false },
      ]);
    }

    return jsonResponse(route, {});
  });
}

test('mounts AgentEnabledMultilineField outside a router tree', async ({ page }) => {
  await page.goto('/browser-harness/agent-enabled-multiline-field.html');

  await expect(page.getByRole('heading', { name: 'AgentEnabledMultilineField Harness' })).toBeVisible();
  const field = page.getByRole('textbox', { name: 'Harness Notes' });
  await expect(field).toBeVisible();
  await field.fill('Updated in browser verification');
  await expect(field).toHaveValue('Updated in browser verification');
});

test('keeps the chat composer textarea accessible by name', async ({ page }) => {
  await mockAuthenticatedApp(page);
  await page.goto('/automation/agents/agent-1/chat/session-1');

  await expect(page.getByRole('button', { name: 'Edit title' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Chat message' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Use documents' })).toBeVisible();
});

test('renders one separator between the two applications filter groups', async ({ page }) => {
  await mockAuthenticatedApp(page);
  await page.goto('/applications');

  await expect(page.getByText('Senior Frontend Engineer')).toBeVisible();
  await expect(page.getByText('All Stages')).toBeVisible();
  await expect(page.getByTestId('applications-filter-divider')).toHaveCount(1);
});

test('renders the leads harness in all flagship capture states', async ({ page }) => {
  await page.goto('/browser-harness/figma-wave1.html?screen=leads&state=unranked');
  await expect(page.getByRole('button', { name: 'Rank with aspirations' })).toBeEnabled();
  await expect(page.getByText('Senior Product Designer')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=leads&state=ranked');
  await expect(page.getByText('Aspiration fit 9/10')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear ranking' })).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=leads&state=disabled');
  await expect(page.getByRole('button', { name: 'Rank with aspirations' })).toBeDisabled();
  await expect(page.getByText('Senior Product Designer')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=leads&state=error');
  await expect(page.getByText('Ranking is temporarily unavailable in this capture state.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rank with aspirations' })).toBeEnabled();
});

test('renders the aspirations harness across flagship capture states', async ({ page }) => {
  await page.goto('/browser-harness/figma-wave1.html?screen=aspirations-roles&state=empty');
  await expect(page.getByText('No role aspirations yet')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=aspirations-roles&state=seeded');
  await expect(page.getByText('Staff Product Designer')).toBeVisible();
  await expect(page.getByText('Design Systems Lead')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=aspirations-roles&state=suggested');
  await expect(page.getByText('Platform Design Director')).toBeVisible();
  await expect(page.getByText('Profile-derived role suggestions are ready for review before you save them as aspirations.')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=aspirations-companies&state=no-signal');
  await expect(page.getByText('No strong company signals were found in the current profile. Add more detail to your resume, headline, or work history and try again.')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=aspirations-companies&state=rate-limited');
  await expect(page.getByText('Northstar')).toBeVisible();
  await expect(page.getByText('Harbor Health')).toBeVisible();
  await expect(page.getByText('Profile-based aspiration suggestions are temporarily unavailable, but saved aspirations still support lead ranking and apply handoff.')).toBeVisible();
});

test('renders the apply harness ready and already-applied states', async ({ page }) => {
  await page.goto('/browser-harness/figma-wave1.html?screen=apply&state=ready');
  await expect(page.getByText('Aspiration fit 9/10')).toBeVisible();
  await expect(page.getByText('High aspiration fit - ready to apply?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create application for Senior Product Designer' })).toBeEnabled();

  await page.goto('/browser-harness/figma-wave1.html?screen=apply&state=already-applied');
  await expect(page.getByText('Existing application: Applied')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Existing application for Senior Product Designer' })).toBeDisabled();
});

test('requires an explicit supported harness screen', async ({ page }) => {
  await page.goto('/browser-harness/figma-wave1.html');
  await expect(page.getByRole('heading', { name: 'Unsupported harness request' })).toBeVisible();
  await expect(page.getByText('Missing required `screen` query parameter.')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=applications-board');
  await expect(page.getByRole('heading', { name: 'Unsupported harness request' })).toBeVisible();
  await expect(page.getByText('Unsupported `screen` value "applications-board".')).toBeVisible();
  await expect(page.getByText('Wave 2 and Wave 3 closeout follow direct shipped-route review plus MCP structure or screenshot inspection.')).toBeVisible();
});

test('rejects invalid harness states while keeping omitted state baselines', async ({ page }) => {
  await page.goto('/browser-harness/figma-wave1.html?screen=leads');
  await expect(page.getByRole('button', { name: 'Rank with aspirations' })).toBeEnabled();
  await expect(page.getByText('Senior Product Designer')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=leads&state=rankd');
  await expect(page.getByRole('heading', { name: 'Unsupported harness request' })).toBeVisible();
  await expect(page.getByText('Unsupported `state` value "rankd" for `screen=leads`. Supported states: unranked, ranked, disabled, error.')).toBeVisible();

  await page.goto('/browser-harness/figma-wave1.html?screen=applications&state=loading');
  await expect(page.getByRole('heading', { name: 'Unsupported harness request' })).toBeVisible();
  await expect(page.getByText('The `applications` harness screen does not accept a `state` query parameter.')).toBeVisible();
});
