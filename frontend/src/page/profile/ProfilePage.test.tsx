import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserContext } from '../../context/user-context';
import { ToolbarHeaderContext } from '../../layout/toolbar-header-context';

const mockUseProfileData = vi.fn();
const mockUseProfileCompletion = vi.fn();

vi.mock('./hooks/useProfileData', () => ({
  useProfileData: (...args: unknown[]) => mockUseProfileData(...args),
}));

vi.mock('./hooks/useProfileCompletion', () => ({
  useProfileCompletion: (...args: unknown[]) => mockUseProfileCompletion(...args),
}));

vi.mock('./components/ProfileHero', () => ({
  ProfileHero: () => <div>profile-hero</div>,
}));

vi.mock('./components/ProfileBuilderPanel', () => ({
  ProfileBuilderPanel: () => <div>profile-builder</div>,
}));

vi.mock('./components/DocumentsSummary', () => ({
  DocumentsSummary: () => <div>documents-summary</div>,
}));

vi.mock('../../component/profile-import-modal', () => ({
  default: () => null,
}));

vi.mock('../../component/mfa-setup-card', () => ({
  default: () => <div>mfa-card</div>,
}));

import ProfilePage from './ProfilePage';

const userContextValue = {
  user: { id: 'user-1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function makeProfileData(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    loading: false,
    error: '',
    toast: '',
    profile: {
      first_name: 'Jane',
      last_name: 'Doe',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
    },
    skills: [],
    experiences: [],
    education: [],
    certificates: [],
    contacts: [],
    refresh: vi.fn(),
    setShowImportModal: vi.fn(),
    showImportModal: false,
    setToast: vi.fn(),
    setError: vi.fn(),
    editingProfile: false,
    profileDraft: null,
    saving: false,
    startEditProfile: vi.fn(),
    cancelEditProfile: vi.fn(),
    handleSaveProfile: vi.fn(),
    pf: vi.fn(),
    openCreate: vi.fn(),
    openEdit: vi.fn(),
    confirmDelete: vi.fn(),
    editOpen: false,
    editSection: 'skills',
    editItem: null,
    editSaving: false,
    setEditItem: vi.fn(),
    closeEdit: vi.fn(),
    handleSaveItem: vi.fn(),
    deleteTarget: null,
    cancelDelete: vi.fn(),
    handleDelete: vi.fn(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <ProfilePage />
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUseProfileData.mockReset();
    mockUseProfileCompletion.mockReset();
    mockUseProfileCompletion.mockReturnValue({ completionPercent: 0, rankedTasks: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons while profile data is loading', () => {
    mockUseProfileData.mockReturnValue(makeProfileData({ loading: true }));

    renderPage();

    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders shared empty states for empty profile sections', () => {
    mockUseProfileData.mockReturnValue(makeProfileData());

    renderPage();

    expect(screen.getByText('No skills yet')).toBeInTheDocument();
    expect(screen.getByText('No experience yet')).toBeInTheDocument();
    expect(screen.getByText('No education yet')).toBeInTheDocument();
  });

  it('renders inline error feedback when profile loading fails', () => {
    mockUseProfileData.mockReturnValue(makeProfileData({ error: 'Profile failed to load' }));

    renderPage();

    expect(screen.getByText('Profile failed to load')).toBeInTheDocument();
  });
});
