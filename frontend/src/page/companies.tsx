import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Skeleton, Alert, InputAdornment, Divider, Collapse, List, ListItem,
  ListItemText, ListItemIcon, CircularProgress, useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Business as CompanyIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, AutoAwesome as AIIcon, LocationOn as LocationIcon,
  People as SizeIcon, Category as IndustryIcon, Work as LeadIcon,
  ExpandMore, ExpandLess, OpenInNew as OpenIcon, Refresh as RefreshIcon,
  WarningAmber as WarningIcon, Schedule as TimeIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getCompanies, createCompany, updateCompany, deleteCompany, getCompanyLeads, extractCompany,
  type CompanyRead, type CompanyCreate, type CompanyUpdate,
} from '../service/companies';
import {
  createApplication,
  findExistingApplicationForLead,
  getApplicationStateLabel,
  type ApplicationCreationIntent,
} from '../service/applications';
import { components } from '../schema';
import { timeAgo, monogram, monogramColor } from '../util/format';
import EmptyState from '../component/common/empty-state';
import ApplicationIntentButton from '../component/application-intent-button';

type LeadRead = components['schemas']['LeadRead'];

const creationSuccessMessage = (intent: ApplicationCreationIntent, title: string): string => (
  intent === 'registered'
    ? `Registered interest for "${title}".`
    : `Application created for "${title}".`
);

