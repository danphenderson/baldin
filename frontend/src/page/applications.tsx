import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, useTheme, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl,
  IconButton, Tooltip, Skeleton, Alert, LinearProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon, Visibility as ViewIcon, Description as DocIcon,
  Download as DownloadIcon, AutoAwesome as AIIcon, Refresh as RefreshIcon,
  OpenInNew as OpenIcon, ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  getApplications, updateApplication, deleteApplication,
  getApplicationCoverLetters, generatecoverLetter, getApplicationResumes,
  createApplicationResume, createApplicationCoverLetter,
} from '../service/applications';
import { getCoverLetters, downloadCoverLetter } from '../service/cover-letters';
import { getResumes, downloadResume } from '../service/resumes';

const COLUMNS = [
  { key: 'applied', label: 'Applied', color: '#06b6d4' },
  { key: 'screening', label: 'Screening', color: '#8b5cf6' },
  { key: 'interview', label: 'Interview', color: '#f59e0b' },
  { key: 'offer', label: 'Offer', color: '#10b981' },
  { key: 'rejected', label: 'Rejected', color: '#f43f5e' },
];

const ApplicationsPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [appResumes, setAppResumes] = useState<any[]>([]);
  const [allResumes, setAllResumes] = useState<any[]>([]);
  const [allCoverLetters, setAllCoverLetters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const apps = await getApplications(token);
      setApplications(apps || []);
      const letters = await getCoverLetters(token);
      setAllCoverLetters(letters || []);
      setTemplates((letters || []).filter((t: any) => t.content_type === 'template'));
      const res = await getResumes(token);
      setAllResumes(res || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    if (!token) return;
    try {
      await updateApplication(token, appId, { status: newStatus });
      refresh();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (appId: string) => {
    if (!token) return;
    try { await deleteApplication(token, appId); refresh(); }
    catch (e: any) { setError(e.message); }
  };

  const openDetail = async (app: any) => {
    setSelectedApp(app);
    setDetailOpen(true);
    setSelectedTemplate(templates.length > 0 ? templates[0].id : '');
    if (token) {
      try {
        const [cls, resData] = await Promise.all([
          getApplicationCoverLetters(token, app.id),
          getApplicationResumes(token, app.id),
        ]);
        setCoverLetters(cls || []);
        const resArr = Array.isArray(resData) ? resData : (resData as any)?.resumes || [];
        setAppResumes(resArr);
      } catch {
        setCoverLetters([]);
        setAppResumes([]);
      }
    }
  };

  const handleGenerate = async () => {
    if (!token || !selectedApp) return;
    const templateId = selectedTemplate || (templates.length > 0 ? templates[0].id : null);
    if (!templateId) { setError('No cover letter template available. Create one in Documents first.'); return; }
    setGenerating(true);
    try {
      await generatecoverLetter(token, selectedApp.id, templateId);
      const cls = await getApplicationCoverLetters(token, selectedApp.id);
      setCoverLetters(cls || []);
      setSuccess('Cover letter generated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
    setGenerating(false);
  };

  const handleAttachResume = async (resumeId: string) => {
    if (!token || !selectedApp) return;
    try {
      await createApplicationResume(token, selectedApp.id, resumeId);
      const resData = await getApplicationResumes(token, selectedApp.id);
      const resArr = Array.isArray(resData) ? resData : (resData as any)?.resumes || [];
      setAppResumes(resArr);
      setSuccess('Resume attached!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const handleAttachCoverLetter = async (clId: string) => {
    if (!token || !selectedApp) return;
    try {
      await createApplicationCoverLetter(token, selectedApp.id, clId);
      const cls = await getApplicationCoverLetters(token, selectedApp.id);
      setCoverLetters(cls || []);
      setSuccess('Cover letter attached!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const handleDownload = async (clId: string) => {
    if (!token) return;
    try { await downloadCoverLetter(token, clId); }
    catch (e: any) { setError(e.message); }
  };

  const getAppsForStatus = (status: string) =>
    applications.filter((a: any) => (a.status || 'applied').toLowerCase() === status);

  const availableResumes = allResumes.filter(
    (resume: any) => !appResumes.some((attachedResume: any) => attachedResume.id === resume.id)
  );
  const availableCoverLetters = allCoverLetters.filter(
    (coverLetter: any) => !coverLetters.some((attachedCoverLetter: any) => attachedCoverLetter.id === coverLetter.id)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Applications</Typography>
          <Typography variant="body2" color="text.secondary">
            {applications.length} total &middot; {getAppsForStatus('interview').length} interviewing &middot; {getAppsForStatus('offer').length} offers
          </Typography>
        </Box>
        <Tooltip title="Refresh"><IconButton onClick={refresh} sx={{ border: `1px solid ${theme.palette.divider}` }}><RefreshIcon /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Kanban Board */}
      {loading ? (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {COLUMNS.map(c => <Skeleton key={c.key} variant="rounded" width={240} height={400} sx={{ borderRadius: 3, flexShrink: 0 }} />)}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: 500 }}>
          {COLUMNS.map((col) => {
            const apps = getAppsForStatus(col.key);
            return (
              <Box key={col.key} sx={{ minWidth: 260, maxWidth: 300, flexShrink: 0, flexGrow: 1 }}>
                {/* Column header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: col.color }} />
                  <Typography variant="subtitle2" color="text.secondary">{col.label}</Typography>
                  <Chip label={apps.length} size="small" sx={{ ml: 'auto', height: 22, fontSize: '0.75rem', backgroundColor: alpha(col.color, 0.15), color: col.color }} />
                </Box>

                {/* Column body */}
                <Stack spacing={1.5} sx={{
                  p: 1, borderRadius: 3, minHeight: 400,
                  background: alpha(col.color, 0.03),
                  border: `1px dashed ${alpha(col.color, 0.15)}`,
                }}>
                  {apps.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
                      No applications
                    </Typography>
                  ) : apps.map((app: any) => (
                    <Card key={app.id} sx={{
                      cursor: 'pointer', transition: 'all 0.15s',
                      '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 4px 12px ${alpha('#000', 0.1)}` },
                    }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {app.lead?.title || app.lead_title || 'Untitled'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {app.lead?.companies?.[0]?.name || app.lead_company || ''}
                        </Typography>
                        {(app.lead?.salary || app.lead?.location) && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                            {app.lead?.location && <Chip label={app.lead.location} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                          </Stack>
                        )}
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="View details">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openDetail(app); }}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {col.key !== 'rejected' && (
                            <Tooltip title="Move forward">
                              <IconButton size="small" color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = COLUMNS.findIndex(c => c.key === col.key);
                                  if (idx < COLUMNS.length - 2) handleStatusChange(app.id, COLUMNS[idx + 1].key);
                                }}>
                                <ArrowIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Application Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {selectedApp?.lead?.title || selectedApp?.lead_title || 'Application Details'}
          {selectedApp?.lead?.companies?.[0]?.name && (
            <Typography variant="body2" color="text.secondary">{selectedApp.lead.companies[0].name}</Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedApp && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Status + Lead Info */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Status</Typography>
                <FormControl size="small" fullWidth>
                  <Select value={selectedApp.status || 'applied'}
                    onChange={(e) => { handleStatusChange(selectedApp.id, e.target.value); setSelectedApp((p: any) => ({ ...p, status: e.target.value })); }}>
                    {COLUMNS.map(c => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Lead Details */}
              {selectedApp.lead && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Job Details</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                    {selectedApp.lead.location && <Chip label={selectedApp.lead.location} size="small" variant="outlined" />}
                    {selectedApp.lead.salary && <Chip label={selectedApp.lead.salary} size="small" color="success" variant="outlined" />}
                    {selectedApp.lead.employment_type && <Chip label={selectedApp.lead.employment_type} size="small" variant="outlined" />}
                    {selectedApp.lead.seniority_level && <Chip label={selectedApp.lead.seniority_level} size="small" variant="outlined" />}
                    {selectedApp.lead.job_function && <Chip label={selectedApp.lead.job_function} size="small" variant="outlined" />}
                  </Stack>
                  {selectedApp.lead.url && (
                    <Button variant="outlined" size="small" startIcon={<OpenIcon />} href={selectedApp.lead.url} target="_blank" sx={{ mt: 1 }}>
                      View Original Posting
                    </Button>
                  )}
                </Box>
              )}

              {/* Resumes Section */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Attached Resumes</Typography>
                {appResumes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No resumes attached</Typography>
                ) : (
                  <Stack spacing={1}>
                    {appResumes.map((r: any) => (
                      <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
                        <DocIcon fontSize="small" color="primary" />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>{r.name}</Typography>
                        <Chip label={r.content_type || 'custom'} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        <IconButton size="small" onClick={() => token && downloadResume(token, r.id)}><DownloadIcon fontSize="small" /></IconButton>
                      </Box>
                    ))}
                  </Stack>
                )}
                {availableResumes.length > 0 && (
                  <FormControl size="small" sx={{ mt: 1, minWidth: 200 }}>
                    <Select displayEmpty value="" onChange={(e) => handleAttachResume(e.target.value)}>
                      <MenuItem value="" disabled>Attach a resume...</MenuItem>
                      {availableResumes.map((r: any) => (
                        <MenuItem key={r.id} value={r.id}>{r.name} ({r.content_type || 'custom'})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

              {/* Cover Letters Section */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Cover Letters</Typography>
                {coverLetters.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No cover letters attached</Typography>
                ) : (
                  <Stack spacing={1}>
                    {coverLetters.map((cl: any) => (
                      <Box key={cl.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
                        <DocIcon fontSize="small" color="secondary" />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>{cl.name}</Typography>
                        <Chip label={cl.content_type || 'generated'} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        <IconButton size="small" onClick={() => handleDownload(cl.id)}><DownloadIcon fontSize="small" /></IconButton>
                      </Box>
                    ))}
                  </Stack>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                  {templates.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <Select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} displayEmpty>
                        {templates.map((t: any) => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <Button variant="outlined" size="small" startIcon={generating ? undefined : <AIIcon />} onClick={handleGenerate}
                    disabled={generating} sx={{ whiteSpace: 'nowrap' }}>
                    {generating ? 'Generating...' : 'AI Generate'}
                  </Button>
                  {availableCoverLetters.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <Select displayEmpty value="" onChange={(e) => handleAttachCoverLetter(e.target.value)}>
                        <MenuItem value="" disabled>Attach a cover letter...</MenuItem>
                        {availableCoverLetters.map((letter: any) => (
                          <MenuItem key={letter.id} value={letter.id}>{letter.name} ({letter.content_type || 'custom'})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Stack>
                {generating && <LinearProgress sx={{ mt: 1 }} />}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationsPage;
