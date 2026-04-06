import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getApplications, updateApplication, deleteApplication,
  getApplicationDocuments,
  type ApplicationRead,
} from '../../service/applications';

/* ------------------------------------------------------------------ */
/*  Pipeline columns                                                   */
/* ------------------------------------------------------------------ */

export interface Column {
  key: string;
  label: string;
  color: string;
}

export const COLUMNS: Column[] = [
  { key: 'applied', label: 'Applied', color: '#06b6d4' },
  { key: 'screening', label: 'Screening', color: '#8b5cf6' },
  { key: 'interview', label: 'Interview', color: '#f59e0b' },
  { key: 'offer', label: 'Offer', color: '#10b981' },
  { key: 'rejected', label: 'Rejected', color: '#f43f5e' },
];

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

export function nextStatus(current: string): ApplicationRead['status'] | null {
  const idx = COLUMNS.findIndex((c) => c.key === current);
  if (idx < 0 || idx >= COLUMNS.length - 2) return null;
  return COLUMNS[idx + 1].key as ApplicationRead['status'];
}

/* ------------------------------------------------------------------ */
/*  Shared applications hook                                           */
/* ------------------------------------------------------------------ */

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
  handleDelete: (app: ApplicationRead) => void;
  confirmDelete: () => Promise<void>;
  deleteTarget: ApplicationRead | null;
  setDeleteTarget: (app: ApplicationRead | null) => void;
  buckets: Map<string, ApplicationRead[]>;
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

  /* ---- Document metadata for filters ---- */
  const [appDocMeta, setAppDocMeta] = useState<Map<string, { hasResume: boolean; hasCoverLetter: boolean }>>(new Map());
  const [appDocMetaLoading, setAppDocMetaLoading] = useState(false);

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

  /* ---- Fetch document metadata for each application ---- */
  useEffect(() => {
    if (!token || applications.length === 0) {
      setAppDocMeta(new Map());
      return;
    }

    let cancelled = false;
    setAppDocMetaLoading(true);

    const load = async () => {
      const meta = new Map<string, { hasResume: boolean; hasCoverLetter: boolean }>();
      await Promise.all(
        applications.map(async (app) => {
          try {
            const docs = await getApplicationDocuments(token, app.id);
            meta.set(app.id, {
              hasResume: Array.isArray(docs) && docs.some((d) => d.kind === 'resume'),
              hasCoverLetter: Array.isArray(docs) && docs.some((d) => d.kind === 'cover_letter'),
            });
          } catch {
            meta.set(app.id, { hasResume: false, hasCoverLetter: false });
          }
        }),
      );
      if (!cancelled) {
        setAppDocMeta(meta);
        setAppDocMetaLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [token, applications]);

  const buckets = useMemo(() => {
    const map = new Map<string, ApplicationRead[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    for (const app of applications) {
      const status = (app.status || 'applied').toLowerCase();
      const bucket = map.get(status);
      if (bucket) bucket.push(app);
      else map.get('applied')!.push(app);
    }
    return map;
  }, [applications]);

  const handleStatusChange = async (appId: string, newStatus: ApplicationRead['status']) => {
    if (!token) return;
    const previousStatus = applications.find((app) => app.id === appId)?.status ?? null;
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)),
    );
    try {
      const updatedApp = await updateApplication(token, appId, { status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? updatedApp : a)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: previousStatus } : a)),
      );
      refresh();
    }
  };

  const handleAdvance = (app: ApplicationRead) => {
    const next = nextStatus((app.status || 'applied').toLowerCase());
    if (next) handleStatusChange(app.id, next);
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
    handleDelete,
    confirmDelete,
    deleteTarget,
    setDeleteTarget,
    buckets,
    appDocMeta,
    appDocMetaLoading,
  };
}
