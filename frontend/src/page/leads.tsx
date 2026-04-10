import React, { useContext, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import {
  Box, Typography, Skeleton,
  Pagination as MuiPagination,
  Stack,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Bolt as BoltIcon, Search as SearchIcon, Add as AddIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  extractLead,
} from '../service/leads';
import type {
  LeadRead,
  LeadCreate,
  LeadExtractResponse,
  LeadSharedUpdate,
} from '../service/leads';
import {
  createApplication,
  findExistingApplicationForLead,
  getApplicationStateLabel,
  type ApplicationCreationIntent,
} from '../service/applications';
import { getCompanies, type CompanyRead } from '../service/companies';
import LeadFormDialog from '../component/lead-form-dialog';
import LeadCard from '../component/lead-card';
import LeadModal, { type LeadModalTab } from '../component/lead-modal';
import LeadExtractionBar from '../component/lead-extraction-bar';
import LeadSearchBar from '../component/lead-search-bar';
import ConfirmDialog from '../component/common/confirm-dialog';
import EmptyState from '../component/common/empty-state';
import { useNotification } from '../context/notification-context';

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const PAGE_SIZE = 12;

const filterLeadIntoList = (items: LeadRead[], nextLead: LeadRead, moveToFront = false): LeadRead[] => {
  const nextItems = items.filter((item) => item.id !== nextLead.id);
  if (moveToFront) {
    return [nextLead, ...nextItems];
  }

  const existingIndex = items.findIndex((item) => item.id === nextLead.id);
  if (existingIndex === -1) {
    return [nextLead, ...nextItems];
  }

  nextItems.splice(existingIndex, 0, nextLead);
  return nextItems;
};

const extractMessage = (response: LeadExtractResponse): string => {
  switch (response.disposition) {
    case 'created':
      return 'Lead extracted and added to your board.';
    case 'matched_existing_joined':
      return 'Matched an existing shared lead and joined you to it.';
    default:
      return 'Matched a shared lead you are already tracking.';
  }
};

const creationSuccessMessage = (intent: ApplicationCreationIntent, title: string): string => (
  intent === 'registered'
    ? `Registered interest for "${title}"`
    : `Application created for "${title}"`
);

const duplicateApplicationMessage = (title: string, statusLabel: string): string => (
  `"${title}" already exists in your applications as ${statusLabel}.`
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const LeadsPage: React.FC = () => {
  const { token } = useContext(UserContext);

  // Data
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [companies, setCompanies] = useState<CompanyRead[]>([]);
  const [loading, setLoading] = useState(true);

  // Search / filter / pagination (client-side)
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  // AI Extraction
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Lead detail modal
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadTab, setSelectedLeadTab] = useState<LeadModalTab>('overview');
  const [extractContext, setExtractContext] = useState<LeadExtractResponse | null>(null);

  // Form dialog (create / edit)
  const [formOpen, setFormOpen] = useState(false);
  const [formLead, setFormLead] = useState<LeadRead | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LeadRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick-apply
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Feedback
  const { notify } = useNotification();

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
      const q = deferredSearch.toLowerCase().trim();
      const interestCount = lead.interest_count ?? 0;
      const matchesSearch = !q || [lead.title, lead.description, lead.location, lead.companies?.[0]?.name]
        .some((f) => f?.toLowerCase().includes(q));
      const matchesFilter =
        filter === 'all' ||
        (filter === 'registered' && Boolean(lead.viewer_is_registered)) ||
        (filter === 'active' && (interestCount > 1 || (lead.comment_count ?? 0) > 0)) ||
        (filter === 'remote' && lead.location?.toLowerCase().includes('remote')) ||
        (filter === 'fulltime' && lead.employment_type?.toLowerCase().includes('full'));
      return matchesSearch && matchesFilter;
    });
  }, [deferredSearch, filter, leads]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const joinedCount = useMemo(() => leads.filter((lead) => lead.viewer_is_registered).length, [leads]);
  const activeCount = useMemo(() => leads.filter((lead) => (lead.interest_count ?? 0) > 1 || (lead.comment_count ?? 0) > 0).length, [leads]);
  const discussionCount = useMemo(() => leads.filter((lead) => (lead.comment_count ?? 0) > 0).length, [leads]);

  useEffect(() => { setPage(1); }, [deferredSearch, filter]);

  usePageToolbarHeader('Job Leads', `${joinedCount} joined · ${activeCount} active · ${discussionCount} with discussion`);

  /* ---- Actions ---- */

  const openLead = useCallback((lead: LeadRead, nextTab: LeadModalTab = 'overview', nextExtractContext: LeadExtractResponse | null = null) => {
    setSelectedLeadId(lead.id);
    setSelectedLeadTab(nextTab);
    setExtractContext(nextExtractContext);
  }, []);

  const closeLead = useCallback(() => {
    setSelectedLeadId(null);
    setSelectedLeadTab('overview');
    setExtractContext(null);
  }, []);

  const handleExtract = async () => {
    if (!token || !extractUrl.trim()) return;
    if (!isValidUrl(extractUrl.trim())) {
      notify('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }
    setExtracting(true);
    try {
      const response = await extractLead(token, extractUrl.trim());
      setLeads((current) => filterLeadIntoList(current, response.lead, true));
      setExtractUrl('');
      setPage(1);
      notify(extractMessage(response));
      openLead(response.lead, 'overview', response);
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
      setLeads((current) => current.filter((lead) => lead.id !== deleteTarget.id));
      setDeleteTarget(null);
      notify('Lead deleted');
      if (selectedLeadId === deleteTarget.id) {
        closeLead();
      }
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  const handleSaveForm = async (data: LeadCreate | LeadSharedUpdate) => {
    if (!token) return;
    try {
      if (formLead?.id) {
        const updated = await updateLead(token, formLead.id, data as LeadSharedUpdate);
        setLeads((current) => filterLeadIntoList(current, updated));
        notify('Lead updated');
      } else {
        const created = await createLead(token, data as LeadCreate);
        setLeads((current) => filterLeadIntoList(current, created, true));
        notify('Lead created');
        openLead(created);
      }
      setFormOpen(false);
      setFormLead(null);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to save lead', 'error');
    }
  };

  const handleApply = async (lead: LeadRead, intent: ApplicationCreationIntent) => {
    if (!token) return;
    setApplyingId(lead.id);
    try {
      const title = lead.title || 'Untitled';
      const existingApp = await findExistingApplicationForLead(token, lead.id);
      if (existingApp) {
        notify(duplicateApplicationMessage(title, getApplicationStateLabel(existingApp)), 'warning');
        return;
      }
      await createApplication(token, { lead_id: lead.id, status: intent });
      notify(creationSuccessMessage(intent, title));
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to create application', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const openCreate = () => { setFormLead(null); setFormOpen(true); };

  const handleLeadChange = useCallback((lead: LeadRead) => {
    setLeads((current) => filterLeadIntoList(current, lead));
  }, []);

  const handleLeadDeleted = useCallback((leadId: string) => {
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    if (selectedLeadId === leadId) {
      closeLead();
    }
  }, [closeLead, selectedLeadId]);

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */

  return (
    <Box>
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

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 3 }}>
        <Chip label={`${joinedCount} joined by you`} color="success" variant={joinedCount ? 'filled' : 'outlined'} />
        <Chip label={`${activeCount} active shared leads`} color="secondary" variant={activeCount ? 'filled' : 'outlined'} />
        <Chip label={`${discussionCount} with discussion`} color="primary" variant={discussionCount ? 'filled' : 'outlined'} />
      </Stack>

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
            title="No leads imported yet"
            description="Import a job lead from LinkedIn, Glassdoor, or paste a URL to get started."
            action={{ label: 'Import a Lead', onClick: openCreate, icon: <AddIcon /> }}
          />
        ) : (
          <EmptyState
            icon={<SearchIcon />}
            title="No results match your filters"
            description="Try adjusting your search or clearing filters."
          />
        )
      ) : (
        <Grid container spacing={2}>
          {paged.map((lead) => (
            <Grid size={{ xs: 12, md: 6 }} key={lead.id}>
              <LeadCard
                lead={lead}
                applying={applyingId === lead.id}
                onOpen={(l) => openLead(l)}
                onEdit={(l) => openLead(l, 'edit')}
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

      <LeadModal
        open={Boolean(selectedLeadId)}
        token={token}
        leadId={selectedLeadId}
        companies={companies}
        applying={Boolean(selectedLeadId && applyingId === selectedLeadId)}
        extractContext={extractContext}
        initialTab={selectedLeadTab}
        onClose={closeLead}
        onApply={handleApply}
        onLeadChange={handleLeadChange}
        onLeadDeleted={handleLeadDeleted}
        onNotify={notify}
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
    </Box>
  );
};

export default LeadsPage;
