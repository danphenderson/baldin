import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-sans-3/800.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { NotificationProvider } from '../context/notification-context';
import { UserContext } from '../context/user-context';
import { THEME_STORAGE_KEY, type ThemeMode } from '../design-system/theme';
import AppLayout from '../layout/app-layout';
import ApplicationsQueuePage from '../page/applications/applications-queue-page';
import ConversationsPage from '../page/messages/conversations-page';
import ProfilePage from '../page/profile';
import ThemeProvider from '../theme/theme-provider';
import {
  ApplyCaptureScreen,
  AspirationsCaptureScreen,
  LeadsCaptureScreen,
  type ApplyCaptureState,
  type AspirationsCaptureState,
  type LeadsCaptureState,
} from './figma-flagship-capture';
import {
  getCurrentUser,
  getHarnessToken,
  installFigmaWave1FetchMock,
  type FigmaWave1Screen,
} from './figma-wave1-mocks';

type FigmaHarnessScreen = FigmaWave1Screen | 'aspirations-roles' | 'aspirations-companies' | 'leads' | 'apply';

function readScreen(value: string | null): FigmaHarnessScreen {
  if (
    value === 'profile'
    || value === 'messages'
    || value === 'aspirations-roles'
    || value === 'aspirations-companies'
    || value === 'leads'
    || value === 'apply'
  ) {
    return value;
  }
  return 'applications';
}

function screenPath(screen: FigmaHarnessScreen) {
  switch (screen) {
    case 'profile':
      return '/me';
    case 'messages':
      return '/network/messages';
    case 'aspirations-roles':
      return '/me/aspirations/roles';
    case 'aspirations-companies':
      return '/me/aspirations/companies';
    case 'leads':
      return '/leads';
    case 'apply':
      return '/apply';
    case 'applications':
    default:
      return '/applications';
  }
}

function readMode(value: string | null): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

function readLeadsState(value: string | null): LeadsCaptureState {
  if (value === 'ranked' || value === 'disabled' || value === 'error') {
    return value;
  }
  return 'unranked';
}

function readApplyState(value: string | null): ApplyCaptureState {
  return value === 'already-applied' ? 'already-applied' : 'ready';
}

function readAspirationsState(value: string | null): AspirationsCaptureState {
  if (value === 'seeded' || value === 'loading' || value === 'suggested' || value === 'no-signal' || value === 'rate-limited') {
    return value;
  }
  return 'empty';
}

const params = new URLSearchParams(window.location.search);
const screen = readScreen(params.get('screen'));
const mode = readMode(params.get('mode'));
const state = screen === 'leads'
  ? readLeadsState(params.get('state'))
  : screen === 'apply'
    ? readApplyState(params.get('state'))
    : screen === 'aspirations-roles' || screen === 'aspirations-companies'
      ? readAspirationsState(params.get('state'))
    : null;

document.title = `Baldin Wave 1 Harness · ${screen}${state ? ` · ${state}` : ''} · ${mode}`;
localStorage.setItem(THEME_STORAGE_KEY, mode);
localStorage.setItem('baldin_token', getHarnessToken());
installFigmaWave1FetchMock();

const user = getCurrentUser();
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Harness root element was not found.');
}

const userContextValue = {
  user,
  setUser: () => {},
  token: getHarnessToken(),
  setToken: () => {},
  loading: false,
  canAccessTier: () => true,
} as any;

createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <UserContext.Provider value={userContextValue}>
          <MemoryRouter initialEntries={[screenPath(screen)]}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/applications" element={<ApplicationsQueuePage />} />
                <Route path="/me" element={<ProfilePage />} />
                <Route
                  path="/me/aspirations/roles"
                  element={<AspirationsCaptureScreen kind="role" state={readAspirationsState(params.get('state'))} />}
                />
                <Route
                  path="/me/aspirations/companies"
                  element={<AspirationsCaptureScreen kind="company" state={readAspirationsState(params.get('state'))} />}
                />
                <Route path="/network/messages" element={<ConversationsPage />} />
                <Route path="/leads" element={<LeadsCaptureScreen state={readLeadsState(params.get('state'))} />} />
                <Route path="/apply" element={<ApplyCaptureScreen state={readApplyState(params.get('state'))} />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </UserContext.Provider>
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
