/**
 * Sentry SDK bootstrap for the baldin-ui project.
 *
 * This file MUST be imported before any other application imports in
 * index.tsx so the SDK can instrument React error boundaries, fetch
 * calls, and the router before they are first used.
 *
 * When VITE_SENTRY_DSN is empty the init call is a no-op and no data
 * is sent.
 */
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN ?? '';
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'DEV';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release: import.meta.env.VITE_APP_VERSION ?? undefined,
    // Keep tracing off by default; enable per-environment via env var.
    tracesSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0',
    ),
    sendDefaultPii: environment === 'DEV',
  });
}

export default Sentry;
