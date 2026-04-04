import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Stack, Skeleton, Snackbar, Alert,
  IconButton, Tooltip, Pagination as MuiPagination, useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Bolt as BoltIcon, Search as SearchIcon, Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  getLeads, createLead, updateLead, deleteLead, extractLead,
  type LeadRead, type LeadCreate, type LeadUpdate,
} from '../service/leads';
import { createApplication } from '../service/applications';
import { getCompanies, type CompanyRead } from '../service/companies';
import LeadFormDialog from '../component/lead-modal';
import LeadCard from '../component/lead-card';
import LeadExtractionBar from '../component/lead-extraction-bar';
import LeadSearchBar from '../component/lead-search-bar';
import ConfirmDialog from '../component/common/confirm-dialog';
import EmptyState from '../component/common/empty-state';

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const PAGE_SIZE = 12;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const LeadsPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);

  // Data
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [companies, setCompanies] = useState<CompanyRead[]>([]);
  const [loading, setLoading] = useState(true);

  // Search / filter / pagination (client-side)
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  // AI Extraction
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Card expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form dialog (create / edit)
  const [formOpen, setFormOpen] = useState(false);
  const [formLead, setFormLead] = useState<LeadRead | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LeadRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick-apply
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Feedback
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const notify = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  /* ---- Data fetching ---- */

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [res, co] = await Promise.all([
        getLeads(token, { page: 1, page_size: 500, request_count: false }),
        getCompanies(token),
      ]);
      setLeads(res.leads ?? []);
      setCompanies(co ?? []);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to load leads', 'error');
    }
    setLoading(false);
  }, [token, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- Filtering + pagination ---- */

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || [lead.title, lead.description, lead.location, lead.companies?.[0]?.name]
        .some((f) => f?.toLowerCase().includes(q));
      const matchesFilter =
        filter === 'all' ||
        (filter === 'remote' && lead.location?.toLowerCase().includes('remote')) ||
        (filter === 'fulltime' && lead.employment_type?.toLowerCase().includes('full'));
      return matchesSearch && matchesFilter;
    });
  }, [leads, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filter]);

  /* ---- Actions ---- */

  const handleExtract = async () => {
    if (!token || !extractUrl.trim()) return;
    if (!isValidUrl(extractUrl.trim())) {
      notify('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }
    setExtracting(true);
    try {
      await extractLead(token, extractUrl.trim());
      setExtractUrl('');
      notify('Lead extracted successfully');
      refresh();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Extraction failed', 'error');
    }
    setExtracting(false);
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLead(token, deleteTarget.id);
      setDeleteTarget(null);
      notify('Lead deleted');
      refresh();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  const handleSaveForm = async (data: LeadCreate | LeadUpdate) => {
    if (!token) return;
    try {
      if (formLead?.id) {
        await updateLead(token, formLead.id, data as LeadUpdate);
        notify('Lead updated');
      } else {
        await createLead(token, data as LeadCreate);
        notify('Lead created');
      }
      setFormOpen(false);
      setFormLead(null);
      await refresh();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to save lead', 'error');
    }
  };

  const handleApply = async (lead: LeadRead) => {
    if (!token) return;
    setApplyingId(lead.id);
    try {
      await createApplication(token, { lead_id: lead.id, status: 'applied' });
      notify(`Application created for "${lead.title || 'Untitled'}"`);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to create application', 'error');
    }
    setApplyingId(null);
  };

  const openCreate = () => { setFormLead(null); setFormOpen(true); };

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Job Leads</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {loading ? 'Loading...' : `${filtered.length} lead${filtered.length !== 1 ? 's' : ''} ${search || filter !== 'all' ? 'matched' : 'tracked'}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh leads">
            <IconButton
              onClick={refresh}
              aria-label="Refresh leads"
              sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2.5 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
            Add Lead
          </Button>
        </Stack>
      </Box>

      {/* ── AI Extraction Bar ── */}
      <LeadExtractionBar
        url={extractUrl}
        extracting={extracting}
        onUrlChange={setExtractUrl}
        onExtract={handleExtract}
      />

      {/* ── Search, Filter, Pagination ── */}
      <LeadSearchBar
        search={search}
        filter={filter}
        page={safePage}
        pageCount={pageCount}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onPageChange={setPage}
      />

      {/* ── Lead Cards ── */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : paged.length === 0 ? (
        leads.length === 0 ? (
          <EmptyState
            icon={<BoltIcon />}
            title="No leads yet"
            description="Paste a job posting URL above to auto-extract your first lead, or add one manually."
            action={{ label: 'Add Lead Manually', onClick: openCreate, icon: <AddIcon /> }}
          />
        ) : (
          <EmptyState
            icon={<SearchIcon />}
            title="No matches"
            description="Try adjusting your search or filter criteria."
          />
        )
      ) : (
        <Grid container spacing={2}>
          {paged.map((lead) => (
            <Grid size={{ xs: 12, md: 6 }} key={lead.id}>
              <LeadCard
                lead={lead}
                expanded={expandedId === lead.id}
                applying={applyingId === lead.id}
                onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                onEdit={(l) => { setFormLead(l); setFormOpen(true); }}
                onDelete={setDeleteTarget}
                onApply={handleApply}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Bottom pagination (for long pages) ── */}
      {!loading && pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <MuiPagination
            count={pageCount}
            page={safePage}
            onChange={(_, v) => setPage(v)}
            shape="rounded"
            sx={{ '& .MuiPaginationItem-root': { fontWeight: 600 } }}
          />
        </Box>
      )}

      {/* ── Form Dialog (create / edit) ── */}
      <LeadFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setFormLead(null); }}
        onSave={handleSaveForm}
        lead={formLead}
        companies={companies}
      />

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Lead"
        message={
          <>
            Are you sure you want to delete{' '}
            <Typography component="span" fontWeight={600} color="text.primary">
              {deleteTarget?.title || 'this lead'}
            </Typography>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Snackbar (transient feedback) ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeadsPage;
