import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LeadCard from '@/component/lead-card';
import { createBaldinTheme } from '@/design-system/theme';
import type { LeadRead } from '@/service/leads';

const buildLead = (overrides: Partial<LeadRead> = {}): LeadRead => ({
  id: 'lead-1',
  title: 'Senior Product Designer',
  description: 'Build a new collaboration surface for the candidate experience.',
  location: 'Remote',
  salary: '$180k-$210k',
  job_function: 'Design',
  employment_type: 'Full-time',
  seniority_level: 'Senior',
  education_level: null,
  hiring_manager: null,
  created_at: '2026-04-05T12:00:00Z',
  updated_at: '2026-04-05T12:00:00Z',
  url: 'https://jobs.example.com/roles/123',
  companies: [{ id: 'company-1', name: 'Example Corp', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }],
  interest_count: 3,
  comment_count: 2,
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
  ...overrides,
});

describe('LeadCard', () => {
  function renderLeadCard(props: Partial<React.ComponentProps<typeof LeadCard>> = {}) {
    const theme = createBaldinTheme('dark');

    return render(
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <LeadCard
          lead={buildLead()}
          applying={false}
          onOpen={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onApply={vi.fn()}
          {...props}
        />
      </MuiThemeProvider>,
    );
  }

  it('renders collaboration metrics and capability-aware actions', () => {
    renderLeadCard();

    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('3 tracking')).toBeInTheDocument();
    expect(screen.getByText('2 comments')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Senior Product Designer')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete Senior Product Designer')).toBeInTheDocument();
  });

  it('opens on card click and keeps quick apply from bubbling into the card action', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onApply = vi.fn();

    renderLeadCard({ onOpen, onApply });

    await user.click(screen.getByRole('button', { name: 'Open lead Senior Product Designer' }));
    expect(onOpen).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Create application for Senior Product Designer' }));
    await user.click(await screen.findByText('Apply now'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'lead-1' }), 'applied');
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not open the parent card when a nested control is activated from the keyboard', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onEdit = vi.fn();

    renderLeadCard({ onOpen, onEdit });

    const editButton = screen.getByRole('button', { name: 'Edit Senior Product Designer' });
    await user.click(editButton);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(0);

    editButton.focus();
    await user.keyboard('{Enter}');

    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenCalledTimes(0);
  });

  it('hides shared edit actions when the server does not grant them', () => {
    renderLeadCard({
      lead: buildLead({
        viewer_is_registered: false,
        viewer_permissions: {
          can_register: true,
          can_leave_registration: false,
          can_update_registration: false,
          can_update_shared_fields: false,
          can_clear_or_overwrite_shared_fields: false,
          can_delete_shared_lead: false,
          can_view_comments: false,
          can_post_comments: false,
        },
      }),
    });

    expect(screen.queryByLabelText('Edit Senior Product Designer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete Senior Product Designer')).not.toBeInTheDocument();
    expect(screen.getByText('Joinable')).toBeInTheDocument();
  });

  it('renders ranking context strip with score chip and alignment text', () => {
    renderLeadCard({
      ranking: {
        relevanceScore: 8,
        message: "Strong match for the user's aspiration to move into senior design leadership roles.",
      },
    });

    const strip = screen.getByTestId('lead-card-ranking-strip');
    expect(strip).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(
      screen.getByText("Strong match for the user's aspiration to move into senior design leadership roles."),
    ).toBeInTheDocument();
    // The old "Aspiration fit X/10" chip in the chip row should not exist
    expect(screen.queryByText('Aspiration fit 8/10')).not.toBeInTheDocument();
  });

  it('does not render ranking strip when ranking is absent', () => {
    renderLeadCard({ ranking: null });

    expect(screen.queryByTestId('lead-card-ranking-strip')).not.toBeInTheDocument();
  });

  it('renders score-only ranking strip when alignment message is empty', () => {
    renderLeadCard({
      ranking: {
        relevanceScore: 5,
        message: '',
      },
    });

    const strip = screen.getByTestId('lead-card-ranking-strip');
    expect(strip).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('renders ready-to-apply handoff copy and keeps the create action enabled', () => {
    renderLeadCard({
      ranking: {
        relevanceScore: 9,
        message: 'High aspiration fit for product design leadership.',
      },
      applicationHandoff: {
        state: 'ready',
        message: 'High aspiration fit - ready to apply?',
      },
    });

    expect(screen.getByText('Ready to apply')).toBeInTheDocument();
    expect(screen.getByText('High aspiration fit - ready to apply?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create application for Senior Product Designer' })).toBeEnabled();
  });

  it('renders existing-application handoff copy and disables creation', () => {
    renderLeadCard({
      ranking: {
        relevanceScore: 9,
        message: 'High aspiration fit for product design leadership.',
      },
      applicationHandoff: {
        state: 'already-applied',
        message: 'An existing application is already in the pipeline for this lead.',
        applicationLabel: 'Applied',
        ctaLabel: 'Application exists',
      },
    });

    expect(screen.getByText('Duplicate guard active')).toBeInTheDocument();
    expect(screen.getByText('Existing application: Applied')).toBeInTheDocument();
    expect(screen.getByText('An existing application is already in the pipeline for this lead.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Existing application for Senior Product Designer' })).toBeDisabled();
  });

  it('uses fixed pixel radii for the lead shell and collaboration strip', () => {
    renderLeadCard();

    expect(screen.getByRole('button', { name: 'Open lead Senior Product Designer' })).toHaveStyle({
      borderRadius: '12px',
    });
    expect(screen.getByTestId('lead-card-collaboration-strip')).toHaveStyle({
      borderRadius: '12px',
    });
  });
});
