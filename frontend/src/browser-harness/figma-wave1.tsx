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
  getCurrentUser,
  getHarnessToken,
  installFigmaWave1FetchMock,
  screenPath,
  type FigmaWave1Screen,
} from './figma-wave1-mocks';

function readScreen(value: string | null): FigmaWave1Screen {
  if (value === 'profile' || value === 'messages') {
    return value;
  }
  return 'applications';
}

function readMode(value: string | null): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

const params = new URLSearchParams(window.location.search);
const screen = readScreen(params.get('screen'));
const mode = readMode(params.get('mode'));

document.title = `Baldin Wave 1 Harness · ${screen} · ${mode}`;
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
                <Route path="/network/messages" element={<ConversationsPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </UserContext.Provider>
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
