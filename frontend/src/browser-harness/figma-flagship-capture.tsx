import React from 'react';
import Grid from '@mui/material/Grid';
import {
  Badge as RolesIcon,
  BusinessOutlined as CompaniesIcon,
} from '@mui/icons-material';
import { Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import { AutoAwesome as SuggestIcon } from '@mui/icons-material';

import AspirationsCollection from '../component/aspirations-collection';
import { Caption, CardTitle } from '../design-system';
import LeadCard from '../component/lead-card';
import LeadSearchBar from '../component/lead-search-bar';
import {
  CardShell,
  InlineFeedback,
  MetricStrip,
  StatusChip,
} from '../design-system';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import type { ApplicationCreationIntent } from '../service/applications';
import type {
  AspirationAdapter,
  AspirationItem,
  AspirationKind,
  AspirationSuggestionDraft,
} from '../service/aspirations';
import type { LeadRead } from '../service/leads';

export type AspirationsCaptureState = 'empty' | 'seeded' | 'loading' | 'suggested' | 'no-signal' | 'rate-limited';
export type LeadsCaptureState = 'unranked' | 'ranked' | 'disabled' | 'error';
export type ApplyCaptureState = 'ready' | 'already-applied';

const HARNESS_LEADS: LeadRead[] = [
  {
    id: 'capture-lead-1',
    title: 'Senior Product Designer',
    description: 'Lead the candidate experience redesign and connect ranking insights to application handoff.',
    location: 'Remote (US)',
    salary: '$165k-$190k',
    job_function: 'Design',
    employment_type: 'Full-time',
    seniority_level: 'Senior',
    education_level: null,
    hiring_manager: null,
    created_at: '2026-04-05T12:00:00Z',
    updated_at: '2026-04-12T12:00:00Z',
    url: 'https://jobs.example.com/roles/capture-1',
    companies: [{
      id: 'company-1',
      name: 'Northstar',
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    }],
    interest_count: 4,
    comment_count: 3,
    viewer_is_registered: true,
    viewer_permissions: {
      can_register: false,
      can_leave_registration: true,
      can_update_registration: true,
      can_update_shared_fields: true,
      can_clear_or_overwrite_shared_fields: true,
      can_delete_shared_lead: true,
      can_view_comments: true,
      can_post_comments: true,
    },
  },
  {
    id: 'capture-lead-2',
    title: 'Principal UX Engineer',
    description: 'Own the design systems and frontend foundations for a fast-moving product team.',
    location: 'Austin, TX',
    salary: '$185k-$215k',
    job_function: 'Engineering',
    employment_type: 'Full-time',
    seniority_level: 'Principal',
    education_level: null,
    hiring_manager: null,
    created_at: '2026-04-03T09:30:00Z',
    updated_at: '2026-04-11T15:00:00Z',
    url: 'https://jobs.example.com/roles/capture-2',
    companies: [{
      id: 'company-2',
      name: 'Harbor Health',
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    }],
    interest_count: 2,
    comment_count: 1,
    viewer_is_registered: true,
    viewer_permissions: {
      can_register: false,
      can_leave_registration: true,
      can_update_registration: true,
      can_update_shared_fields: true,
      can_clear_or_overwrite_shared_fields: true,
      can_delete_shared_lead: true,
      can_view_comments: true,
      can_post_comments: true,
    },
  },
];

const HARNESS_ASPIRATIONS: AspirationItem[] = [
  {
    id: 'asp-role-1',
    kind: 'role',
    label: 'Staff Product Designer',
    reason: 'Shape the end-to-end candidate experience and mentor other designers.',
    notes: 'Strong fit for ranking design leadership leads.',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-12T09:00:00Z',
  },
  {
    id: 'asp-role-2',
    kind: 'role',
    label: 'Design Systems Lead',
    reason: 'Stay close to systems thinking while owning visual quality at scale.',
    notes: 'Good bridge between product craft and frontend implementation.',
    created_at: '2026-04-03T09:00:00Z',
    updated_at: '2026-04-12T09:00:00Z',
  },
  {
    id: 'asp-company-1',
    kind: 'company',
    label: 'Northstar',
    reason: 'Mission and stage align with a collaborative product-design move.',
    notes: 'Balanced remote culture and product depth.',
    created_at: '2026-04-02T09:00:00Z',
    updated_at: '2026-04-12T09:00:00Z',
  },
  {
    id: 'asp-company-2',
    kind: 'company',
    label: 'Harbor Health',
    reason: 'Healthcare product focus with space for systems-led design leadership.',
    notes: 'Strong overlap with applied design systems work.',
    created_at: '2026-04-04T09:00:00Z',
    updated_at: '2026-04-12T09:00:00Z',
  },
];

const HARNESS_SUGGESTIONS: AspirationSuggestionDraft[] = [
  {
    kind: 'role',
    label: 'Platform Design Director',
    reason: 'Your profile emphasizes systems thinking, mentorship, and cross-functional design leadership.',
    notes: 'Suggested from product-design and systems-heavy experience.',
    priority: 1,
  },
  {
    kind: 'role',
    label: 'Head of Candidate Experience',
    reason: 'Recent portfolio language points to application-flow redesign and lifecycle ownership.',
    notes: 'Strong handoff fit for the apply workflow.',
    priority: 2,
  },
  {
    kind: 'company',
    label: 'Signal Health',
    reason: 'The profile highlights healthcare-adjacent collaboration and research-heavy product work.',
    notes: 'Suggested from domain overlap in prior teams.',
    priority: 1,
  },
  {
    kind: 'company',
    label: 'Atlas Labs',
    reason: 'Design systems and candidate workflow experience align with fast-moving platform teams.',
    notes: 'Strong match for a local-first product environment.',
    priority: 2,
  },
];

const LEAD_RANKINGS = {
  'capture-lead-1': {
    relevanceScore: 9,
    message: 'Strong aspiration fit for leadership-focused product design roles in collaborative teams.',
  },
  'capture-lead-2': {
    relevanceScore: 8,
    message: 'Excellent fit for a design-systems-heavy role with cross-functional influence.',
  },
} as const;

const noop = () => {};
const noopApply = (_lead: LeadRead, _intent: ApplicationCreationIntent) => {};

function createHarnessAspirationAdapter(initialItems: AspirationItem[]): AspirationAdapter {
  const store = new Map(initialItems.map((item) => [item.id, item]));

  return {
    async list(kind) {
      return Array.from(store.values())
        .filter((item) => item.kind === kind)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async suggest(kind) {
      return HARNESS_SUGGESTIONS
        .filter((suggestion) => suggestion.kind === kind)
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    },

    async create(kind, data) {
      const now = new Date().toISOString();
      const item: AspirationItem = {
        id: crypto.randomUUID(),
        kind,
        label: data.label,
        reason: data.reason ?? null,
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
      };
      store.set(item.id, item);
      return item;
    },

    async update(id, data) {
      const existing = store.get(id);
      if (!existing) {
        throw new Error(`Aspiration ${id} not found`);
      }

      const updated: AspirationItem = {
        ...existing,
        ...data,
        updated_at: new Date().toISOString(),
      };
      store.set(id, updated);
      return updated;
    },

    async remove(id) {
      store.delete(id);
    },
  };
}

function renderLeadGrid(
  leads: LeadRead[],
  rankingMode: 'none' | 'ranked',
  applicationHandoff?: {
    state: 'ready' | 'already-applied';
    message: string;
    applicationLabel?: string;
    ctaLabel?: string;
  },
) {
  return (
    <Grid container spacing={2}>
      {leads.map((lead) => (
        <Grid size={{ xs: 12, md: 6 }} key={lead.id}>
          <LeadCard
            lead={lead}
            applying={false}
            ranking={rankingMode === 'ranked' ? LEAD_RANKINGS[lead.id as keyof typeof LEAD_RANKINGS] : null}
            applicationHandoff={applicationHandoff ?? null}
            onOpen={noop}
            onEdit={noop}
            onDelete={noop}
            onApply={noopApply}
          />
        </Grid>
      ))}
    </Grid>
  );
}

function SuggestedAspirationCard({ suggestion }: { suggestion: AspirationSuggestionDraft }) {
  return (
    <CardShell aria-label={`${suggestion.label} suggested aspiration`}>
      <Stack spacing={1.25}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <CardTitle sx={{ minWidth: 0 }}>{suggestion.label}</CardTitle>
          <StatusChip label="Suggested" emphasis="outline" tone="primary" />
        </Box>

        {suggestion.reason && (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            {suggestion.reason}
          </Typography>
        )}

        {suggestion.notes && (
          <Caption sx={{ fontStyle: 'italic' }}>
            {suggestion.notes}
          </Caption>
        )}
      </Stack>
    </CardShell>
  );
}

export const AspirationsCaptureScreen: React.FC<{
  kind: AspirationKind;
  state: AspirationsCaptureState;
}> = ({ kind, state }) => {
  const kindLabel = kind === 'role' ? 'Role' : 'Company';
  const kindIcon = kind === 'role' ? <RolesIcon /> : <CompaniesIcon />;
  const emptyTitle = kind === 'role' ? 'No role aspirations yet' : 'No company aspirations yet';
  const emptyDescription = kind === 'role'
    ? 'Track the job titles and role profiles you want Baldin to optimize for.'
    : 'Track the companies and employers you want Baldin to prioritize in your search.';

  const items = React.useMemo(
    () => (state === 'seeded' || state === 'rate-limited'
      ? HARNESS_ASPIRATIONS.filter((item) => item.kind === kind)
      : []),
    [kind, state],
  );

  const suggestions = React.useMemo(
    () => HARNESS_SUGGESTIONS
      .filter((suggestion) => suggestion.kind === kind)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    [kind],
  );

  const adapter = React.useMemo(() => createHarnessAspirationAdapter(items), [items]);

  const auxiliaryContent = state === 'loading'
    ? (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<CircularProgress size={18} />}
            disabled
          >
            Loading suggestions…
          </Button>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid size={{ xs: 12, md: 6 }} key={i}>
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: '12px' }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )
    : state === 'suggested'
    ? (
        <Box sx={{ mb: 3 }}>
          <InlineFeedback tone="info" sx={{ mb: 2 }}>
            Profile-derived {kindLabel.toLowerCase()} suggestions are ready for review before you save them as aspirations.
          </InlineFeedback>
          <Grid container spacing={2}>
            {suggestions.map((suggestion) => (
              <Grid size={{ xs: 12, md: 6 }} key={suggestion.label}>
                <SuggestedAspirationCard suggestion={suggestion} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )
    : state === 'no-signal'
      ? (
          <InlineFeedback tone="warning" sx={{ mb: 3 }}>
            No strong {kindLabel.toLowerCase()} signals were found in the current profile. Add more detail to your resume, headline, or work history and try again.
          </InlineFeedback>
        )
      : state === 'rate-limited'
        ? (
            <InlineFeedback tone="error" sx={{ mb: 3 }}>
              Profile-based aspiration suggestions are temporarily unavailable, but saved aspirations still support lead ranking and apply handoff.
            </InlineFeedback>
          )
        : undefined;

  return (
    <AspirationsCollection
      kind={kind}
      adapter={adapter}
      kindLabel={kindLabel}
      kindIcon={kindIcon}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      auxiliaryContent={auxiliaryContent}
    />
  );
};

export const LeadsCaptureScreen: React.FC<{ state: LeadsCaptureState }> = ({ state }) => {
  usePageToolbarHeader('Leads', 'Flagship Figma capture harness');

  const rankingDisabledReason = state === 'disabled'
    ? 'Add role or company aspirations on the Aspirations pages to rank leads against them.'
    : undefined;

  return (
    <Box>
      <MetricStrip
        variant="inline"
        items={[
          { label: 'Joined by you', value: 2 },
          { label: 'Active shared', value: 2 },
          { label: 'With discussion', value: 2 },
        ]}
      />

      <LeadSearchBar
        search=""
        filter="all"
        page={1}
        pageCount={1}
        rankingActive={state === 'ranked'}
        rankingPending={false}
        rankingDisabledReason={rankingDisabledReason}
        onSearchChange={noop}
        onFilterChange={noop}
        onPageChange={noop}
        onRank={noop}
        onClearRanking={noop}
      />

      {state === 'error' && (
        <InlineFeedback tone="error" sx={{ mb: 2 }}>
          Ranking is temporarily unavailable in this capture state.
        </InlineFeedback>
      )}

      {renderLeadGrid(HARNESS_LEADS, state === 'ranked' ? 'ranked' : 'none')}
    </Box>
  );
};

export const ApplyCaptureScreen: React.FC<{ state: ApplyCaptureState }> = ({ state }) => {
  usePageToolbarHeader('Apply Handoff', 'Flagship Figma capture harness');

  const handoff = state === 'already-applied'
    ? {
        state: 'already-applied' as const,
        message: 'An existing application is already in the pipeline for this lead, so the duplicate guard keeps create disabled.',
        applicationLabel: 'Applied',
        ctaLabel: 'Application exists',
      }
    : {
        state: 'ready' as const,
        message: 'High aspiration fit - ready to apply? Use the lead context to move straight into the active pipeline.',
      };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Capture the ranked-lead handoff into application creation without a live backend.
      </Typography>
      {renderLeadGrid([HARNESS_LEADS[0]], 'ranked', handoff)}
    </Stack>
  );
};
