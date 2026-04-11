import React, { useContext, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import {
  Box, Skeleton, TextField, FormControl, InputLabel, Select, MenuItem, Button, Stack,
  Pagination as MuiPagination,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  SmartToyOutlined as AgentsIcon,
  Search as SearchIcon,
  SearchOff as SearchOffIcon,
  Add as AddIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from '../service/agents';
import type {
  AgentSummaryRead,
  AgentRead,
  AgentCreate,
  AgentUpdate,
  AgentKind,
} from '../service/agents';
import AgentCard from '../component/agent-card';
import AgentFormDialog from '../component/agent-form-dialog';
import ConfirmDialog from '../component/common/confirm-dialog';
import EmptyState from '../component/common/empty-state';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 12;

const KIND_FILTER_OPTIONS: { value: AgentKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All Kinds' },
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'custom', label: 'Custom' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AgentsPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const { notify } = useNotification();
  const navigate = useNavigate();

  /* ---- Data ---- */
  const [agents, setAgents] = useState<AgentSummaryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* ---- Search / filter / pagination (client-side) ---- */
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<AgentKind | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  /* ---- Form dialog ---- */
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AgentRead | null>(null);

  /* ---- Delete confirm ---- */
  const [deleteTarget, setDeleteTarget] = useState<AgentSummaryRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Toolbar header ---- */
  const subtitle = loading
    ? undefined
    : `${agents.length} agent${agents.length === 1 ? '' : 's'}`;
  usePageToolbarHeader('Agents', subtitle);

  /* ---- Data fetching ---- */

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getAgents(token);
      setAgents(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load agents';
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- Filtering + pagination ---- */

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return agents.filter((a) => {
      const matchesSearch = !q
        || a.name.toLowerCase().includes(q)
        || (a.description?.toLowerCase().includes(q) ?? false);
      const matchesKind = kindFilter === 'all' || a.kind === kindFilter;
      return matchesSearch && matchesKind;
    });
  }, [agents, deferredSearch, kindFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* Reset page when filters change */
  useEffect(() => { setPage(1); }, [deferredSearch, kindFilter]);

  /* ---- Handlers ---- */

  const handleCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = async (agent: AgentSummaryRead) => {
    if (!token) return;
    try {
      const full = await getAgent(token, agent.id);
      setEditTarget(full);
      setFormOpen(true);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to load agent', 'error');
    }
  };

  const handleSaveForm = async (data: AgentCreate | AgentUpdate) => {
    if (!token) return;
    try {
      if (editTarget) {
        await updateAgent(token, editTarget.id, data as AgentUpdate);
        notify('Agent updated');
      } else {
        await createAgent(token, data as AgentCreate);
        notify('Agent created');
      }
      setFormOpen(false);
      setEditTarget(null);
      await refresh();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to save agent', 'error');
    }
  };

  const handleDelete = (agent: AgentSummaryRead) => {
    setDeleteTarget(agent);
  };

  const handleConfirmDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAgent(token, deleteTarget.id);
      setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      notify('Agent deleted');
      setDeleteTarget(null);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to delete agent', 'error');
    }
    setDeleting(false);
  };

  const handleToggleEnabled = async (agent: AgentSummaryRead) => {
    if (!token) return;
    const next = !agent.is_enabled;
    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, is_enabled: next } : a));
    try {
      await updateAgent(token, agent.id, { is_enabled: next });
      notify(next ? 'Agent enabled' : 'Agent disabled');
    } catch (e: unknown) {
      setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, is_enabled: !next } : a));
      notify(e instanceof Error ? e.message : 'Failed to update agent', 'error');
    }
  };

  const handleCardClick = (agent: AgentSummaryRead) => {
    navigate(`/automation/agents/${agent.id}`);
  };

  /* ---- Render ---- */

  const hasSearchOrFilter = deferredSearch.trim() !== '' || kindFilter !== 'all';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Action + filter bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ mb: 3 }}
      >
        <TextField
          size="small"
          placeholder="Search agents\u2026"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ mr: 0.75, color: 'text.secondary', fontSize: 20 }} />,
            },
          }}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Kind</InputLabel>
          <Select
            value={kindFilter}
            label="Kind"
            onChange={(e) => setKindFilter(e.target.value as AgentKind | 'all')}
          >
            {KIND_FILTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{ whiteSpace: 'nowrap' }}
        >
          New Agent
        </Button>
      </Stack>

      {/* Card grid */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : loadError && agents.length === 0 ? (
        <EmptyState
          icon={<ErrorIcon />}
          title="Unable to load agents"
          description={loadError}
          action={{ label: 'Retry', onClick: refresh, icon: <RefreshIcon /> }}
        />
      ) : paged.length === 0 ? (
        hasSearchOrFilter ? (
          <EmptyState
            icon={<SearchOffIcon />}
            title="No matching agents"
            description="Try a different search term or filter."
          />
        ) : (
          <EmptyState
            icon={<AgentsIcon />}
            title="Create your first agent"
            description="Agents open reusable AI workspaces for job-search tasks like cover letters, follow-ups, and outreach."
            action={{ label: 'New Agent', onClick: handleCreate, icon: <AddIcon /> }}
          />
        )
      ) : (
        <Grid container spacing={2}>
          {paged.map((agent) => (
            <Grid size={{ xs: 12, md: 6 }} key={agent.id}>
              <AgentCard
                agent={agent}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleEnabled={handleToggleEnabled}
                onClick={handleCardClick}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {!loading && pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <MuiPagination
            count={pageCount}
            page={safePage}
            onChange={(_, v) => setPage(v)}
            shape="rounded"
            size="small"
          />
        </Box>
      )}

      {/* Form dialog */}
      <AgentFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSaveForm}
        agent={editTarget}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Agent"
        message={<>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</>}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default AgentsPage;
