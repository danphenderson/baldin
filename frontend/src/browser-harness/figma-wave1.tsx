import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-sans-3/800.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { NotificationProvider } from '../context/notification-context';
import { UserContext } from '../context/user-context';
import { THEME_STORAGE_KEY, type ThemeMode } from '../design-system/theme';
import { StatusChip } from '../design-system';
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
type FigmaHarnessState = ApplyCaptureState | AspirationsCaptureState | LeadsCaptureState | null;
type HarnessConfig = {
  screen: FigmaHarnessScreen;
  state: FigmaHarnessState;
  mode: ThemeMode;
};
type HarnessResolution =
  | { kind: 'valid'; config: HarnessConfig }
  | {
    kind: 'error';
    error: {
      message: string;
      requestedScreen: string | null;
      requestedState: string | null;
      mode: ThemeMode;
    };
  };

const ASPIRATION_STATES = ['empty', 'seeded', 'loading', 'suggested', 'no-signal', 'rate-limited'] as const;
const LEADS_STATES = ['unranked', 'ranked', 'disabled', 'error'] as const;
const APPLY_STATES = ['ready', 'already-applied'] as const;
const SUPPORTED_SCREEN_CONFIG = [
  { screen: 'applications', path: '/applications', states: [] },
  { screen: 'profile', path: '/me', states: [] },
  { screen: 'messages', path: '/network/messages', states: [] },
  { screen: 'aspirations-roles', path: '/me/aspirations/roles', states: ASPIRATION_STATES, defaultState: 'empty' },
  { screen: 'aspirations-companies', path: '/me/aspirations/companies', states: ASPIRATION_STATES, defaultState: 'empty' },
  { screen: 'leads', path: '/leads', states: LEADS_STATES, defaultState: 'unranked' },
  { screen: 'apply', path: '/apply', states: APPLY_STATES, defaultState: 'ready' },
] as const satisfies ReadonlyArray<{
  screen: FigmaHarnessScreen;
  path: string;
  states: readonly string[];
  defaultState?: string;
}>;

function isHarnessScreen(value: string): value is FigmaHarnessScreen {
  return SUPPORTED_SCREEN_CONFIG.some((config) => config.screen === value);
}

function getScreenConfig(screen: FigmaHarnessScreen) {
  const config = SUPPORTED_SCREEN_CONFIG.find((entry) => entry.screen === screen);

  if (!config) {
    throw new Error(`Unsupported harness screen configuration for ${screen}.`);
  }

  return config;
}

function screenPath(screen: FigmaHarnessScreen) {
  return getScreenConfig(screen).path;
}

function readMode(value: string | null): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

function isLeadsState(value: string): value is LeadsCaptureState {
  return LEADS_STATES.includes(value as LeadsCaptureState);
}

function isApplyState(value: string): value is ApplyCaptureState {
  return APPLY_STATES.includes(value as ApplyCaptureState);
}

function isAspirationsState(value: string): value is AspirationsCaptureState {
  return ASPIRATION_STATES.includes(value as AspirationsCaptureState);
}

function unsupportedStateMessage(screen: FigmaHarnessScreen, value: string, supportedStates: readonly string[]) {
  if (supportedStates.length === 0) {
    return `The \`${screen}\` harness screen does not accept a \`state\` query parameter.`;
  }

  return `Unsupported \`state\` value "${value}" for \`screen=${screen}\`. Supported states: ${supportedStates.join(', ')}.`;
}

function resolveHarnessRequest(params: URLSearchParams): HarnessResolution {
  const mode = readMode(params.get('mode'));
  const requestedScreen = params.get('screen');
  const requestedState = params.get('state');

  if (!requestedScreen) {
    return {
      kind: 'error',
      error: {
        message: 'Missing required `screen` query parameter.',
        requestedScreen,
        requestedState,
        mode,
      },
    };
  }

  if (!isHarnessScreen(requestedScreen)) {
    return {
      kind: 'error',
      error: {
        message: `Unsupported \`screen\` value "${requestedScreen}".`,
        requestedScreen,
        requestedState,
        mode,
      },
    };
  }

  if (requestedScreen === 'leads') {
    if (requestedState == null) {
      return { kind: 'valid', config: { screen: requestedScreen, state: 'unranked', mode } };
    }
    if (isLeadsState(requestedState)) {
      return { kind: 'valid', config: { screen: requestedScreen, state: requestedState, mode } };
    }
    return {
      kind: 'error',
      error: {
        message: unsupportedStateMessage(requestedScreen, requestedState, LEADS_STATES),
        requestedScreen,
        requestedState,
        mode,
      },
    };
  }

  if (requestedScreen === 'apply') {
    if (requestedState == null) {
      return { kind: 'valid', config: { screen: requestedScreen, state: 'ready', mode } };
    }
    if (isApplyState(requestedState)) {
      return { kind: 'valid', config: { screen: requestedScreen, state: requestedState, mode } };
    }
    return {
      kind: 'error',
      error: {
        message: unsupportedStateMessage(requestedScreen, requestedState, APPLY_STATES),
        requestedScreen,
        requestedState,
        mode,
      },
    };
  }

  if (requestedScreen === 'aspirations-roles' || requestedScreen === 'aspirations-companies') {
    if (requestedState == null) {
      return { kind: 'valid', config: { screen: requestedScreen, state: 'empty', mode } };
    }
    if (isAspirationsState(requestedState)) {
      return { kind: 'valid', config: { screen: requestedScreen, state: requestedState, mode } };
    }
    return {
      kind: 'error',
      error: {
        message: unsupportedStateMessage(requestedScreen, requestedState, ASPIRATION_STATES),
        requestedScreen,
        requestedState,
        mode,
      },
    };
  }

  if (requestedState != null) {
    return {
      kind: 'error',
      error: {
        message: unsupportedStateMessage(requestedScreen, requestedState, []),
        requestedScreen,
        requestedState,
        mode,
      },
    };
  }

  return { kind: 'valid', config: { screen: requestedScreen, state: null, mode } };
}

