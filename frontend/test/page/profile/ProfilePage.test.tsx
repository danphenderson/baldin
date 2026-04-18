import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { UserContext } from '@/context/user-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';
import ProfilePage from '@/page/profile/ProfilePage';

const baseUser = {
  id: 'user-1',
  email: 'alex@baldin.dev',
  first_name: 'Alex',
  last_name: 'Mercer',
  city: 'San Francisco',
  state: 'CA',
  country: 'United States',
  time_zone: 'America/Los_Angeles',
} as never;

function renderPage(user: typeof baseUser | null = baseUser, loading = false) {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider
        value={{
          user,
          setUser: vi.fn(),
          token: 'test-token',
          setToken: vi.fn(),
          loading,
          canAccessTier: vi.fn(() => true),
        }}
      >
        <MemoryRouter initialEntries={['/me']}>
          <Routes>
            <Route path="/me" element={<ProfilePage />} />
            <Route path="/me/aspirations/roles" element={<div>roles-route</div>} />
            <Route path="/me/aspirations/companies" element={<div>companies-route</div>} />
            <Route path="/leads" element={<div>leads-route</div>} />
            <Route path="/applications" element={<div>applications-route</div>} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('ProfilePage', () => {
  it('renders the populated hub and routes into role aspirations', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Alex Mercer' })).toBeInTheDocument();
    expect(screen.getByText('Direction set')).toBeInTheDocument();
    expect(screen.getByText('Leadership + systems focus')).toBeInTheDocument();
    expect(screen.getByText('America/Los_Angeles')).toBeInTheDocument();
    expect(screen.getByText('Aspirations handoff')).toBeInTheDocument();
    expect(screen.getByText('Systems-led product design')).toBeInTheDocument();
    expect(screen.getAllByText('Northstar').length).toBeGreaterThan(0);
    expect(screen.queryByText('Flagship Hub')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Review role aspirations' })[0]);

    expect(screen.getByText('roles-route')).toBeInTheDocument();
  });

  it('renders the empty hub state and routes into company aspirations', async () => {
    const user = userEvent.setup();
    renderPage(null, false);

    expect(screen.getByRole('heading', { name: 'Profile & Aspirations Hub' })).toBeInTheDocument();
    expect(screen.getByText('Needs direction')).toBeInTheDocument();
    expect(screen.getByText('No direction selected')).toBeInTheDocument();
    expect(screen.getByText('Location to be added')).toBeInTheDocument();
    expect(screen.getByText('No direction themes yet')).toBeInTheDocument();
    expect(screen.getByText('No role direction yet')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Start company aspirations' })[0]);

    expect(screen.getByText('companies-route')).toBeInTheDocument();
  });
});
