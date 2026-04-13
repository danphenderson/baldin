import React, { useCallback, useEffect, useMemo, useState, useDeferredValue } from 'react';
import { Box, Button, Skeleton, Tab, Tabs, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  SearchOff as SearchOffIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/notification-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import type {
  AspirationAdapter,
  AspirationItem,
  AspirationKind,
  AspirationCreate,
  AspirationUpdate,
} from '../service/aspirations';
import AspirationCard from './aspiration-card';
import AspirationFormDialog from './aspiration-form-dialog';
import ConfirmDialog from './common/confirm-dialog';
import EmptyState from './common/empty-state';
import SuggestionReviewPanel from './suggestion-review-panel';

/* ------------------------------------------------------------------ */
/*  Cross-navigation tabs                                              */
/* ------------------------------------------------------------------ */

const ASPIRATION_TABS: { kind: AspirationKind; label: string; path: string }[] = [
  { kind: 'role', label: 'Roles', path: '/me/aspirations/roles' },
  { kind: 'company', label: 'Companies', path: '/me/aspirations/companies' },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AspirationsCollectionProps {
  kind: AspirationKind;
  adapter: AspirationAdapter;
  kindLabel: string;
  kindIcon: React.ReactElement;
  emptyTitle: string;
  emptyDescription: string;
  auxiliaryContent?: React.ReactNode;
  /** When true, render the suggestion-review panel. Defaults to false (e.g. harness overrides via auxiliaryContent). */
  showSuggestions?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AspirationsCollection: React.FC<AspirationsCollectionProps> = ({
  kind,
  adapter,
  kindLabel,
  kindIcon,
  emptyTitle,
  emptyDescription,
  auxiliaryContent,
  showSuggestions = false,
}) => {
  const { notify } = useNotification();
  const navigate = useNavigate();

  /* ---- Data ---- */
  const [items, setItems] = useState<AspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* ---- Search (client-side) ---- */
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  /* ---- Form dialog ---- */
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AspirationItem | null>(null);

  /* ---- Delete confirm ---- */
  const [deleteTarget, setDeleteTarget] = useState<AspirationItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Toolbar header ---- */
  const subtitle = loading
    ? undefined
    : `${items.length} ${kindLabel.toLowerCase()}${items.length === 1 ? '' : 's'}`;
  usePageToolbarHeader('Aspirations', subtitle);

  /* ---- Data fetching ---- */

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await adapter.list(kind);
      setItems(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : `Failed to load ${kindLabel.toLowerCase()}s`;
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [adapter, kind, kindLabel, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- Filtering ---- */

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(q)
      || (item.reason?.toLowerCase().includes(q) ?? false)
      || (item.notes?.toLowerCase().includes(q) ?? false),
    );
  }, [items, deferredSearch]);

  /* ---- Handlers ---- */

  const handleCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (item: AspirationItem) => {
    setEditTarget(item);
    setFormOpen(true);
  };

  const handleSaveForm = async (data: AspirationCreate | AspirationUpdate) => {
    try {
      if (editTarget) {
        await adapter.update(editTarget.id, data);
        notify(`${kindLabel} updated`);
      } else {
        await adapter.create(kind, data as AspirationCreate);
        notify(`${kindLabel} added`);
      }
      setFormOpen(false);
      setEditTarget(null);
      await refresh();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : `Failed to save ${kindLabel.toLowerCase()}`, 'error');
    }
  };

  const handleDelete = (item: AspirationItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adapter.remove(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      notify(`${kindLabel} deleted`);
      setDeleteTarget(null);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : `Failed to delete ${kindLabel.toLowerCase()}`, 'error');
    }
    setDeleting(false);
  };

  /* ---- Cross-nav tab index ---- */
  const currentTabIndex = ASPIRATION_TABS.findIndex((t) => t.kind === kind);

  /* ---- Render helpers ---- */
  const hasSearch = deferredSearch.trim() !== '';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Cross-navigation */}
      <Tabs
        value={currentTabIndex}
        onChange={(_, idx) => navigate(ASPIRATION_TABS[idx].path)}
        sx={{ mb: 3 }}
      >
        {ASPIRATION_TABS.map((tab) => (
          <Tab key={tab.kind} label={tab.label} />
        ))}
      </Tabs>

      {/* Search + Add bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          alignItems: { sm: 'center' },
          mb: 3,
        }}
      >
        <TextField
          size="small"
          placeholder={`Search ${kindLabel.toLowerCase()}s…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ mr: 0.75, color: 'text.secondary', fontSize: 20 }} />,
            },
          }}
          sx={{ flexGrow: 1 }}
        />
        {(loading || items.length > 0) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add {kindLabel}
          </Button>
        )}
      </Box>

      {auxiliaryContent}

      {showSuggestions && !auxiliaryContent && (
        <SuggestionReviewPanel
          kind={kind}
          kindLabel={kindLabel}
          adapter={adapter}
          onAccepted={refresh}
        />
      )}

      {/* Content area */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: '12px' }} />
            </Grid>
          ))}
        </Grid>
      ) : loadError && items.length === 0 ? (
        <EmptyState
          icon={<ErrorIcon />}
          title={`Unable to load ${kindLabel.toLowerCase()}s`}
          description={loadError}
          action={{ label: 'Retry', onClick: refresh, icon: <RefreshIcon /> }}
        />
      ) : filtered.length === 0 ? (
        hasSearch ? (
          <EmptyState
            icon={<SearchOffIcon />}
            title={`No matching ${kindLabel.toLowerCase()}s`}
            description="Try a different search term."
          />
        ) : (
          <EmptyState
            icon={kindIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={{ label: `Add ${kindLabel}`, onClick: handleCreate, icon: <AddIcon /> }}
          />
        )
      ) : (
        <Grid container spacing={2}>
          {filtered.map((item) => (
            <Grid size={{ xs: 12, md: 6 }} key={item.id}>
              <AspirationCard
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <AspirationFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleSaveForm}
        item={editTarget}
        kindLabel={kindLabel}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${kindLabel}`}
        message={`Are you sure you want to remove "${deleteTarget?.label ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default AspirationsCollection;
