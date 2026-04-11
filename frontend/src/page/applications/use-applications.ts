import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  getApplications, updateApplication, deleteApplication,
  type ApplicationRead, type ApplicationUpdate,
} from '../../service/applications';
import { getStatusColors } from '../../theme/status-colors';

/* ------------------------------------------------------------------ */
/*  Pipeline stage columns (progression only — no terminal outcomes)   */
/* ------------------------------------------------------------------ */

export interface Column {
  key: string;
  label: string;
  color: string;
}

/** Hook that returns stage columns with theme-aware colors. */
export function useStageColumns() {
  const theme = useTheme();
  const sc = getStatusColors(theme);

  return useMemo(() => {
    /** Active board columns — stage progression from applied → offer. */
    const columns: Column[] = [
      { key: 'applied', label: 'Applied', color: sc.applied },
      { key: 'screening', label: 'Screening', color: sc.screening },
      { key: 'interview', label: 'Interview', color: sc.interview },
      { key: 'offer', label: 'Offer', color: sc.offer },
    ];

    /** All stage+outcome column metadata (for queue page stage chips, etc.). */
    const allStatusColumns: Column[] = [
      { key: 'registered', label: 'Registered', color: sc.registered },
      ...columns,
      { key: 'rejected', label: 'Rejected', color: sc.rejected },
      { key: 'withdrawn', label: 'Withdrawn', color: sc.withdrawn },
    ];

    return { columns, allStatusColumns };
  }, [sc]);
}

/** Static stage progression keys for pure logic (no color needed). */
const STAGE_KEYS = ['applied', 'screening', 'interview', 'offer'];

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
  return (app.stage ?? 'applied').toLowerCase();
}

/** Return the next stage in the pipeline, or null at the end. */
export function nextStage(current: string): string | null {
  if (current === 'registered') return 'applied';
  const idx = STAGE_KEYS.indexOf(current);
  if (idx < 0 || idx >= STAGE_KEYS.length - 1) return null;
  return STAGE_KEYS[idx + 1];
}

/** Is this application terminally closed? */
export function isClosed(app: ApplicationRead): boolean {
  const outcome = (app.outcome ?? '').toLowerCase();
  return outcome === 'rejected' || outcome === 'withdrawn';
}

export function applicationDocumentCount(app: Pick<ApplicationRead, 'document_metadata'>): number {
  return app.document_metadata?.total_count ?? 0;
}

export function applicationHasResume(app: Pick<ApplicationRead, 'document_metadata'>): boolean {
  return app.document_metadata?.has_resume ?? false;
}

export function applicationHasCoverLetter(app: Pick<ApplicationRead, 'document_metadata'>): boolean {
  return app.document_metadata?.has_cover_letter ?? false;
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
  handleStatusChange: (appId: string, newStatus: string) => Promise<void>;
  handleReminderUpdate: (
    appId: string,
    reminder: Pick<ApplicationUpdate, 'next_step' | 'next_step_due'>,
  ) => Promise<ApplicationRead>;
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
}

export function useApplications(token: string | null): UseApplicationsReturn {
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ApplicationRead | null>(null);

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

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    window.setTimeout(() => setSuccess(''), 3000);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- Bucket apps into registered, board columns, and closed ---- */
  const { buckets, registeredApps, closedApps } = useMemo(() => {
    const map = new Map<string, ApplicationRead[]>();
    for (const key of STAGE_KEYS) map.set(key, []);
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

  const handleStatusChange = async (appId: string, newStatus: string) => {
    if (!token) return;

    const previousApplication = applications.find((app) => app.id === appId);
    if (!previousApplication) return;

    const previousStage = previousApplication.stage ?? null;
    const previousOutcome = previousApplication.outcome ?? null;
    const shouldReopen = (
      (previousOutcome === 'rejected' || previousOutcome === 'withdrawn')
      && newStatus !== 'rejected'
      && newStatus !== 'withdrawn'
    );

    // Determine whether the new status is a stage or outcome for optimistic update
    const isOutcome = newStatus === 'rejected' || newStatus === 'withdrawn';
    const optimisticStage = isOutcome ? previousStage : (newStatus as ApplicationRead['stage']);
    const optimisticOutcome = isOutcome ? (newStatus as ApplicationRead['outcome']) : null;

    setApplications((prev) =>
      prev.map((a) => (a.id === appId
        ? { ...a, stage: optimisticStage, outcome: optimisticOutcome }
        : a)),
    );
    try {
      const payload: ApplicationUpdate = isOutcome
        ? { outcome: newStatus as ApplicationRead['outcome'] }
        : { stage: newStatus as ApplicationRead['stage'], outcome: null };
      if (shouldReopen) (payload as any).reopen = true;
      const updatedApp = await updateApplication(token, appId, payload);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? updatedApp : a)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
      setApplications((prev) =>
        prev.map((a) => (a.id === appId
          ? { ...a, stage: previousStage, outcome: previousOutcome }
          : a)),
      );
      refresh();
    }
  };

  const handleAdvance = (app: ApplicationRead) => {
    const stage = effectiveStage(app);
    const next = nextStage(stage);
    if (next) handleStatusChange(app.id, next);
  };

  const handleClose = (app: ApplicationRead, outcome: Outcome) => {
    handleStatusChange(app.id, outcome);
  };

  const handleReminderUpdate = async (
    appId: string,
    reminder: Pick<ApplicationUpdate, 'next_step' | 'next_step_due'>,
  ): Promise<ApplicationRead> => {
    if (!token) throw new Error('Missing auth token');

    const previousApplication = applications.find((app) => app.id === appId);
    if (!previousApplication) throw new Error('Application not found');

    const normalizedReminder: Pick<ApplicationUpdate, 'next_step' | 'next_step_due'> = {
      next_step: reminder.next_step ?? null,
      next_step_due: reminder.next_step_due ?? null,
    };

    setApplications((prev) => prev.map((app) => (
      app.id === appId
        ? { ...app, ...normalizedReminder }
        : app
    )));

    try {
      const updatedApp = await updateApplication(token, appId, normalizedReminder as ApplicationUpdate);
      setApplications((prev) => prev.map((app) => (app.id === appId ? updatedApp : app)));
      showSuccess(normalizedReminder.next_step || normalizedReminder.next_step_due ? 'Reminder updated' : 'Reminder cleared');
      return updatedApp;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update reminder');
      setApplications((prev) => prev.map((app) => (app.id === appId ? previousApplication : app)));
      void refresh();
      throw (e instanceof Error ? e : new Error('Failed to update reminder'));
    }
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
    handleReminderUpdate,
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
  };
}