function UnsupportedHarnessPage({
  message,
  requestedScreen,
  requestedState,
}: {
  message: string;
  requestedScreen: string | null;
  requestedState: string | null;
}) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', py: 8 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Typography variant="overline" sx={{ letterSpacing: '0.14em' }}>
              Baldin Wave 1 Harness
            </Typography>
            <Typography variant="h3" component="h1">
              Unsupported harness request
            </Typography>
            <Typography color="text.secondary">
              {message}
            </Typography>
            <Typography color="text.secondary">
              Wave 2 and Wave 3 closeout follow direct shipped-route review plus MCP structure or screenshot inspection. They are not harness expansion workstreams.
            </Typography>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant="h6">Requested query</Typography>
              <Typography variant="body2" color="text.secondary">
                screen={requestedScreen ?? '(missing)'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                state={requestedState ?? '(missing)'}
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Supported Wave 1 harness screens</Typography>
              {SUPPORTED_SCREEN_CONFIG.map((config) => (
                <Stack key={config.screen} spacing={1.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {config.screen}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {config.path}
                  </Typography>
                  {config.states.length > 0 ? (
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {config.states.map((state) => (
                        <StatusChip key={`${config.screen}-${state}`} label={state} size="small" emphasis="outline" />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No state variants.
                    </Typography>
                  )}
                  {'defaultState' in config && config.defaultState ? (
                    <Typography variant="caption" color="text.secondary">
                      Omit `state` to use the baseline `{config.defaultState}` capture.
                    </Typography>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

const params = new URLSearchParams(window.location.search);
const harnessResolution = resolveHarnessRequest(params);
const mode = harnessResolution.kind === 'valid' ? harnessResolution.config.mode : harnessResolution.error.mode;

document.title = harnessResolution.kind === 'valid'
  ? `Baldin Wave 1 Harness · ${harnessResolution.config.screen}${harnessResolution.config.state ? ` · ${harnessResolution.config.state}` : ''} · ${mode}`
  : `Baldin Wave 1 Harness · Unsupported · ${mode}`;
localStorage.setItem(THEME_STORAGE_KEY, mode);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Harness root element was not found.');
}

let userContextValue: any = null;
let initialEntry = '/';
let aspirationsState: AspirationsCaptureState = 'empty';
let leadsState: LeadsCaptureState = 'unranked';
let applyState: ApplyCaptureState = 'ready';

if (harnessResolution.kind === 'valid') {
  const { screen, state } = harnessResolution.config;
  const user = getCurrentUser();

  userContextValue = {
    user,
    setUser: () => {},
    token: getHarnessToken(),
    setToken: () => {},
    loading: false,
    canAccessTier: () => true,
  } as any;
  initialEntry = screenPath(screen);
  aspirationsState = (
    screen === 'aspirations-roles' || screen === 'aspirations-companies'
      ? state
      : 'empty'
  ) as AspirationsCaptureState;
  leadsState = (screen === 'leads' ? state : 'unranked') as LeadsCaptureState;
  applyState = (screen === 'apply' ? state : 'ready') as ApplyCaptureState;

  localStorage.setItem('baldin_token', getHarnessToken());
  installFigmaWave1FetchMock();
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        {harnessResolution.kind === 'error' ? (
          <UnsupportedHarnessPage
            message={harnessResolution.error.message}
            requestedScreen={harnessResolution.error.requestedScreen}
            requestedState={harnessResolution.error.requestedState}
          />
        ) : (
          <UserContext.Provider value={userContextValue}>
            <MemoryRouter initialEntries={[initialEntry]}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/applications" element={<ApplicationsQueuePage />} />
                  <Route path="/me" element={<ProfilePage />} />
                  <Route
                    path="/me/aspirations/roles"
                    element={<AspirationsCaptureScreen kind="role" state={aspirationsState} />}
                  />
                  <Route
                    path="/me/aspirations/companies"
                    element={<AspirationsCaptureScreen kind="company" state={aspirationsState} />}
                  />
                  <Route path="/network/messages" element={<ConversationsPage />} />
                  <Route path="/leads" element={<LeadsCaptureScreen state={leadsState} />} />
                  <Route path="/apply" element={<ApplyCaptureScreen state={applyState} />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </UserContext.Provider>
        )}
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
