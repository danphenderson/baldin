import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Chip, LinearProgress,
  useTheme, alpha, Stack, IconButton, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Skeleton, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  WorkOutline as LeadsIcon,
  Assignment as AppIcon,
  TrendingUp as TrendingUpIcon,
  AutoAwesome as AIIcon,
  ArrowForward as ArrowIcon,
  Bolt as BoltIcon,
  Description as DocIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Business as CompanyIcon,
  AccountTree as PipelineIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { getLeads, extractLead } from '../service/leads';
import { getApplications, createApplication } from '../service/applications';
import { getUserProfile } from '../service/users';
import { getCompanies } from '../service/companies';
import { getOrchestrationPipelines } from '../service/data-orchestration';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, gradient, onClick }) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha('#000', 0.15)}` } : {},
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{title}</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>{value}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          </Box>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: gradient, boxShadow: `0 4px 12px ${alpha('#000', 0.15)}`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useContext(UserContext);
  const [leads, setLeads] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractDialog, setExtractDialog] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [leadsRes, appsRes, profileRes, companiesRes, pipelinesRes] = await Promise.all([
        getLeads(token, { page: 1, page_size: 100, request_count: true }),
        getApplications(token),
        getUserProfile(token),
        getCompanies(token).catch(() => []),
        getOrchestrationPipelines(token).catch(() => []),
      ]);
      setLeads(leadsRes.leads || leadsRes || []);
      setApplications(appsRes || []);
      setProfile(profileRes);
      setCompanies(companiesRes || []);
      setPipelines(pipelinesRes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleExtract = async () => {
    if (!token || !extractUrl) return;
    setExtracting(true);
    try {
      await extractLead(token, extractUrl);
      setExtractUrl('');
      setExtractDialog(false);
      refresh();
    } catch (e) { console.error(e); }
    setExtracting(false);
  };

  const handleQuickApply = async (leadId: string) => {
    if (!token) return;
    try {
      await createApplication(token, { lead_id: leadId, status: 'applied' });
      refresh();
    } catch (e) { console.error(e); }
  };

  const activeApps = applications.filter((a: any) => !['rejected', 'withdrawn'].includes(a.status?.toLowerCase()));
  const profileCompleteness = profile
    ? Math.round(
        ([(profile.skills?.length > 0), (profile.experiences?.length > 0),
         (profile.education?.length > 0), (profile.certificates?.length > 0)]
          .filter(Boolean).length / 4) * 100
      )
    : 0;

  const unappliedLeads = leads.filter(
    (lead: any) => !applications.some((app: any) => app.lead_id === lead.id)
  );

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Command Center</Typography>
          <Typography variant="body1" color="text.secondary">Your employment automation at a glance</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh data">
            <IconButton onClick={refresh} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained" startIcon={<BoltIcon />}
            onClick={() => setExtractDialog(true)}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': { boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}` },
            }}
          >
            Extract Lead
          </Button>
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatCard
            title="Job Leads" value={leads.length}
            subtitle={`${unappliedLeads.length} unapplied`}
            icon={<LeadsIcon sx={{ color: '#fff' }} />}
            gradient={`linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`}
            onClick={() => navigate('/leads')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatCard
            title="Applications" value={applications.length}
            subtitle={`${activeApps.length} active`}
            icon={<AppIcon sx={{ color: '#fff' }} />}
            gradient={`linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`}
            onClick={() => navigate('/applications')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatCard
            title="Companies" value={companies.length}
            subtitle="tracked"
            icon={<CompanyIcon sx={{ color: '#fff' }} />}
            gradient={`linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`}
            onClick={() => navigate('/companies')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatCard
            title="Pipelines" value={pipelines.length}
            subtitle="active"
            icon={<PipelineIcon sx={{ color: '#fff' }} />}
            gradient={`linear-gradient(135deg, #f59e0b, #d97706`}
            onClick={() => navigate('/pipelines')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatCard
            title="Profile" value={`${profileCompleteness}%`}
            subtitle="completeness"
            icon={<PersonIcon sx={{ color: '#fff' }} />}
            gradient={`linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`}
            onClick={() => navigate('/profile')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatCard
            title="Success Rate" value={applications.length > 0 ? `${Math.round((applications.filter((a: any) => a.status === 'offer').length / applications.length) * 100)}%` : '—'}
            subtitle="offers received"
            icon={<TrendingUpIcon sx={{ color: '#fff' }} />}
            gradient={`linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Application Status Breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>APPLICATION STATUS</Typography>
              {applications.length > 0 ? (() => {
                const statusCounts = applications.reduce((acc: any, app: any) => {
                  const s = app.status || 'unknown';
                  acc[s] = (acc[s] || 0) + 1;
                  return acc;
                }, {});
                const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];
                const data = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
                return (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <ReTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })() : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No applications yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Profile completeness */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>PROFILE STRENGTH</Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Overall</Typography>
                  <Typography variant="body2" fontWeight={600}>{profileCompleteness}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate" value={profileCompleteness}
                  sx={{
                    height: 8, borderRadius: 4,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    },
                  }}
                />
              </Box>
              {[
                { label: 'Skills', done: profile?.skills?.length > 0 },
                { label: 'Experience', done: profile?.experiences?.length > 0 },
                { label: 'Education', done: profile?.education?.length > 0 },
                { label: 'Certificates', done: profile?.certificates?.length > 0 },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
                  <Typography variant="body2">{item.label}</Typography>
                  <Chip label={item.done ? 'Complete' : 'Missing'} size="small"
                    color={item.done ? 'success' : 'default'}
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Box>
              ))}
              <Button fullWidth variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => navigate('/profile')} startIcon={<UploadIcon />}>
                Import Resume to Auto-fill
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent leads */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">LATEST LEADS</Typography>
                <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/leads')}>View all</Button>
              </Box>
              {leads.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <AIIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography color="text.secondary">No leads yet. Extract your first job lead!</Typography>
                  <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => setExtractDialog(true)} startIcon={<BoltIcon />}>
                    Extract Lead
                  </Button>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {leads.slice(0, 5).map((lead: any) => {
                    const isApplied = applications.some((a: any) => a.lead_id === lead.id);
                    return (
                      <Box
                        key={lead.id}
                        sx={{
                          p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          '&:hover': { background: alpha(theme.palette.primary.main, 0.04) },
                        }}
                      >
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{lead.title || 'Untitled Lead'}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            {lead.companies?.[0]?.name && (
                              <Chip label={lead.companies[0].name} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            )}
                            {lead.location && (
                              <Typography variant="caption" color="text.secondary">{lead.location}</Typography>
                            )}
                            {lead.salary && (
                              <Typography variant="caption" color="success.main">{lead.salary}</Typography>
                            )}
                          </Stack>
                        </Box>
                        {isApplied ? (
                          <Chip label="Applied" size="small" color="primary" />
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => handleQuickApply(lead.id)}>
                            Quick Apply
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick actions */}
        <Grid size={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>QUICK ACTIONS</Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Extract Lead from URL', icon: <BoltIcon />, action: () => setExtractDialog(true), color: theme.palette.primary.main },
                  { label: 'View Applications', icon: <AppIcon />, action: () => navigate('/applications'), color: theme.palette.secondary.main },
                  { label: 'Manage Documents', icon: <DocIcon />, action: () => navigate('/documents'), color: theme.palette.success.main },
                  { label: 'Edit Profile', icon: <PersonIcon />, action: () => navigate('/profile'), color: theme.palette.warning.main },
                  { label: 'Companies', icon: <CompanyIcon />, action: () => navigate('/companies'), color: theme.palette.info.main },
                  { label: 'Pipelines', icon: <PipelineIcon />, action: () => navigate('/pipelines'), color: '#f59e0b' },
                ].map((item) => (
                  <Grid size={{ xs: 12, sm: 6, md: 2 }} key={item.label}>
                    <Button
                      fullWidth variant="outlined" startIcon={item.icon}
                      onClick={item.action}
                      sx={{
                        py: 2, justifyContent: 'flex-start', borderColor: alpha(item.color, 0.3),
                        '&:hover': { borderColor: item.color, background: alpha(item.color, 0.08) },
                      }}
                    >
                      {item.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Extract Lead Dialog */}
      <Dialog open={extractDialog} onClose={() => setExtractDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
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
            fullWidth label="Job Posting URL" placeholder="https://linkedin.com/jobs/..." variant="outlined"
            value={extractUrl} onChange={(e) => setExtractUrl(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setExtractDialog(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleExtract} disabled={!extractUrl || extracting}
            startIcon={extracting ? undefined : <BoltIcon />}
          >
            {extracting ? 'Extracting...' : 'Extract'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardPage;
