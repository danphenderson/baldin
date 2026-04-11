import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { ToolbarHeaderContext } from '../layout/toolbar-header-context';

vi.mock('../service/companies', () => ({
  getCompanies: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn(),
  getCompanyLeads: vi.fn(),
  extractCompany: vi.fn(),
}));

vi.mock('../service/applications', () => ({
  createApplication: vi.fn(),
  findExistingApplicationForLead: vi.fn(),
  getApplicationStateLabel: vi.fn((application: { outcome?: string | null; stage?: string | null }) => (
    application.outcome ?? application.stage ?? 'tracked'
  )),
}));

import * as companiesService from '../service/companies';
import * as applicationsService from '../service/applications';
import CompaniesPage from './companies';

const mockedGetCompanies = vi.mocked(companiesService.getCompanies);
const mockedGetCompanyLeads = vi.mocked(companiesService.getCompanyLeads);
const mockedCreateApplication = vi.mocked(applicationsService.createApplication);
const mockedFindExistingApplicationForLead = vi.mocked(applicationsService.findExistingApplicationForLead);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

const makeCompany = () => ({
  id: 'company-1',
  name: 'Acme Corp',
  industry: 'Software',
  size: '200-500',
  location: 'Remote',
  description: 'Makes tools for developers.',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
});

const makeLead = () => ({
  id: 'lead-1',
  title: 'Senior Frontend Engineer',
  location: 'Remote',
  employment_type: 'Full-time',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
});

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <MemoryRouter>
          <CompaniesPage />
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('CompaniesPage', () => {
  beforeEach(() => {
    mockedGetCompanies.mockReset();
    mockedGetCompanyLeads.mockReset();
    mockedCreateApplication.mockReset();
    mockedFindExistingApplicationForLead.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates an applied application from the company lead quick-create surface', async () => {
    const user = userEvent.setup();

    mockedGetCompanies.mockResolvedValue([makeCompany()] as never);
    mockedGetCompanyLeads.mockResolvedValue([makeLead()] as never);
    mockedFindExistingApplicationForLead.mockResolvedValue(null);
    mockedCreateApplication.mockResolvedValue({ id: 'app-1' } as never);

    renderPage();

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Job Leads' }));
    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create application for Senior Frontend Engineer' }));
    await user.click(await screen.findByText('Apply now'));

    await waitFor(() => {
      expect(mockedFindExistingApplicationForLead).toHaveBeenCalledWith('test-token', 'lead-1');
      expect(mockedCreateApplication).toHaveBeenCalledWith('test-token', {
        lead_id: 'lead-1',
        stage: 'applied',
      });
    });
  });
});
