import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, TextField, Stack,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Select, MenuItem, FormControl, InputLabel, Tooltip, Skeleton,
  Alert, Collapse, Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Bolt as BoltIcon, Search as SearchIcon, Delete as DeleteIcon,
  Edit as EditIcon, OpenInNew as OpenIcon, Business as CompanyIcon, LocationOn as LocationIcon,
  Work as WorkIcon, Add as AddIcon, ExpandMore, ExpandLess, Refresh as RefreshIcon,
  School as EducationIcon, TrendingUp as SeniorityIcon, Notes as NotesIcon,
  Person as ManagerIcon, AttachMoney as SalaryIcon, Category as FunctionIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { getLeads, createLead, updateLead, deleteLead, extractLead } from '../service/leads';
import { createApplication } from '../service/applications';
import { getCompanies } from '../service/companies';

const LeadsPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getLeads(token, { page: 1, page_size: 200, request_count: false });
      setLeads(res.leads || res || []);
      const co = await getCompanies(token);
      setCompanies(co || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleExtract = async () => {
    if (!token || !extractUrl.trim()) return;
    setExtracting(true);
    setError('');
    try {
      await extractLead(token, extractUrl.trim());
      setExtractUrl('');
      refresh();
    } catch (e: any) { setError(e.message || 'Extraction failed'); }
    setExtracting(false);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try { await deleteLead(token, id); refresh(); }
    catch (e: any) { setError(e.message); }
  };

  const handleApply = async (leadId: string) => {
    if (!token) return;
    try {
      await createApplication(token, { lead_id: leadId, status: 'applied' });
      setSuccess('Application created!');
      setTimeout(() => setSuccess(''), 3000);
    }
    catch (e: any) { setError(e.message); }
  };

  const handleSaveEdit = async () => {
    if (!token || !editLead) return;
    try {
      if (editLead.id) {
        await updateLead(token, editLead.id, editLead);
      } else {
        await createLead(token, editLead);
      }
      setEditDialog(false);
      setEditLead(null);
      refresh();
    } catch (e: any) { setError(e.message); }
  };

  const filteredLeads = leads.filter((lead: any) => {
    const matchesSearch = !search || [lead.title, lead.description, lead.location, lead.companies?.[0]?.name]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' ||
      (filter === 'remote' && lead.location?.toLowerCase().includes('remote')) ||
      (filter === 'fulltime' && lead.employment_type?.toLowerCase().includes('full'));
    return matchesSearch && matchesFilter;
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Job Leads</Typography>
          <Typography variant="body2" color="text.secondary">{leads.length} leads tracked</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh"><IconButton onClick={refresh} sx={{ border: `1px solid ${theme.palette.divider}` }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setEditLead({ url: '', title: '', description: '' }); setEditDialog(true); }}>
            Manual Add
          </Button>
        </Stack>
      </Box>

      {/* AI Extraction Bar */}
      <Card sx={{ mb: 3, background: theme.palette.mode === 'dark' ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.15)}, ${alpha(theme.palette.secondary.dark, 0.1)})` : undefined }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <BoltIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>AI Extract</Typography>
            <TextField
              fullWidth size="small" placeholder="Paste a job posting URL to auto-extract..."
              value={extractUrl} onChange={(e) => setExtractUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              InputProps={{
                startAdornment: <InputAdornment position="start"><OpenIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
              }}
            />
            <Button variant="contained" onClick={handleExtract} disabled={!extractUrl.trim() || extracting}
              sx={{ whiteSpace: 'nowrap', background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }}>
              {extracting ? 'Extracting...' : 'Extract'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Search and Filter */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Filter</InputLabel>
          <Select value={filter} label="Filter" onChange={(e) => setFilter(e.target.value)}>
            <MenuItem value="all">All Leads</MenuItem>
            <MenuItem value="remote">Remote</MenuItem>
            <MenuItem value="fulltime">Full-time</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Lead Cards */}
      {loading ? (
        <Grid container spacing={2}>
          {[1,2,3,4,5,6].map(i => (
            <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} /></Grid>
          ))}
        </Grid>
      ) : filteredLeads.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BoltIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No leads found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Extract your first lead from a job posting URL</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredLeads.map((lead: any) => (
            <Grid item xs={12} md={6} key={lead.id}>
              <Card sx={{ transition: 'all 0.2s', '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.3) } }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0, mr: 1 }}>
                      <Typography variant="body1" fontWeight={700} noWrap>{lead.title || 'Untitled Position'}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                        {lead.companies?.map((c: any) => (
                          <Chip key={c.id} icon={<CompanyIcon sx={{ fontSize: 14 }} />} label={c.name} size="small" variant="outlined" />
                        ))}
                        {lead.location && (
                          <Chip icon={<LocationIcon sx={{ fontSize: 14 }} />} label={lead.location} size="small" variant="outlined" />
                        )}
                        {lead.employment_type && (
                          <Chip icon={<WorkIcon sx={{ fontSize: 14 }} />} label={lead.employment_type} size="small" color="primary" variant="outlined" />
                        )}
                        {lead.seniority_level && (
                          <Chip icon={<SeniorityIcon sx={{ fontSize: 14 }} />} label={lead.seniority_level} size="small" variant="outlined" sx={{ borderColor: alpha(theme.palette.secondary.main, 0.4) }} />
                        )}
                        {lead.education_level && (
                          <Chip icon={<EducationIcon sx={{ fontSize: 14 }} />} label={lead.education_level} size="small" variant="outlined" />
                        )}
                        {lead.job_function && (
                          <Chip icon={<FunctionIcon sx={{ fontSize: 14 }} />} label={lead.job_function} size="small" variant="outlined" />
                        )}
                      </Stack>
                      {lead.salary && (
                        <Typography variant="body2" color="success.main" fontWeight={600} sx={{ mt: 1 }}>
                          <SalaryIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />{lead.salary}
                        </Typography>
                      )}
                      {lead.hiring_manager && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <ManagerIcon sx={{ fontSize: 14, mr: 0.5 }} />Hiring Manager: {lead.hiring_manager}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {lead.url && (
                        <Tooltip title="Open posting"><IconButton size="small" href={lead.url} target="_blank"><OpenIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditLead(lead); setEditDialog(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDelete(lead.id)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </Box>

                  {/* Expandable description + notes */}
                  {(lead.description || lead.notes) && (
                    <>
                      <Collapse in={expandedId === lead.id} collapsedSize={0}>
                        {lead.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
                            {lead.description}
                          </Typography>
                        )}
                        {lead.notes && (
                          <>
                            <Divider sx={{ my: 1 }} />
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
                      <Button size="small" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                        endIcon={expandedId === lead.id ? <ExpandLess /> : <ExpandMore />} sx={{ mt: 0.5, textTransform: 'none' }}>
                        {expandedId === lead.id ? 'Show less' : 'Show more'}
                      </Button>
                    </>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button size="small" variant="contained" onClick={() => handleApply(lead.id)}
                      sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }}>
                      Quick Apply
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onClose={() => { setEditDialog(false); setEditLead(null); }} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>{editLead?.id ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="URL" value={editLead?.url || ''} onChange={e => setEditLead((p: any) => ({ ...p, url: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Title" value={editLead?.title || ''} onChange={e => setEditLead((p: any) => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Location" value={editLead?.location || ''} onChange={e => setEditLead((p: any) => ({ ...p, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Salary" value={editLead?.salary || ''} onChange={e => setEditLead((p: any) => ({ ...p, salary: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select value={editLead?.employment_type || ''} label="Employment Type" onChange={e => setEditLead((p: any) => ({ ...p, employment_type: e.target.value }))}>
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Internship">Internship</MenuItem>
                  <MenuItem value="Freelance">Freelance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Job Function" value={editLead?.job_function || ''} onChange={e => setEditLead((p: any) => ({ ...p, job_function: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Seniority Level</InputLabel>
                <Select value={editLead?.seniority_level || ''} label="Seniority Level" onChange={e => setEditLead((p: any) => ({ ...p, seniority_level: e.target.value }))}>
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Entry">Entry</MenuItem>
                  <MenuItem value="Mid">Mid</MenuItem>
                  <MenuItem value="Senior">Senior</MenuItem>
                  <MenuItem value="Lead">Lead</MenuItem>
                  <MenuItem value="Director">Director</MenuItem>
                  <MenuItem value="Executive">Executive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Education Level" value={editLead?.education_level || ''} onChange={e => setEditLead((p: any) => ({ ...p, education_level: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Hiring Manager" value={editLead?.hiring_manager || ''} onChange={e => setEditLead((p: any) => ({ ...p, hiring_manager: e.target.value }))} />
            </Grid>
            {companies.length > 0 && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Associated Companies</InputLabel>
                  <Select
                    multiple value={editLead?.company_ids || []} label="Associated Companies"
                    onChange={e => setEditLead((p: any) => ({ ...p, company_ids: e.target.value }))}
                    renderValue={(selected: string[]) => (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {selected.map(id => {
                          const c = companies.find((co: any) => co.id === id);
                          return <Chip key={id} label={c?.name || id} size="small" />;
                        })}
                      </Stack>
                    )}
                  >
                    {companies.map((c: any) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline rows={4} value={editLead?.description || ''} onChange={e => setEditLead((p: any) => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes (internal)" multiline rows={2} value={editLead?.notes || ''} onChange={e => setEditLead((p: any) => ({ ...p, notes: e.target.value }))}
                placeholder="Private notes about this opportunity..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setEditDialog(false); setEditLead(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeadsPage;
