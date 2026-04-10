import type { Theme } from '@mui/material/styles';

/* ------------------------------------------------------------------ */
/*  Semantic status & domain color tokens                              */
/*                                                                     */
/*  Standalone lookup that reads from the MUI theme palette where      */
/*  possible.  Pages reference these tokens instead of raw hex.        */
/* ------------------------------------------------------------------ */

/** Resolve a status-colors map for the current theme. */
export function getStatusColors(theme: Theme) {
  const p = theme.palette;

  return {
    /* ---- application stages ---- */
    registered: p.text.secondary,          // #94a3b8 / #475569
    applied: p.primary.main,               // #06b6d4 / #0891b2
    screening: p.secondary.main,           // #8b5cf6 / #7c3aed
    interview: p.warning.main,             // #f59e0b / #d97706
    offer: p.success.main,                 // #10b981 / #059669
    rejected: p.error.main,                // #f43f5e / #e11d48
    withdrawn: p.mode === 'dark' ? '#a1a1aa' : '#71717a',

    /* ---- pipeline / orchestration statuses ---- */
    success: p.success.main,
    failure: p.error.main,
    pending: p.warning.main,
    running: p.primary.main,
    pending_review: p.secondary.main,

    /* ---- crawler-specific extras ---- */
    failed: p.error.main,
    cancelled: p.text.secondary,
    paused: p.mode === 'dark' ? '#eab308' : '#ca8a04',

    /* ---- priority levels ---- */
    urgent: p.error.main,
    high: p.mode === 'dark' ? '#f97316' : '#ea580c',
    medium: p.mode === 'dark' ? '#3b82f6' : '#2563eb',
    low: p.text.secondary,

    /* ---- dashboard-only stage aliases ---- */
    interviewing: p.mode === 'dark' ? '#6366f1' : '#4f46e5',

    /* ---- brand / platform colors ---- */
    linkedin: '#0a66c2',
    glassdoor: '#0caa41',
  } as const;
}

export type StatusColorKey = keyof ReturnType<typeof getStatusColors>;
