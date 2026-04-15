import { API_URL } from '../config/env';

export type FigmaWave1Screen = 'applications' | 'profile' | 'messages';

const HARNESS_TOKEN = 'figma-wave1-token';

const CURRENT_USER = {
  id: 'user-1',
  email: 'alex.mercer@baldin.dev',
  first_name: 'Alex',
  last_name: 'Mercer',
  phone_number: '+1 (555) 123-9090',
  address_line_1: '742 Evergreen Terrace',
  address_line_2: 'Suite 400',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94103',
  country: 'United States',
  time_zone: 'America/Los_Angeles',
  avatar_uri: null,
  is_active: true,
  is_superuser: false,
  is_verified: true,
  subscription_tier: 'pro',
  subscription_expires_at: null,
  created_at: '2026-04-12T00:00:00Z',
  updated_at: '2026-04-12T00:00:00Z',
};

const APPLICATIONS = [
  {
    id: 'app-1',
    lead_id: 'lead-1',
    stage: 'applied',
    outcome: null,
    status: 'applied',
    created_at: '2026-04-09T14:00:00Z',
    updated_at: '2026-04-11T18:25:00Z',
    next_step: 'Send recruiter follow-up',
    next_step_due: '2026-04-14T17:00:00Z',
    document_metadata: {
      total_count: 3,
      has_resume: true,
      has_cover_letter: true,
      kinds: ['resume', 'cover_letter', 'job_description'],
    },
    lead: {
      id: 'lead-1',
      title: 'Senior Product Designer',
      location: 'Remote (US)',
      salary: '$165k',
      companies: [{ id: 'company-1', name: 'Northstar' }],
    },
  },
  {
    id: 'app-2',
    lead_id: 'lead-2',
    stage: 'screening',
    outcome: null,
    status: 'screening',
    created_at: '2026-04-07T10:15:00Z',
    updated_at: '2026-04-12T09:00:00Z',
    next_step: 'Prep recruiter screen notes',
    next_step_due: '2026-04-13T16:30:00Z',
    document_metadata: {
      total_count: 2,
      has_resume: true,
      has_cover_letter: false,
      kinds: ['resume', 'job_description'],
    },
    lead: {
      id: 'lead-2',
      title: 'Design Systems Lead',
      location: 'New York, NY',
      salary: '$182k',
      companies: [{ id: 'company-2', name: 'Orchid Labs' }],
    },
  },
  {
    id: 'app-3',
    lead_id: 'lead-3',
    stage: 'interview',
    outcome: null,
    status: 'interview',
    created_at: '2026-04-02T08:00:00Z',
    updated_at: '2026-04-12T11:10:00Z',
    next_step: 'Panel interview on Thursday',
    next_step_due: '2026-04-16T13:00:00Z',
    document_metadata: {
      total_count: 4,
      has_resume: true,
      has_cover_letter: true,
      kinds: ['resume', 'cover_letter', 'portfolio', 'job_description'],
    },
    lead: {
      id: 'lead-3',
      title: 'Staff UX Engineer',
      location: 'Austin, TX',
      salary: '$190k',
      companies: [{ id: 'company-3', name: 'Harbor Health' }],
    },
  },
  {
    id: 'app-4',
    lead_id: 'lead-4',
    stage: 'offer',
    outcome: null,
    status: 'offer',
    created_at: '2026-03-28T12:00:00Z',
    updated_at: '2026-04-10T15:45:00Z',
    next_step: 'Review compensation package',
    next_step_due: '2026-04-15T12:00:00Z',
    document_metadata: {
      total_count: 3,
      has_resume: true,
      has_cover_letter: true,
      kinds: ['resume', 'cover_letter', 'job_description'],
    },
    lead: {
      id: 'lead-4',
      title: 'Principal Product Designer',
      location: 'Seattle, WA',
      salary: '$215k',
      companies: [{ id: 'company-4', name: 'Lumen Cloud' }],
    },
  },
  {
    id: 'app-5',
    lead_id: 'lead-5',
    stage: 'applied',
    outcome: 'rejected',
    status: 'rejected',
    created_at: '2026-03-18T09:00:00Z',
    updated_at: '2026-04-08T09:30:00Z',
    next_step: null,
    next_step_due: null,
    document_metadata: {
      total_count: 1,
      has_resume: true,
      has_cover_letter: false,
      kinds: ['resume'],
    },
    lead: {
      id: 'lead-5',
      title: 'Senior Experience Designer',
      location: 'Chicago, IL',
      salary: '$148k',
      companies: [{ id: 'company-5', name: 'Praxis Commerce' }],
    },
  },
];

