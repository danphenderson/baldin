import type { Theme } from '@mui/material/styles';

const MODE_STATUS_TOKENS = {
  dark: {
    application: {
      withdrawn: '#a1a1aa',
      interviewing: '#6366f1',
    },
    crawler: {
      paused: '#eab308',
    },
    priority: {
      high: '#f97316',
      medium: '#3b82f6',
    },
  },
  light: {
    application: {
      withdrawn: '#71717a',
      interviewing: '#4f46e5',
    },
    crawler: {
      paused: '#ca8a04',
    },
    priority: {
      high: '#ea580c',
      medium: '#2563eb',
    },
  },
} as const;

const PLATFORM_STATUS_TOKENS = {
  linkedin: '#0a66c2',
  glassdoor: '#0caa41',
} as const;

export function getStatusTokens(theme: Theme) {
  const modeTokens = MODE_STATUS_TOKENS[theme.palette.mode];
  const palette = theme.palette;

  return {
    application: {
      registered: palette.text.secondary,
      applied: palette.primary.main,
      screening: palette.secondary.main,
      interview: palette.warning.main,
      interviewing: modeTokens.application.interviewing,
      offer: palette.success.main,
      rejected: palette.error.main,
      withdrawn: modeTokens.application.withdrawn,
    },
    workflow: {
      success: palette.success.main,
      failure: palette.error.main,
      pending: palette.warning.main,
      running: palette.primary.main,
      pending_review: palette.secondary.main,
    },
    crawler: {
      failed: palette.error.main,
      cancelled: palette.text.secondary,
      paused: modeTokens.crawler.paused,
    },
    priority: {
      urgent: palette.error.main,
      high: modeTokens.priority.high,
      medium: modeTokens.priority.medium,
      low: palette.text.secondary,
    },
    platform: PLATFORM_STATUS_TOKENS,
  } as const;
}

export type StatusTokens = ReturnType<typeof getStatusTokens>;

export function getStatusColors(theme: Theme) {
  const status = getStatusTokens(theme);

  return {
    primary: theme.palette.primary.main,
    registered: status.application.registered,
    applied: status.application.applied,
    screening: status.application.screening,
    interview: status.application.interview,
    offer: status.application.offer,
    rejected: status.application.rejected,
    withdrawn: status.application.withdrawn,
    success: status.workflow.success,
    failure: status.workflow.failure,
    pending: status.workflow.pending,
    running: status.workflow.running,
    pending_review: status.workflow.pending_review,
    failed: status.crawler.failed,
    cancelled: status.crawler.cancelled,
    paused: status.crawler.paused,
    urgent: status.priority.urgent,
    high: status.priority.high,
    medium: status.priority.medium,
    low: status.priority.low,
    interviewing: status.application.interviewing,
    linkedin: status.platform.linkedin,
    glassdoor: status.platform.glassdoor,
  } as const;
}

export type StatusColorKey = keyof ReturnType<typeof getStatusColors>;
