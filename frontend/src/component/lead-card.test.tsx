import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LeadCard from './lead-card';
import type { LeadRead } from '../service/leads';

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
  it('renders collaboration metrics and capability-aware actions', () => {
    render(
      <LeadCard
        lead={buildLead()}
        applying={false}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onApply={vi.fn()}
      />,
    );

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

    render(
      <LeadCard
        lead={buildLead()}
        applying={false}
        onOpen={onOpen}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onApply={onApply}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open lead Senior Product Designer' }));
    expect(onOpen).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Create application for Senior Product Designer' }));
    await user.click(await screen.findByText('Apply now'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'lead-1' }), 'applied');
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('hides shared edit actions when the server does not grant them', () => {
    render(
      <LeadCard
        lead={buildLead({
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
        })}
        applying={false}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Edit Senior Product Designer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete Senior Product Designer')).not.toBeInTheDocument();
    expect(screen.getByText('Joinable')).toBeInTheDocument();
  });
});