const CONVERSATIONS = [
  {
    id: 'conversation-1',
    title: 'Northstar hiring team',
    unread_count: 3,
    participants: [
      { user_id: CURRENT_USER.id, display_name: 'Alex Mercer', avatar_uri: null, headline: 'Product Designer' },
      { user_id: 'user-2', display_name: 'Jules Tan', avatar_uri: null, headline: 'Recruiter at Northstar' },
      { user_id: 'user-3', display_name: 'Monica Hughes', avatar_uri: null, headline: 'Design Director' },
    ],
    last_message: {
      id: 'message-3',
      content: 'Let’s confirm who will join the final interview panel.',
      created_at: '2026-04-12T10:12:00Z',
      author: { user_id: 'user-2', display_name: 'Jules Tan' },
    },
  },
  {
    id: 'conversation-2',
    title: null,
    unread_count: 0,
    participants: [
      { user_id: CURRENT_USER.id, display_name: 'Alex Mercer', avatar_uri: null, headline: 'Product Designer' },
      { user_id: 'user-4', display_name: 'Riley Brooks', avatar_uri: null, headline: 'Product Design Manager' },
    ],
    last_message: {
      id: 'message-4',
      content: 'Thanks again for sending the portfolio walkthrough.',
      created_at: '2026-04-11T18:42:00Z',
      author: { user_id: CURRENT_USER.id, display_name: 'Alex Mercer' },
    },
  },
  {
    id: 'conversation-3',
    title: 'Portfolio feedback circle',
    unread_count: 1,
    participants: [
      { user_id: CURRENT_USER.id, display_name: 'Alex Mercer', avatar_uri: null, headline: 'Product Designer' },
      { user_id: 'user-5', display_name: 'Priya Shah', avatar_uri: null, headline: 'Senior UX Researcher' },
      { user_id: 'user-6', display_name: 'Daniel Kim', avatar_uri: null, headline: 'Design Systems Engineer' },
    ],
    last_message: {
      id: 'message-5',
      content: 'I dropped annotated notes on the final two case studies.',
      created_at: '2026-04-10T16:00:00Z',
      author: { user_id: 'user-6', display_name: 'Daniel Kim' },
    },
  },
  {
    id: 'conversation-4',
    title: null,
    unread_count: 0,
    participants: [
      { user_id: CURRENT_USER.id, display_name: 'Alex Mercer', avatar_uri: null, headline: 'Product Designer' },
      { user_id: 'user-7', display_name: 'Noah Ellis', avatar_uri: null, headline: 'Recruiting Coordinator' },
    ],
    last_message: {
      id: 'message-6',
      content: 'Your onsite agenda is attached in the email thread as well.',
      created_at: '2026-04-08T13:14:00Z',
      author: { user_id: 'user-7', display_name: 'Noah Ellis' },
    },
  },
];

const SKILLS = [
  { id: 'skill-1', name: 'Design systems', category: 'Product Design', yoe: 7 },
  { id: 'skill-2', name: 'Figma prototyping', category: 'Product Design', yoe: 8 },
  { id: 'skill-3', name: 'React', category: 'Engineering', yoe: 5 },
  { id: 'skill-4', name: 'Accessibility audits', category: 'Quality', yoe: 6 },
  { id: 'skill-5', name: 'User research synthesis', category: 'Research', yoe: 4 },
];

const EXPERIENCES = [
  {
    id: 'experience-1',
    title: 'Staff Product Designer',
    company: 'Northstar',
    location: 'Remote',
    start_date: '2022-01-01',
    end_date: null,
    description: 'Led the component library refresh across web and mobile workflows.',
    projects: ['Payments redesign', 'Design system migration'],
  },
  {
    id: 'experience-2',
    title: 'Senior Product Designer',
    company: 'Orchid Labs',
    location: 'San Francisco, CA',
    start_date: '2019-04-01',
    end_date: '2021-12-01',
    description: 'Scaled hiring marketplace flows and introduced reusable UI metrics reviews.',
    projects: ['Candidate portal', 'Messaging patterns'],
  },
];

