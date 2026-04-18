import React, { useCallback, useEffect, useMemo, useState, useDeferredValue } from 'react';
import { Box, Button, Skeleton, Tab, Tabs } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
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
import {
  ConfirmDialog,
  EmptyState,
  MetricStrip,
  SearchField,
  SituationHeader,
} from '../design-system';
import AspirationCard from './aspiration-card';
import AspirationFormDialog from './aspiration-form-dialog';
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
  const theme = useTheme();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const singularLabel = kindLabel.toLowerCase();
  const pluralLabel = kind === 'company' ? 'companies' : 'roles';

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
    : `${items.length} ${items.length === 1 ? singularLabel : pluralLabel}`;
  usePageToolbarHeader('Aspirations', subtitle);

  /* ---- Data fetching ---- */

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await adapter.list(kind);
      setItems(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : `Failed to load ${pluralLabel}`;
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [adapter, kind, notify, pluralLabel]);

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

  const hasSearch = deferredSearch.trim() !== '';
  const metricItems = useMemo(() => {
    if (items.length === 0) {
      return [];
    }

    const withReason = items.filter((item) => item.reason?.trim()).length;
    const withNotes = items.filter((item) => item.notes?.trim()).length;

    return [
      {
        label: `Saved ${pluralLabel}`,
        value: items.length,
      },
      {
        label: 'With rationale',
        value: withReason,
      },
      {
        label: 'With notes',
        value: withNotes,
      },
      ...(hasSearch
        ? [{
            label: 'Matching search',
            value: filtered.length,
            color: 'var(--mui-palette-primary-main)',
          }]
        : []),
    ];
  }, [filtered.length, hasSearch, items, pluralLabel]);

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

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <SituationHeader
        title="Aspirations"
        titleVariant="compact"
        density="compact"
        context={(
          <Tabs
            value={kind}
            onChange={(_, nextKind: AspirationKind) => {
              const nextTab = ASPIRATION_TABS.find((tab) => tab.kind === nextKind);
              if (nextTab) {
                navigate(nextTab.path);
              }
            }}
            aria-label="Aspiration type"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 0,
              '& .MuiTabs-flexContainer': {
                gap: 1,
              },
              '& .MuiTabs-indicator': {
                display: 'none',
              },
              '& .MuiTab-root': {
                minHeight: 28,
                minWidth: 'auto',
                px: 1.5,
                py: 0.5,
                borderRadius: '12px',
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8125rem',
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'text.primary',
                bgcolor: alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === 'dark' ? 0.18 : 0.12,
                ),
                fontWeight: 700,
              },
            }}
          >
            {ASPIRATION_TABS.map((tab) => (
              <Tab key={tab.kind} value={tab.kind} label={tab.label} />
            ))}
          </Tabs>
        )}
        actions={(
          <>
            {(loading || items.length > 0) && (
              <SearchField
                size="small"
                placeholder={`Search ${pluralLabel}`}
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  width: { xs: '100%', sm: 240 },
                  '& .MuiInputBase-root': {
                    backgroundColor: 'background.paper',
                  },
                }}
              />
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add {kindLabel}
            </Button>
          </>
        )}
        footer={metricItems.length > 0 ? (
          <MetricStrip
            items={metricItems}
            variant="inline"
            align="start"
            dividers={false}
          />
        ) : undefined}
        divider
        sx={{ mb: 3 }}
      />

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
          title={`Unable to load ${pluralLabel}`}
          description={loadError}
          action={{ label: 'Retry', onClick: refresh, icon: <RefreshIcon /> }}
        />
      ) : filtered.length === 0 ? (
        hasSearch ? (
          <EmptyState
            icon={<SearchOffIcon />}
            title={`No matching ${pluralLabel}`}
            description="Try a different search term."
          />
        ) : (
          <EmptyState
            icon={kindIcon}
            title={emptyTitle}
            description={emptyDescription}
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
