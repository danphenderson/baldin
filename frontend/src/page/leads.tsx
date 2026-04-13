import React, { useContext, useEffect, useState, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import {
  Box, Typography,
  Pagination as MuiPagination,
  Stack,
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
  rankLeads,
  MAX_ASPIRATION_MATCH_LEADS,
} from '../service/leads';
import type {
  LeadRead,
  LeadCreate,
  LeadExtractResponse,
  LeadSharedUpdate,
  LeadRankResponse,
  LeadRankedEntryRead,
} from '../service/leads';
import {
  createApplication,
  getApplications,
  findExistingApplicationForLead,
  getApplicationStateLabel,
  type ApplicationRead,
  type ApplicationCreationIntent,
} from '../service/applications';
import { getCompanies, type CompanyRead } from '../service/companies';
import { getAspirations } from '../service/aspirations';
import LeadFormDialog from '../component/lead-form-dialog';
import LeadCard from '../component/lead-card';
import LeadModal, { type LeadModalTab } from '../component/lead-modal';
import LeadExtractionBar from '../component/lead-extraction-bar';
import LeadSearchBar from '../component/lead-search-bar';
import ConfirmDialog from '../component/common/confirm-dialog';
import EmptyState from '../component/common/empty-state';
import { LoadingState, MetricStrip } from '../design-system';
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

const formatApplicationLabel = (statusLabel: string): string => (
  statusLabel ? `${statusLabel.charAt(0).toUpperCase()}${statusLabel.slice(1)}` : 'Tracked'
);

const buildExistingApplicationHandoff = (application: Pick<ApplicationRead, 'outcome' | 'stage'>) => {
  const statusLabel = getApplicationStateLabel(application);
  return {
    state: 'already-applied' as const,
    message: 'An existing application is already in the pipeline for this lead.',
    applicationLabel: formatApplicationLabel(statusLabel),
    ctaLabel: 'Application exists',
  };
};

const buildReadyHandoff = (relevanceScore: number) => ({
  state: 'ready' as const,
  message: relevanceScore >= 7
    ? 'High aspiration fit — ready to apply?'
    : relevanceScore >= 4
      ? 'Moderate aspiration fit — consider applying.'
      : 'Low aspiration fit — review alignment before applying.',
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const LeadsPage: React.FC = () => {
  const { token } = useContext(UserContext);

  // Data
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [companies, setCompanies] = useState<CompanyRead[]>([]);
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [applicationsPreloaded, setApplicationsPreloaded] = useState(false);
  const [aspirationCount, setAspirationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rankingResult, setRankingResult] = useState<LeadRankResponse | null>(null);
  const [rankingPending, setRankingPending] = useState(false);

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
  const rankingRequestIdRef = useRef(0);

  // Feedback
  const { notify } = useNotification();
  const clearRanking = useCallback(() => {
    rankingRequestIdRef.current += 1;
    setRankingResult(null);
    setRankingPending(false);
  }, []);

  /* ---- Data fetching ---- */

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [leadResult, companyResult, applicationResult, aspirationResult] = await Promise.allSettled([
        getLeads(token, { page: 1, page_size: 500, request_count: false }),
        getCompanies(token),
        getApplications(token),
        getAspirations(token),
      ]);

      if (leadResult.status !== 'fulfilled') {
        throw leadResult.reason;
      }
      if (companyResult.status !== 'fulfilled') {
        throw companyResult.reason;
      }

      setLeads(leadResult.value.items ?? []);
      setCompanies(companyResult.value ?? []);
      if (applicationResult.status === 'fulfilled') {
        setApplications(applicationResult.value ?? []);
        setApplicationsPreloaded(true);
      } else {
        setApplications([]);
        setApplicationsPreloaded(false);
      }
      if (aspirationResult.status === 'fulfilled') {
        setAspirationCount(aspirationResult.value.length);
      } else {
        setAspirationCount(0);
        notify(
          aspirationResult.reason instanceof Error
            ? aspirationResult.reason.message
            : 'Failed to load aspirations',
          'error',
        );
      }
      clearRanking();
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to load leads', 'error');
    }
    setLoading(false);
  }, [token, notify, clearRanking]);

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

  const rankingByLeadId = useMemo(() => {
    const entries = new Map<string, LeadRankedEntryRead>();
    for (const entry of rankingResult?.ranked_leads ?? []) {
      entries.set(entry.lead_id, entry);
    }
    return entries;
  }, [rankingResult]);

  const applicationsByLeadId = useMemo(() => {
    const entries = new Map<string, ApplicationRead>();

    for (const application of applications) {
      if (application.lead_id) {
        entries.set(application.lead_id, application);
      }
    }

    return entries;
  }, [applications]);

  const rankedFiltered = useMemo(() => {
    if (!rankingResult) {
      return filtered;
    }

    const order = new Map<string, number>();
    (rankingResult.ranked_leads ?? []).forEach((entry, index) => {
      order.set(entry.lead_id, index);
    });

    return filtered
      .map((lead, index) => ({
        lead,
        baseIndex: index,
        rankIndex: order.get(lead.id),
      }))
      .sort((left, right) => {
        if (left.rankIndex !== undefined && right.rankIndex !== undefined) {
          return left.rankIndex - right.rankIndex;
        }
        if (left.rankIndex !== undefined) {
          return -1;
        }
        if (right.rankIndex !== undefined) {
          return 1;
        }
        return left.baseIndex - right.baseIndex;
      })
      .map(({ lead }) => lead);
  }, [filtered, rankingResult]);

  const pageCount = Math.max(1, Math.ceil(rankedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = rankedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const joinedCount = useMemo(() => leads.filter((lead) => lead.viewer_is_registered).length, [leads]);
  const activeCount = useMemo(() => leads.filter((lead) => (lead.interest_count ?? 0) > 1 || (lead.comment_count ?? 0) > 0).length, [leads]);
  const discussionCount = useMemo(() => leads.filter((lead) => (lead.comment_count ?? 0) > 0).length, [leads]);

  useEffect(() => {
    setPage(1);
    clearRanking();
  }, [deferredSearch, filter, clearRanking]);

  usePageToolbarHeader('Job Leads', `${leads.length} leads`);

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
      clearRanking();
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
      clearRanking();
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
        clearRanking();
        notify('Lead updated');
      } else {
        const created = await createLead(token, data as LeadCreate);
        setLeads((current) => filterLeadIntoList(current, created, true));
        clearRanking();
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
      const preloadedApplication = applicationsByLeadId.get(lead.id) ?? null;
      const existingApp = preloadedApplication ?? (
        applicationsPreloaded
          ? null
          : await findExistingApplicationForLead(token, lead.id)
      );
      if (existingApp) {
        if (!preloadedApplication) {
          setApplications((current) => (
            current.some((application) => application.id === existingApp.id)
              ? current
              : [existingApp, ...current]
          ));
        }
        notify(duplicateApplicationMessage(title, getApplicationStateLabel(existingApp)), 'warning');
        return;
      }
      const createdApplication = await createApplication(token, { lead_id: lead.id, stage: intent });
      setApplications((current) => [createdApplication, ...current.filter((application) => application.id !== createdApplication.id)]);
      notify(creationSuccessMessage(intent, title));
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to create application', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const openCreate = () => { setFormLead(null); setFormOpen(true); };

  const handleLeadChange = useCallback((lead: LeadRead) => {
    clearRanking();
    setLeads((current) => filterLeadIntoList(current, lead));
  }, [clearRanking]);

  const handleLeadDeleted = useCallback((leadId: string) => {
    clearRanking();
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    if (selectedLeadId === leadId) {
      closeLead();
    }
  }, [clearRanking, closeLead, selectedLeadId]);

  const handleRank = useCallback(async () => {
    if (!token || filtered.length === 0 || aspirationCount === 0) {
      return;
    }
    if (filtered.length > MAX_ASPIRATION_MATCH_LEADS) {
      notify(
        `Aspiration matching is limited to ${MAX_ASPIRATION_MATCH_LEADS} leads at a time. Narrow your search or filters and try again.`,
        'warning',
      );
      return;
    }

    const requestId = rankingRequestIdRef.current + 1;
    rankingRequestIdRef.current = requestId;
    setRankingPending(true);
    try {
      const response = await rankLeads(
        token,
        filtered.map((lead) => ({
          id: lead.id,
          title: lead.title?.trim() || 'Untitled Position',
          description: lead.description ?? null,
        })),
      );
      if (rankingRequestIdRef.current !== requestId) {
        return;
      }
      setRankingResult(response);
      setPage(1);
      const rankedCount = response.ranked_leads?.length ?? 0;
      notify(
        `Ranked ${rankedCount} lead${rankedCount === 1 ? '' : 's'} with your aspirations.`,
      );
    } catch (e: unknown) {
      if (rankingRequestIdRef.current !== requestId) {
        return;
      }
      notify(e instanceof Error ? e.message : 'Failed to rank leads', 'error');
    } finally {
      if (rankingRequestIdRef.current === requestId) {
        setRankingPending(false);
      }
    }
  }, [token, filtered, aspirationCount, notify]);

  const rankingDisabledReason = loading
    ? 'Loading leads and aspirations...'
    : filtered.length === 0
      ? 'No leads match the current filters.'
      : filtered.length > MAX_ASPIRATION_MATCH_LEADS
        ? `Aspiration matching is limited to ${MAX_ASPIRATION_MATCH_LEADS} leads at a time. Narrow your search or filters to continue.`
      : aspirationCount === 0
        ? 'Add role or company aspirations on the Aspirations pages to rank leads against them.'
        : undefined;

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
        rankingActive={Boolean(rankingResult)}
        rankingPending={rankingPending}
        rankingDisabledReason={rankingDisabledReason}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onPageChange={setPage}
        onRank={handleRank}
        onClearRanking={clearRanking}
      />

      <Box sx={{ mb: 3 }}>
        <MetricStrip
          variant="inline"
          items={[
            { label: 'Joined by you', value: joinedCount },
            { label: 'Active shared', value: activeCount },
            { label: 'With discussion', value: discussionCount },
          ]}
        />
      </Box>

      {/* ── Lead Cards ── */}
      {loading ? (
        <LoadingState
          kind="grid"
          count={6}
          itemHeight={160}
          columns={{ xs: 1, md: 2 }}
        />
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
                ranking={rankingByLeadId.has(lead.id) ? {
                  relevanceScore: rankingByLeadId.get(lead.id)?.relevance_score ?? 0,
                  message: rankingByLeadId.get(lead.id)?.aspiration_alignment
                    ?? rankingByLeadId.get(lead.id)?.explanation
                    ?? '',
                } : null}
                applicationHandoff={applicationsByLeadId.has(lead.id)
                  ? buildExistingApplicationHandoff(applicationsByLeadId.get(lead.id) as ApplicationRead)
                  : rankingByLeadId.has(lead.id)
                    ? buildReadyHandoff(rankingByLeadId.get(lead.id)?.relevance_score ?? 0)
                    : null}
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