const EDUCATION = [
  {
    id: 'education-1',
    degree: 'B.S. Human Computer Interaction',
    university: 'Carnegie Mellon University',
    start_date: '2011-08-01',
    end_date: '2015-05-01',
    grade_point: '3.8',
    activities: ['Design Club', 'Hackathon mentor'],
    achievements: ['Dean’s List'],
  },
];

const CERTIFICATES = [
  {
    id: 'certificate-1',
    name: 'Accessibility for Web Design',
    issuer: 'Nielsen Norman Group',
    issued_on: '2024-06-01',
    expires_on: null,
    credential_id: 'NNG-AX-2024',
  },
];

const CONTACTS = [
  {
    id: 'contact-1',
    type: 'linkedin',
    label: 'LinkedIn',
    value: 'linkedin.com/in/alex-mercer',
  },
  {
    id: 'contact-2',
    type: 'portfolio',
    label: 'Portfolio',
    value: 'alexmercer.design',
  },
];

const DOCUMENTS = [
  { id: 'document-1', title: 'Senior Product Designer Resume', kind: 'resume', status: 'active', is_pinned: true },
  { id: 'document-2', title: 'Northstar Cover Letter', kind: 'cover_letter', status: 'active', is_pinned: true },
  { id: 'document-3', title: 'Portfolio Case Study', kind: 'portfolio', status: 'active', is_pinned: false },
];

const CONNECTIONS = [
  {
    id: 'connection-1',
    requester: { user_id: CURRENT_USER.id, display_name: 'Alex Mercer', avatar_uri: null, headline: 'Product Designer' },
    addressee: { user_id: 'user-2', display_name: 'Jules Tan', avatar_uri: null, headline: 'Recruiter at Northstar' },
    status: 'accepted',
  },
  {
    id: 'connection-2',
    requester: { user_id: CURRENT_USER.id, display_name: 'Alex Mercer', avatar_uri: null, headline: 'Product Designer' },
    addressee: { user_id: 'user-4', display_name: 'Riley Brooks', avatar_uri: null, headline: 'Product Design Manager' },
    status: 'accepted',
  },
];

const ASPIRATIONS = [
  {
    id: 'asp-role-1',
    kind: 'role',
    label: 'Staff Product Designer',
    reason: 'Next-step role aligned with current portfolio direction.',
    notes: 'Strong fit for design leadership and hiring workflow strategy.',
    created_at: '2026-04-10T12:00:00Z',
    updated_at: '2026-04-12T09:00:00Z',
  },
  {
    id: 'asp-role-2',
    kind: 'role',
    label: 'Design Systems Lead',
    reason: 'Build on recent design-system migration work.',
    notes: null,
    created_at: '2026-04-08T11:00:00Z',
    updated_at: '2026-04-12T08:45:00Z',
  },
  {
    id: 'asp-company-1',
    kind: 'company',
    label: 'Northstar',
    reason: 'Active application pipeline and referral path.',
    notes: 'Good fit for collaborative product design roles.',
    created_at: '2026-04-11T14:00:00Z',
    updated_at: '2026-04-12T10:30:00Z',
  },
  {
    id: 'asp-company-2',
    kind: 'company',
    label: 'Harbor Health',
    reason: 'Mission and senior UX engineering roles align well.',
    notes: null,
    created_at: '2026-04-09T16:00:00Z',
    updated_at: '2026-04-12T07:30:00Z',
  },
] as const;

type MockRouteHandler = (request: Request) => Promise<Response> | Response;

let applicationsState: any[] = structuredClone(APPLICATIONS);
let conversationsState: any[] = structuredClone(CONVERSATIONS);
let connectionsState: any[] = structuredClone(CONNECTIONS);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const paginated = <T,>(items: T[]) => ({
  items,
  total: items.length,
  page: 1,
  page_size: 500,
});

const currentHarnessState = () => new URL(window.location.href).searchParams.get('state');

const aspirationsForState = (kind?: string | null) => {
  if (currentHarnessState() !== 'seeded') {
    return [];
  }

  return ASPIRATIONS.filter((aspiration) => !kind || aspiration.kind === kind);
};

const findApplication = (applicationId: string) =>
  applicationsState.find((application) => application.id === applicationId) ?? null;

const APPLICATION_ID_PATTERN = /^\/api\/v1\/applications\/([^/]+)$/;

