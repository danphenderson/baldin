import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, TextField, Stack,
  useTheme, alpha, IconButton, InputAdornment, Select, MenuItem,
  FormControl, InputLabel, Tooltip, Skeleton, Collapse, Divider,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Pagination as MuiPagination, LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Bolt as BoltIcon, Search as SearchIcon, Delete as DeleteIcon,
  Edit as EditIcon, OpenInNew as OpenIcon, Business as CompanyIcon,
  LocationOn as LocationIcon, Work as WorkIcon, Add as AddIcon,
  ExpandMore, ExpandLess, Refresh as RefreshIcon,
  TrendingUp as SeniorityIcon, AttachMoney as SalaryIcon,
  AccessTime as TimeIcon, Person as ManagerIcon,
  School as EducationIcon, Category as FunctionIcon,
  Notes as NotesIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  getLeads, createLead, updateLead, deleteLead, extractLead,
  type LeadRead, type LeadCreate, type LeadUpdate,
} from '../service/leads';
import { createApplication } from '../service/applications';
import { getCompanies, type CompanyRead } from '../service/companies';
import LeadFormDialog from '../component/lead-modal';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

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

  // Reset to page 1 when search/filter changes
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

  /* ---- Render helpers ---- */

  const gradientBg = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`;

  const renderMetaChip = (
    icon: React.ReactElement,
    label: string | null | undefined,
    color?: string,
  ) => {
    if (!label) return null;
    return (
      <Chip
        icon={icon}
        label={label}
        size="small"
        variant="outlined"
        sx={{
          borderColor: color ? alpha(color, 0.35) : undefined,
          color: color || 'text.secondary',
          '& .MuiChip-icon': { color: color || 'text.secondary' },
        }}
      />
    );
  };

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
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => { setFormLead(null); setFormOpen(true); }}
          >
            Add Lead
          </Button>
        </Stack>
      </Box>

      {/* ── AI Extraction Bar ── */}
      <Card
        sx={{
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.18)}, ${alpha(theme.palette.secondary.dark, 0.10)})`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.08)}, ${alpha(theme.palette.secondary.light, 0.05)})`,
          borderLeft: `3px solid ${theme.palette.primary.main}`,
        }}
      >
        {extracting && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <BoltIcon sx={{ color: theme.palette.primary.main }} />
              <Typography variant="subtitle1" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                AI Extract
              </Typography>
            </Stack>
            <TextField
              fullWidth
              size="small"
              placeholder="Paste a job posting URL to auto-extract lead details..."
              value={extractUrl}
              onChange={(e) => setExtractUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              disabled={extracting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <OpenIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  'aria-label': 'Job posting URL for AI extraction',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleExtract}
              disabled={!extractUrl.trim() || extracting}
              sx={{ whiteSpace: 'nowrap', minWidth: 110, background: gradientBg }}
            >
              {extracting ? 'Extracting...' : 'Extract'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Search, Filter, Pagination ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ sm: 'center' }}
      >
        <TextField
          size="small"
          placeholder="Search by title, company, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              'aria-label': 'Search leads',
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="leads-filter-label">Filter</InputLabel>
          <Select
            labelId="leads-filter-label"
            value={filter}
            label="Filter"
            onChange={(e) => setFilter(e.target.value)}
          >
            <MenuItem value="all">All Leads</MenuItem>
            <MenuItem value="remote">Remote</MenuItem>
            <MenuItem value="fulltime">Full-time</MenuItem>
          </Select>
        </FormControl>
        {pageCount > 1 && (
          <MuiPagination
            count={pageCount}
            page={safePage}
            onChange={(_, v) => setPage(v)}
            size="small"
            shape="rounded"
            sx={{ '& .MuiPaginationItem-root': { fontWeight: 600 } }}
          />
        )}
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
        <Box sx={{ textAlign: 'center', py: 10 }}>
          {leads.length === 0 ? (
            <>
              <BoltIcon sx={{ fontSize: 56, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={600}>No leads yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
                Paste a job posting URL above to auto-extract your first lead, or add one manually.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => { setFormLead(null); setFormOpen(true); }}
              >
                Add Lead Manually
              </Button>
            </>
          ) : (
            <>
              <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={600}>No matches</Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filter criteria.
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {paged.map((lead) => {
            const expanded = expandedId === lead.id;
            const isApplying = applyingId === lead.id;
            const companyName = lead.companies?.[0]?.name;

            return (
              <Grid size={{ xs: 12, md: 6 }} key={lead.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                    '&:hover': {
                      borderLeftColor: theme.palette.primary.main,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Title + actions row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Typography
                        variant="body1"
                        fontWeight={700}
                        sx={{
                          flexGrow: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                        }}
                      >
                        {lead.title || 'Untitled Position'}
                      </Typography>
                      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, ml: 0.5 }}>
                        {lead.url && (
                          <Tooltip title="Open posting">
                            <IconButton
                              size="small"
                              component="a"
                              href={lead.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open job posting for ${lead.title || 'this lead'}`}
                            >
                              <OpenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => { setFormLead(lead); setFormOpen(true); }}
                            aria-label={`Edit ${lead.title || 'lead'}`}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteTarget(lead)}
                            aria-label={`Delete ${lead.title || 'lead'}`}
                            sx={{ color: alpha(theme.palette.error.main, 0.7), '&:hover': { color: theme.palette.error.main } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    {/* Company + location line */}
                    {(companyName || lead.location) && (
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                        {companyName && (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <CompanyIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                              {companyName}
                            </Typography>
                          </Stack>
                        )}
                        {companyName && lead.location && (
                          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.4 }}>
                            &bull;
                          </Typography>
                        )}
                        {lead.location && (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LocationIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {lead.location}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    )}

                    {/* Metadata chips */}
                    <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75 }}>
                      {renderMetaChip(<WorkIcon sx={{ fontSize: 14 }} />, lead.employment_type, theme.palette.primary.main)}
                      {renderMetaChip(<SeniorityIcon sx={{ fontSize: 14 }} />, lead.seniority_level, theme.palette.secondary.main)}
                      {renderMetaChip(<FunctionIcon sx={{ fontSize: 14 }} />, lead.job_function)}
                      {renderMetaChip(<EducationIcon sx={{ fontSize: 14 }} />, lead.education_level)}
                    </Stack>

                    {/* Salary */}
                    {lead.salary && (
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 1.25, color: theme.palette.success.main }}>
                        <SalaryIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {lead.salary}
                      </Typography>
                    )}

                    {/* Hiring manager */}
                    {lead.hiring_manager && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.75 }}>
                        <ManagerIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        {lead.hiring_manager}
                      </Typography>
                    )}

                    {/* Expandable description + notes */}
                    {(lead.description || lead.notes) && (
                      <Box sx={{ mt: 1 }}>
                        <Collapse in={expanded} collapsedSize={0}>
                          {lead.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 1, whiteSpace: 'pre-wrap', lineHeight: 1.65,
                                maxHeight: 200, overflowY: 'auto',
                              }}
                            >
                              {lead.description}
                            </Typography>
                          )}
                          {lead.notes && (
                            <>
                              <Divider sx={{ my: 1.25 }} />
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <NotesIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
                                <Typography variant="caption" fontWeight={600}>Notes</Typography>
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                                {lead.notes}
                              </Typography>
                            </>
                          )}
                        </Collapse>
                        <Button
                          size="small"
                          onClick={() => setExpandedId(expanded ? null : lead.id)}
                          endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
                          sx={{ mt: 0.5, textTransform: 'none', color: 'text.secondary', fontWeight: 500 }}
                          aria-expanded={expanded}
                          aria-label={expanded ? 'Collapse details' : 'Expand details'}
                        >
                          {expanded ? 'Less' : 'Details'}
                        </Button>
                      </Box>
                    )}

                    {/* Spacer */}
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Footer: Quick Apply + timestamp */}
                    <Divider sx={{ mt: 1.5, mb: 1.25, opacity: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleApply(lead)}
                        disabled={isApplying}
                        sx={{
                          background: gradientBg,
                          px: 2.5,
                          fontSize: '0.8rem',
                        }}
                      >
                        {isApplying ? 'Applying...' : 'Quick Apply'}
                      </Button>
                      <Tooltip title={new Date(lead.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ cursor: 'default' }}>
                          <TimeIcon sx={{ fontSize: 13, color: 'text.secondary', opacity: 0.6 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                            {timeAgo(lead.created_at)}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
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
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={deleting ? undefined : () => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-confirm-title"
      >
        <DialogTitle id="delete-confirm-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: theme.palette.warning.main }} />
          <Typography variant="h6" component="span" fontWeight={700}>Delete Lead</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete{' '}
            <Typography component="span" fontWeight={600} color="text.primary">
              {deleteTarget?.title || 'this lead'}
            </Typography>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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
