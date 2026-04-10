import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getApplications, updateApplication, deleteApplication,
  type ApplicationRead, type ApplicationUpdate,
} from '../../service/applications';

/* ------------------------------------------------------------------ */
/*  Pipeline stage columns (progression only — no terminal outcomes)   */
/* ------------------------------------------------------------------ */

export interface Column {
  key: string;
  label: string;
  color: string;
}

/** Active board columns — stage progression from applied → offer. */
export const COLUMNS: Column[] = [
  { key: 'applied', label: 'Applied', color: '#06b6d4' },
  { key: 'screening', label: 'Screening', color: '#8b5cf6' },
  { key: 'interview', label: 'Interview', color: '#f59e0b' },
  { key: 'offer', label: 'Offer', color: '#10b981' },
];

/** All stage+outcome column metadata (for queue page stage chips, etc.). */
export const ALL_STATUS_COLUMNS: Column[] = [
  { key: 'registered', label: 'Registered', color: '#94a3b8' },
  ...COLUMNS,
  { key: 'rejected', label: 'Rejected', color: '#f43f5e' },
  { key: 'withdrawn', label: 'Withdrawn', color: '#a1a1aa' },
];

/** Terminal closure outcomes — not board lanes. */
export const OUTCOMES = ['rejected', 'withdrawn'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Resolve the effective stage string for bucketing / display. */
export function effectiveStage(app: ApplicationRead): string {
  return (app.stage ?? app.status ?? 'applied').toLowerCase();
}

/** Return the next stage in the pipeline, or null at the end. */
export function nextStage(current: string): string | null {
  if (current === 'registered') return 'applied';
  const idx = COLUMNS.findIndex((c) => c.key === current);
  if (idx < 0 || idx >= COLUMNS.length - 1) return null;
  return COLUMNS[idx + 1].key;
}

/** @deprecated Use nextStage instead. Kept for backward compat with queue page. */
export function nextStatus(current: string): ApplicationRead['status'] | null {
  const result = nextStage(current);
  return result as ApplicationRead['status'] | null;
}

/** Is this application terminally closed? */
export function isClosed(app: ApplicationRead): boolean {
  const outcome = (app.outcome ?? '').toLowerCase();
  return outcome === 'rejected' || outcome === 'withdrawn';
}

/* ------------------------------------------------------------------ */
/*  Shared applications hook                                           */
/* ------------------------------------------------------------------ */

/** Per-column hint shown when a bucket is empty. */
export const COLUMN_EMPTY_HINTS: Record<string, string> = {
  applied: 'No active applications',
  screening: 'No applications in screening',
  interview: 'All clear — no interviews scheduled',
  offer: 'No offers yet',
};

export interface UseApplicationsReturn {
  applications: ApplicationRead[];
  loading: boolean;
  error: string;
  success: string;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
  refresh: () => Promise<void>;
  handleStatusChange: (appId: string, newStatus: ApplicationRead['status']) => Promise<void>;
  handleAdvance: (app: ApplicationRead) => void;
  handleClose: (app: ApplicationRead, outcome: Outcome) => void;
  handleDelete: (app: ApplicationRead) => void;
  confirmDelete: () => Promise<void>;
  deleteTarget: ApplicationRead | null;
  setDeleteTarget: (app: ApplicationRead | null) => void;
  /** Buckets for active board columns (applied → offer). */
  buckets: Map<string, ApplicationRead[]>;
  /** Pre-board intake applications (stage = registered, no outcome). */
  registeredApps: ApplicationRead[];
  /** Terminally closed apps (rejected or withdrawn). */
  closedApps: ApplicationRead[];
  /** Number of applications with a next_step_due date in the past. */
  overdueCount: number;
  /** Map of application ID → { hasResume, hasCoverLetter }. Empty while loading. */
  appDocMeta: Map<string, { hasResume: boolean; hasCoverLetter: boolean }>;
  appDocMetaLoading: boolean;
}

export function useApplications(token: string | null): UseApplicationsReturn {
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ApplicationRead | null>(null);

  /* ---- Document metadata for filters (loaded on demand, not per-item) ---- */
  const [appDocMeta] = useState<Map<string, { hasResume: boolean; hasCoverLetter: boolean }>>(new Map());
  const appDocMetaLoading = false;

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const apps = await getApplications(token);
      setApplications(apps || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- Bucket apps into registered, board columns, and closed ---- */
  const { buckets, registeredApps, closedApps } = useMemo(() => {
    const map = new Map<string, ApplicationRead[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    const registered: ApplicationRead[] = [];
    const closed: ApplicationRead[] = [];

    for (const app of applications) {
      if (isClosed(app)) {
        closed.push(app);
        continue;
      }
      const stage = effectiveStage(app);
      if (stage === 'registered') {
        registered.push(app);
        continue;
      }
      const bucket = map.get(stage);
      if (bucket) bucket.push(app);
      else map.get('applied')!.push(app);
    }
    return { buckets: map, registeredApps: registered, closedApps: closed };
  }, [applications]);

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return applications.filter(
      (a) => a.next_step_due && new Date(a.next_step_due).getTime() < now,
    ).length;
  }, [applications]);

  const handleStatusChange = async (appId: string, newStatus: ApplicationRead['status']) => {
    if (!token) return;
    const previousStatus = applications.find((app) => app.id === appId)?.status ?? null;
    const previousStage = applications.find((app) => app.id === appId)?.stage ?? null;
    const previousOutcome = applications.find((app) => app.id === appId)?.outcome ?? null;

    // Determine whether the new status is a stage or outcome for optimistic update
    const isOutcome = newStatus === 'rejected' || newStatus === 'withdrawn';
    const optimisticStage = isOutcome ? previousStage : (newStatus as ApplicationRead['stage']);
    const optimisticOutcome = isOutcome ? (newStatus as ApplicationRead['outcome']) : null;

    setApplications((prev) =>
      prev.map((a) => (a.id === appId
        ? { ...a, status: newStatus, stage: optimisticStage, outcome: optimisticOutcome }
        : a)),
    );
    try {
      const updatedApp = await updateApplication(token, appId, { status: newStatus } as ApplicationUpdate);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? updatedApp : a)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
      setApplications((prev) =>
        prev.map((a) => (a.id === appId
          ? { ...a, status: previousStatus, stage: previousStage, outcome: previousOutcome }
          : a)),
      );
      refresh();
    }
  };

  const handleAdvance = (app: ApplicationRead) => {
    const stage = effectiveStage(app);
    const next = nextStage(stage);
    if (next) handleStatusChange(app.id, next as ApplicationRead['status']);
  };

  const handleClose = (app: ApplicationRead, outcome: Outcome) => {
    handleStatusChange(app.id, outcome as ApplicationRead['status']);
  };

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      await deleteApplication(token, deleteTarget.id);
      setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      showSuccess('Application deleted');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete application');
    }
    setDeleteTarget(null);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    const id = window.setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(id);
  };

  const handleDelete = (app: ApplicationRead) => {
    setDeleteTarget(app);
  };

  return {
    applications,
    loading,
    error,
    success,
    setError,
    setSuccess,
    refresh,
    handleStatusChange,
    handleAdvance,
    handleClose,
    handleDelete,
    confirmDelete,
    deleteTarget,
    setDeleteTarget,
    buckets,
    registeredApps,
    closedApps,
    overdueCount,
    appDocMeta,
    appDocMetaLoading,
  };
}
