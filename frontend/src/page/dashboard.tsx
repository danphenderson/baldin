import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Chip, LinearProgress,
  useTheme, alpha, Stack, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Skeleton, ButtonBase,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  WorkOutline as LeadsIcon,
  Assignment as AppIcon,
  AutoAwesome as AIIcon,
  ArrowForward as ArrowIcon,
  Bolt as BoltIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Business as CompanyIcon,
  CheckCircleOutline as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import { getLeads, extractLead, type LeadRead } from '../service/leads';
import { getApplications, createApplication, type ApplicationRead } from '../service/applications';
import { getUserProfile, type UserProfile } from '../service/users';
import { getCompanies } from '../service/companies';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardData {
  leads: LeadRead[];
  applications: ApplicationRead[];
  profile: UserProfile | null;
  companyCount: number;
}

interface MetricTileProps {
  label: string;
  value: string | number;
  detail?: string;
  accent: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const APPLICATION_STATUSES = ['applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn'] as const;

const STATUS_COLORS: Record<string, string> = {
  applied: '#06b6d4',
  screening: '#8b5cf6',
  interviewing: '#6366f1',
  offer: '#10b981',
  rejected: '#f43f5e',
  withdrawn: '#94a3b8',
};

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ------------------------------------------------------------------ */
/*  Metric tile                                                        */
/* ------------------------------------------------------------------ */

const MetricTile: React.FC<MetricTileProps> = ({ label, value, detail, accent, icon, onClick }) => {
  const theme = useTheme();

  return (
    <ButtonBase
      component="div"
      onClick={onClick}
      disabled={!onClick}
      focusRipple
      aria-label={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
      sx={{
        display: 'block',
        textAlign: 'left',
        width: '100%',
        borderRadius: 3,
      }}
    >
      <Card
        sx={{
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          ...(onClick && {
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px ${alpha(accent, 0.18)}`,
            },
          }),
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.14 : 0.1),
                color: accent,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
            >
              {label}
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {value}
          </Typography>
          {detail && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {detail}
            </Typography>
          )}
        </CardContent>
      </Card>
    </ButtonBase>
  );
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useContext(UserContext);

  const [data, setData] = useState<DashboardData>({
    leads: [],
    applications: [],
    profile: null,
    companyCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractDialog, setExtractDialog] = useState(false);

  /* ---- data fetch ---- */

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, appsRes, profileRes, companiesRes] = await Promise.all([
        getLeads(token, { page: 1, page_size: 100, request_count: true }),
        getApplications(token),
        getUserProfile(token),
        getCompanies(token).catch(() => []),
      ]);
      setData({
        leads: (leadsRes.leads ?? []) as LeadRead[],
        applications: (appsRes ?? []) as ApplicationRead[],
        profile: profileRes,
        companyCount: Array.isArray(companiesRes) ? companiesRes.length : 0,
      });
    } catch (e) {
      console.error(e);
      setError('Unable to load dashboard data. Please try again.');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- actions ---- */

  const handleExtract = async () => {
    if (!token || !extractUrl.trim()) return;
    setExtracting(true);
    try {
      await extractLead(token, extractUrl.trim());
      setExtractUrl('');
      setExtractDialog(false);
      refresh();
    } catch (e) {
      console.error(e);
    }
    setExtracting(false);
  };

  const handleQuickApply = async (leadId: string) => {
    if (!token) return;
    try {
      await createApplication(token, { lead_id: leadId, status: 'applied' });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  /* ---- derived ---- */

  const { leads, applications, profile, companyCount } = data;

  const appliedLeadIds = useMemo(
    () => new Set(applications.map((a) => a.lead_id)),
    [applications],
  );

  const activeAppCount = useMemo(
    () => applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status?.toLowerCase() ?? '')).length,
    [applications],
  );

  const unappliedCount = useMemo(
    () => leads.filter((l) => !appliedLeadIds.has(l.id)).length,
    [leads, appliedLeadIds],
  );

  const profileSections = useMemo(() => [
    { label: 'Skills', done: (profile?.skills?.length ?? 0) > 0 },
    { label: 'Experience', done: (profile?.experiences?.length ?? 0) > 0 },
    { label: 'Education', done: (profile?.education?.length ?? 0) > 0 },
    { label: 'Certificates', done: (profile?.certificates?.length ?? 0) > 0 },
  ], [profile]);

  const profileScore = useMemo(
    () => Math.round((profileSections.filter((s) => s.done).length / profileSections.length) * 100),
    [profileSections],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of applications) {
      const s = (a.status ?? 'unknown').toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [applications]);

  const greeting = greetingForHour(new Date().getHours());

  usePageToolbarHeader(greeting, 'Your autopilot at a glance');

  /* ---- loading skeleton ---- */

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }} aria-busy="true" aria-label="Loading dashboard">
        <Skeleton variant="rounded" height={72} sx={{ borderRadius: 3, mb: 3 }} />
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  /* ---- error state ---- */

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', textAlign: 'center', py: 10 }} role="alert">
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>Something went wrong</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{error}</Typography>
        <Button variant="contained" onClick={refresh} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  /* ---- main render ---- */

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

      {/* ── Metrics ── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Job Leads"
            value={leads.length}
            detail={`${unappliedCount} unapplied`}
            accent={theme.palette.primary.main}
            icon={<LeadsIcon fontSize="small" />}
            onClick={() => navigate('/leads')}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Applications"
            value={applications.length}
            detail={`${activeAppCount} active`}
            accent={theme.palette.secondary.main}
            icon={<AppIcon fontSize="small" />}
            onClick={() => navigate('/applications')}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Companies"
            value={companyCount}
            detail="tracked"
            accent={theme.palette.info.main}
            icon={<CompanyIcon fontSize="small" />}
            onClick={() => navigate('/companies')}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <MetricTile
            label="Profile Score"
            value={`${profileScore}%`}
            detail={`${profileSections.filter((s) => s.done).length} of ${profileSections.length} sections`}
            accent={theme.palette.success.main}
            icon={<PersonIcon fontSize="small" />}
            onClick={() => navigate('/profile')}
          />
        </Grid>
      </Grid>

      {/* ── Main panels ── */}
      <Grid container spacing={2.5}>
        {/* Left column — latest leads + funnel */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2.5}>
            {/* Latest leads */}
            <Card>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">LATEST LEADS</Typography>
                  {leads.length > 0 && (
                    <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/leads')}>
                      View all
                    </Button>
                  )}
                </Box>

                {leads.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <AIIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.4), mb: 1.5 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      No leads yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Paste a job posting URL and let AI extract the details.
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setExtractDialog(true)}
                      startIcon={<BoltIcon />}
                    >
                      Extract your first lead
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={0}>
                    {leads.slice(0, 5).map((lead, idx) => {
                      const isApplied = appliedLeadIds.has(lead.id);
                      const companyName = lead.companies?.[0]?.name;
                      return (
                        <Box
                          key={lead.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            py: 1.5,
                            px: 1,
                            borderRadius: 2,
                            ...(idx < Math.min(leads.length, 5) - 1 && {
                              borderBottom: `1px solid ${theme.palette.divider}`,
                            }),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                          }}
                        >
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {lead.title || 'Untitled Lead'}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                              {companyName && (
                                <Typography variant="caption" color="text.secondary">
                                  {companyName}
                                </Typography>
                              )}
                              {companyName && lead.location && (
                                <DotIcon sx={{ fontSize: 4, color: 'text.disabled' }} />
                              )}
                              {lead.location && (
                                <Typography variant="caption" color="text.secondary">
                                  {lead.location}
                                </Typography>
                              )}
                              {lead.salary && (
                                <>
                                  <DotIcon sx={{ fontSize: 4, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>
                                    {lead.salary}
                                  </Typography>
                                </>
                              )}
                            </Stack>
                          </Box>

                          {isApplied ? (
                            <Chip
                              label="Applied"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleQuickApply(lead.id)}
                              sx={{ fontSize: '0.75rem', minWidth: 0, px: 1.5, whiteSpace: 'nowrap' }}
                            >
                              Apply
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Application funnel */}
            <Card>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  APPLICATION FUNNEL
                </Typography>

                {applications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2.5, textAlign: 'center' }}>
                    Applications will appear here once you start applying.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {APPLICATION_STATUSES.map((status) => {
                      const count = statusCounts[status] ?? 0;
                      if (count === 0 && !['applied', 'offer'].includes(status)) return null;
                      const pct = Math.round((count / applications.length) * 100);
                      const color = STATUS_COLORS[status] ?? theme.palette.text.secondary;

                      return (
                        <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              width: 80,
                              textAlign: 'right',
                              fontWeight: 500,
                              color: 'text.secondary',
                              flexShrink: 0,
                            }}
                          >
                            {statusLabel(status)}
                          </Typography>
                          <Box sx={{ flexGrow: 1, position: 'relative', height: 20, borderRadius: 1 }}>
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: alpha(color, 0.08),
                                borderRadius: 1,
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                                bgcolor: alpha(color, 0.65),
                                borderRadius: 1,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{ width: 32, fontWeight: 600, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {count}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right column — profile strength */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                PROFILE STRENGTH
              </Typography>

              {/* Score ring */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                <Box sx={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                  <svg viewBox="0 0 36 36" width="64" height="64">
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke={alpha(theme.palette.divider, 0.5)}
                      strokeWidth="3"
                    />
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke={profileScore >= 75 ? theme.palette.success.main : theme.palette.primary.main}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${profileScore * 0.974} 100`}
                      transform="rotate(-90 18 18)"
                      style={{ transition: 'stroke-dasharray 0.4s ease' }}
                    />
                  </svg>
                  <Typography
                    variant="body2"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {profileScore}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {profileScore === 100 ? 'Fully complete' : profileScore >= 50 ? 'Getting there' : 'Just started'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {profileSections.filter((s) => s.done).length} of {profileSections.length} sections filled
                  </Typography>
                </Box>
              </Box>

              {/* Section checklist */}
              <Stack spacing={1}>
                {profileSections.map((s) => (
                  <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {s.done ? (
                      <CheckIcon sx={{ fontSize: 18, color: theme.palette.success.main }} />
                    ) : (
                      <UncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        color: s.done ? 'text.primary' : 'text.secondary',
                        fontWeight: s.done ? 500 : 400,
                      }}
                    >
                      {s.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {profileScore < 100 && (
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2.5 }}
                  onClick={() => navigate('/profile')}
                >
                  Complete your profile
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Extract Lead Dialog ── */}
      <Dialog
        open={extractDialog}
        onClose={() => setExtractDialog(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="extract-dialog-title"
      >
        <DialogTitle id="extract-dialog-title" sx={{ fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AIIcon color="primary" />
            <span>AI Lead Extraction</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste a job posting URL and our AI will automatically extract all the details.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Job Posting URL"
            placeholder="https://linkedin.com/jobs/..."
            variant="outlined"
            value={extractUrl}
            onChange={(e) => setExtractUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && extractUrl.trim() && !extracting) handleExtract();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setExtractDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExtract}
            disabled={!extractUrl.trim() || extracting}
            startIcon={extracting ? undefined : <BoltIcon />}
          >
            {extracting ? 'Extracting…' : 'Extract'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardPage;