const duplicateApplicationMessage = (title: string, statusLabel: string): string => (
  `"${title}" already exists in your applications as ${statusLabel}.`
);

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const CompaniesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token } = useContext(UserContext);

  // Data
  const [companies, setCompanies] = useState<CompanyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Search & filter
  const [search, setSearch] = useState('');
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);

  // AI extraction
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Create / Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<CompanyCreate & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<CompanyRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded card for leads
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [companyLeads, setCompanyLeads] = useState<Record<string, LeadRead[]>>({});
  const [loadingLeads, setLoadingLeads] = useState<string | null>(null);
  const [creatingLeadId, setCreatingLeadId] = useState<string | null>(null);
  const [warning, setWarning] = useState('');

  /* -- Feedback helpers -------------------------------------------- */

  const showSuccess = useCallback((msg: string) => {
    clearTimeout(successTimer.current);
    setSuccess(msg);
    successTimer.current = setTimeout(() => setSuccess(''), 4000);
  }, []);

  useEffect(() => () => clearTimeout(successTimer.current), []);

  /* -- Data loading ------------------------------------------------ */

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getCompanies(token);
      setCompanies(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load companies');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  /* -- AI extraction ---------------------------------------------- */

  const handleExtract = async () => {
    if (!token || !extractUrl.trim()) return;
    setExtracting(true);
    setError('');
    try {
      await extractCompany(token, extractUrl);
      setExtractUrl('');
      showSuccess('Company extracted via AI — added to your list.');
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    }
    setExtracting(false);
  };

  /* -- Create / Update -------------------------------------------- */

  const openCreateDialog = () => {
    setEditItem({ name: '', industry: '', size: '', location: '', description: '' });
    setEditDialog(true);
  };

  const openEditDialog = (company: CompanyRead) => {
    setEditItem({ ...company });
    setEditDialog(true);
  };

  const closeEditDialog = () => {
    if (saving) return;
    setEditDialog(false);
    setEditItem(null);
  };

  const handleSave = async () => {
    if (!token || !editItem) return;
    setSaving(true);
    try {
      if (editItem.id) {
        const payload: CompanyUpdate = {
          name: editItem.name,
          industry: editItem.industry,
          size: editItem.size,
          location: editItem.location,
          description: editItem.description,
        };
        await updateCompany(token, editItem.id, payload);
        showSuccess(`${editItem.name || 'Company'} updated.`);
      } else {
        const payload: CompanyCreate = {
          name: editItem.name,
          industry: editItem.industry,
          size: editItem.size,
          location: editItem.location,
          description: editItem.description,
        };
        await createCompany(token, payload);
        showSuccess(`${editItem.name || 'Company'} created.`);
      }
      setEditDialog(false);
      setEditItem(null);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setSaving(false);
  };

  /* -- Delete ----------------------------------------------------- */

  const confirmDelete = (company: CompanyRead) => setDeleteTarget(company);

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCompany(token, deleteTarget.id);
      showSuccess(`${deleteTarget.name || 'Company'} deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
    setDeleting(false);
  };

  /* -- Leads expansion -------------------------------------------- */

  const handleToggleLeads = async (companyId: string) => {
    if (expandedId === companyId) { setExpandedId(null); return; }
    setExpandedId(companyId);
    if (!companyLeads[companyId] && token) {
      setLoadingLeads(companyId);
      try {
        const leads = await getCompanyLeads(token, companyId);
        setCompanyLeads(prev => ({ ...prev, [companyId]: leads }));
      } catch {
        setCompanyLeads(prev => ({ ...prev, [companyId]: [] }));
      }
      setLoadingLeads(null);
    }
  };

  const handleQuickApply = async (lead: LeadRead, intent: ApplicationCreationIntent) => {
    if (!token) return;
    setCreatingLeadId(lead.id);
    setWarning('');
    try {
      const title = lead.title ?? 'Untitled position';
      const existingApp = await findExistingApplicationForLead(token, lead.id);
      if (existingApp) {
        setWarning(duplicateApplicationMessage(title, getApplicationStateLabel(existingApp)));
        return;
      }
      setError('');
      await createApplication(token, { lead_id: lead.id, stage: intent });
      showSuccess(creationSuccessMessage(intent, title));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Application failed');
    } finally {
      setCreatingLeadId(null);
    }
  };

  /* -- Derived data ----------------------------------------------- */

  const industryStats = companies.reduce<Record<string, number>>((acc, c) => {
    const ind = c.industry || 'Unknown';
    acc[ind] = (acc[ind] || 0) + 1;
    return acc;
  }, {});

  const filtered = companies.filter(c => {
    const matchesSearch = !search
      || [c.name, c.industry, c.location, c.description]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesIndustry = !activeIndustry
      || (c.industry || 'Unknown') === activeIndustry;
    return matchesSearch && matchesIndustry;
  });

  usePageToolbarHeader('Companies', `${companies.length} tracked`);

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Feedback banners */}
      <Collapse in={!!error}><Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }} role="alert">{error}</Alert></Collapse>
      <Collapse in={!!warning}><Alert severity="warning" onClose={() => setWarning('')} sx={{ mb: 2 }} role="alert">{warning}</Alert></Collapse>
      <Collapse in={!!success}><Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }} role="status" aria-live="polite">{success}</Alert></Collapse>

      {/* -------- AI Extraction Bar -------------------------------- */}
      <Card
        sx={{
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.07)}, ${alpha(theme.palette.secondary.main, 0.07)})`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        }}
      >
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <AIIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
              <Typography
                variant="subtitle2"
                sx={{ color: theme.palette.primary.main, whiteSpace: 'nowrap' }}
              >
                AI Extract
              </Typography>
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Paste a company page URL…"
              aria-label="Company page URL for AI extraction"
              value={extractUrl}
              onChange={e => setExtractUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExtract()}
              slotProps={{
                input: {
                  sx: { fontSize: '0.875rem' },
                },
              }}
            />

            <Button
              variant="contained"
              onClick={handleExtract}
              disabled={extracting || !extractUrl.trim()}
              startIcon={extracting ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{
                px: 3,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }}
            >
              {extracting ? 'Extracting…' : 'Extract'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* -------- Page header -------------------------------------- */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="flex-end"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton
              onClick={refresh}
              aria-label="Refresh companies"
              sx={{ border: `1px solid ${theme.palette.divider}` }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Add Company
          </Button>
        </Stack>
      </Stack>

      {/* -------- Industry filter chips ---------------------------- */}
      {Object.keys(industryStats).length > 1 && (
        <Stack direction="row" sx={{ mb: 2.5, flexWrap: 'wrap', gap: 0.75 }}>
          <Chip
            label="All"
            size="small"
            variant={activeIndustry === null ? 'filled' : 'outlined'}
            color={activeIndustry === null ? 'primary' : 'default'}
            onClick={() => setActiveIndustry(null)}
            sx={{ fontWeight: 600 }}
          />
          {Object.entries(industryStats)
            .sort(([, a], [, b]) => b - a)
            .map(([ind, count]) => (
            <Chip
              key={ind}
              label={`${ind} (${count})`}
              size="small"
              variant={activeIndustry === ind ? 'filled' : 'outlined'}
              color={activeIndustry === ind ? 'primary' : 'default'}
              onClick={() => setActiveIndustry(prev => prev === ind ? null : ind)}
              sx={{
                fontWeight: activeIndustry === ind ? 600 : 400,
                borderColor: alpha(theme.palette.primary.main, 0.25),
              }}
            />
          ))}
        </Stack>
      )}

      {/* -------- Search ------------------------------------------- */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, industry, location, or description…"
        aria-label="Search companies"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* -------- Content area ------------------------------------- */}
      {loading ? (
        <Grid container spacing={2} aria-busy="true" aria-label="Loading companies">
          {[1, 2, 3, 4].map(i => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        /* -- Empty state ------------------------------------------- */
        companies.length === 0 ? (
          <EmptyState
            icon={<CompanyIcon />}
            title="No companies discovered"
            description="Companies are captured automatically when you import leads."
            action={{ label: 'Add a Company', onClick: openCreateDialog, icon: <AddIcon /> }}
          />
        ) : (
          <EmptyState
            icon={<SearchIcon />}
            title="No results match your filters"
            description="Try adjusting your search or clearing filters."
          />
        )
      ) : (
        /* -- Company card grid ------------------------------------ */
        <Grid container spacing={2}>
          {filtered.map(company => {
            const mc = monogramColor(company.name);
            const isExpanded = expandedId === company.id;
            const leads = companyLeads[company.id] ?? [];
            const leadsLoading = loadingLeads === company.id;

            return (
              <Grid size={{ xs: 12, md: 6 }} key={company.id}>
                <Card
                  sx={{
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 32px ${alpha(mc, 0.12)}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: 2.5 } }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      {/* Monogram avatar */}
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(135deg, ${alpha(mc, 0.15)}, ${alpha(mc, 0.05)})`,
                          border: `1px solid ${alpha(mc, 0.2)}`,
                          color: mc,
                          fontFamily: '"Space Grotesk", sans-serif',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          letterSpacing: '0.04em',
                          userSelect: 'none',
                        }}
                        aria-hidden
                      >
                        {monogram(company.name)}
                      </Box>

                      {/* Details */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}>
                            {company.name || 'Unnamed Company'}
                          </Typography>

                          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, ml: 1 }}>
                            <Tooltip title="Edit company">
                              <IconButton
                                size="small"
                                aria-label={`Edit ${company.name ?? 'company'}`}
                                onClick={() => openEditDialog(company)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete company">
                              <IconButton
                                size="small"
                                aria-label={`Delete ${company.name ?? 'company'}`}
                                onClick={() => confirmDelete(company)}
                                sx={{
                                  color: theme.palette.text.secondary,
                                  '&:hover': { color: theme.palette.error.main },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>

                        {/* Metadata chips */}
                        <Stack direction="row" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                          {company.industry && (
                            <Chip
                              icon={<IndustryIcon sx={{ fontSize: 14 }} />}
                              label={company.industry}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {company.size && (
                            <Chip
                              icon={<SizeIcon sx={{ fontSize: 14 }} />}
                              label={company.size}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {company.location && (
                            <Chip
                              icon={<LocationIcon sx={{ fontSize: 14 }} />}
                              label={company.location}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>

                        {/* Description */}
                        {company.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.5,
                            }}
                          >
                            {company.description}
                          </Typography>
                        )}

                        {/* Timestamp */}
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: theme.palette.text.secondary,
                            opacity: 0.7,
                          }}
                        >
                          <TimeIcon sx={{ fontSize: 13 }} />
                          Added {timeAgo(company.created_at)}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Expandable leads section */}
                    <Divider sx={{ my: 1.5 }} />
                    <Button
                      size="small"
                      startIcon={<LeadIcon />}
                      endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                      onClick={() => handleToggleLeads(company.id)}
                      aria-expanded={isExpanded}
                      sx={{ textTransform: 'none', color: theme.palette.text.secondary, fontWeight: 500 }}
                    >
                      Job Leads
                    </Button>

                    <Collapse in={isExpanded} unmountOnExit>
                      {leadsLoading ? (
                        <Stack spacing={1} sx={{ mt: 1, pl: 1 }}>
                          <Skeleton variant="text" width="70%" />
                          <Skeleton variant="text" width="55%" />
                        </Stack>
                      ) : leads.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1, pl: 1, fontStyle: 'italic' }}
                        >
                          No leads found for this company.
                        </Typography>
                      ) : (
                        <List dense disablePadding sx={{ mt: 0.5 }}>
                          {leads.map(lead => (
                            <ListItem
                              key={lead.id}
                              sx={{
                                borderRadius: 1.5,
                                mb: 0.25,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                              }}
                              secondaryAction={
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  {lead.url && (
                                    <Tooltip title="Open job posting">
                                      <IconButton
                                        size="small"
                                        component="a"
                                        href={lead.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Open posting for ${lead.title ?? 'job'}`}
                                      >
                                        <OpenIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <ApplicationIntentButton
                                    size="small"
                                    variant="outlined"
                                    label="Create"
                                    loadingLabel="Creating..."
                                    loading={creatingLeadId === lead.id}
                                    ariaLabel={`Create application for ${lead.title ?? 'job'}`}
                                    onSelect={(selectedIntent) => handleQuickApply(lead, selectedIntent)}
                                    sx={{ minWidth: 0, px: 1, fontSize: '0.7rem' }}
                                  />
                                </Stack>
                              }
                            >
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <LeadIcon fontSize="small" color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={lead.title ?? 'Untitled Position'}
                                secondary={[lead.location, lead.employment_type].filter(Boolean).join(' · ')}
                                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Collapse>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* -------- Create / Edit Dialog ----------------------------- */}
      <Dialog
        open={editDialog}
        onClose={closeEditDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        aria-labelledby="company-dialog-title"
      >
        <DialogTitle id="company-dialog-title" sx={{ fontWeight: 700 }}>
          {editItem?.id ? 'Edit Company' : 'New Company'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Company Name"
              value={editItem?.name ?? ''}
              onChange={e => setEditItem(prev => prev ? { ...prev, name: e.target.value } : prev)}
              autoFocus
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Industry"
                value={editItem?.industry ?? ''}
                onChange={e => setEditItem(prev => prev ? { ...prev, industry: e.target.value } : prev)}
              />
              <TextField
                fullWidth
                label="Size"
                value={editItem?.size ?? ''}
                onChange={e => setEditItem(prev => prev ? { ...prev, size: e.target.value } : prev)}
                placeholder="e.g. 50-200, 1000+"
              />
            </Stack>
            <TextField
              fullWidth
              label="Location"
              value={editItem?.location ?? ''}
              onChange={e => setEditItem(prev => prev ? { ...prev, location: e.target.value } : prev)}
            />
            <TextField
              fullWidth
              label="Description"
              value={editItem?.description ?? ''}
              onChange={e => setEditItem(prev => prev ? { ...prev, description: e.target.value } : prev)}
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeEditDialog} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving…' : editItem?.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------- Delete Confirmation Dialog ----------------------- */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <WarningIcon color="error" />
          Delete Company
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete <strong>{deleteTarget?.name || 'this company'}</strong>?
            This action cannot be undone and will remove all associated data.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompaniesPage;