const routeHandlers: Array<[(url: URL, method: string) => boolean, MockRouteHandler]> = [
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/users/me', () => jsonResponse(CURRENT_USER)],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/applications/', () => jsonResponse(paginated(applicationsState))],
  [
    (url, method) => method === 'PATCH' && APPLICATION_ID_PATTERN.test(url.pathname),
    async (request) => {
      const match = new URL(request.url).pathname.match(APPLICATION_ID_PATTERN);
      const applicationId = match?.[1] ?? '';
      const application = findApplication(applicationId);
      const patch = await request.json().catch(() => ({}));

      if (!application) {
        return jsonResponse({ detail: 'Not found' }, 404);
      }

      Object.assign(application, patch, {
        updated_at: '2026-04-12T12:00:00Z',
      });
      return jsonResponse(application);
    },
  ],
  [
    (url, method) => method === 'DELETE' && APPLICATION_ID_PATTERN.test(url.pathname),
    (request) => {
      const match = new URL(request.url).pathname.match(APPLICATION_ID_PATTERN);
      const applicationId = match?.[1] ?? '';
      applicationsState = applicationsState.filter((application) => application.id !== applicationId);
      return new Response(null, { status: 204 });
    },
  ],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/conversations/', () => jsonResponse(paginated(conversationsState))],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/conversations/unread', () => jsonResponse({ total_unread: 4 })],
  [
    (url, method) => method === 'POST' && url.pathname === '/api/v1/conversations/',
    async (request: Request) => {
      const payload = await request.json().catch(() => ({}));
      const nextConversation = {
        id: `conversation-${conversationsState.length + 1}`,
        title: payload.title ?? 'New conversation',
        unread_count: 0,
        participants: [
          { user_id: CURRENT_USER.id, display_name: 'Alex Mercer', avatar_uri: null, headline: 'Product Designer' },
          ...connectionsState
            .flatMap((connection) => [connection.requester, connection.addressee])
            .filter((participant) => payload.participant_user_ids?.includes(participant.user_id))
            .filter((participant) => participant.user_id !== CURRENT_USER.id),
        ],
        last_message: {
          id: 'message-new',
          content: 'Conversation created from the Figma browser harness.',
          created_at: '2026-04-12T12:00:00Z',
          author: { user_id: CURRENT_USER.id, display_name: 'Alex Mercer' },
        },
      };
      conversationsState = [nextConversation, ...conversationsState];
      return jsonResponse(nextConversation, 201);
    },
  ],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/skills/', () => jsonResponse(paginated(SKILLS))],
  [
    (url, method) => method === 'GET' && url.pathname === '/api/v1/aspirations',
    (request) => {
      const url = new URL(request.url);
      return jsonResponse(paginated(aspirationsForState(url.searchParams.get('kind'))));
    },
  ],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/experiences/', () => jsonResponse(paginated(EXPERIENCES))],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/education/', () => jsonResponse(paginated(EDUCATION))],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/certificates/', () => jsonResponse(paginated(CERTIFICATES))],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/contacts/', () => jsonResponse(paginated(CONTACTS))],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/documents/', () => jsonResponse(paginated(DOCUMENTS))],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/documents/pinned', () => jsonResponse(DOCUMENTS.filter((document) => document.is_pinned))],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/auth/mfa/status', () => jsonResponse({ mfa_enabled: false })],
  [(url, method) => method === 'GET' && url.pathname === '/api/v1/connections/', () => jsonResponse(paginated(connectionsState))],
  [(url, method) => method === 'POST' && url.pathname === '/api/v1/auth/jwt/logout', () => new Response(null, { status: 204 })],
];

let fetchMockInstalled = false;

export function getHarnessToken() {
  return HARNESS_TOKEN;
}

export function getCurrentUser() {
  return CURRENT_USER;
}

export function screenPath(screen: FigmaWave1Screen) {
  switch (screen) {
    case 'profile':
      return '/me';
    case 'messages':
      return '/network/messages';
    case 'applications':
    default:
      return '/applications';
  }
}

export function installFigmaWave1FetchMock() {
  if (fetchMockInstalled) {
    return;
  }

  const apiOrigin = new URL(API_URL).origin;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url, window.location.origin);
    const method = request.method.toUpperCase();

    if (url.origin !== apiOrigin) {
      return nativeFetch(input, init);
    }

    for (const [matcher, handler] of routeHandlers) {
      if (matcher(url, method)) {
        return handler(request);
      }
    }

    return jsonResponse({
      detail: `No browser-harness mock is configured for ${method} ${url.pathname}`,
    }, 404);
  };

  fetchMockInstalled = true;
}
