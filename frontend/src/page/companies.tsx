import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Skeleton, Alert, InputAdornment, Divider, Collapse, List, ListItem,
  ListItemText, ListItemIcon,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Business as CompanyIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, AutoAwesome as AIIcon, LocationOn as LocationIcon,
  People as SizeIcon, Category as IndustryIcon, Work as LeadIcon,
  ExpandMore, ExpandLess, OpenInNew as OpenIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  getCompanies, createCompany, updateCompany, deleteCompany, getCompanyLeads, extractCompany,
} from '../service/companies';
import { createApplication } from '../service/applications';

const CompaniesPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Expanded card for leads
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [companyLeads, setCompanyLeads] = useState<Record<string, any[]>>({});
  const [loadingLeads, setLoadingLeads] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getCompanies(token);
      setCompanies(data || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleExtract = async () => {
    if (!token || !extractUrl.trim()) return;
    setExtracting(true);
    setError('');
    try {
      await extractCompany(token, extractUrl);
      setExtractUrl('');
      setSuccess('Company extracted via AI!');
      setTimeout(() => setSuccess(''), 3000);
      refresh();
    } catch (e: any) { setError(e.message); }
    setExtracting(false);
  };

  const handleSave = async () => {
    if (!token || !editItem) return;
    try {
      if (editItem.id) {
        await updateCompany(token, editItem.id, editItem);
      } else {
        await createCompany(token, editItem);
      }
      setEditDialog(false);
      setEditItem(null);
      refresh();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteCompany(token, id);
      refresh();
    } catch (e: any) { setError(e.message); }
  };

  const handleToggleLeads = async (companyId: string) => {
    if (expandedId === companyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(companyId);
    if (!companyLeads[companyId] && token) {
      setLoadingLeads(companyId);
      try {
        const leads = await getCompanyLeads(token, companyId);
        setCompanyLeads(prev => ({ ...prev, [companyId]: leads }));
      } catch { setCompanyLeads(prev => ({ ...prev, [companyId]: [] })); }
      setLoadingLeads(null);
    }
  };

  const handleQuickApply = async (lead: any) => {
    if (!token) return;
    try {
      await createApplication(token, { lead_id: lead.id, status: 'applied' });
      setSuccess(`Applied to ${lead.title}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const filtered = companies.filter(c =>
    !search || [c.name, c.industry, c.location].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const industryStats = companies.reduce((acc: Record<string, number>, c) => {
    const ind = c.industry || 'Unknown';
    acc[ind] = (acc[ind] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {/* AI Extraction Bar */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.secondary.main, 0.08)})` }}>
        <CardContent sx={{ py: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <AIIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>AI Extract Company</Typography>
            <TextField
              fullWidth size="small" placeholder="Paste a company page URL to extract details..."
              value={extractUrl} onChange={e => setExtractUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleExtract()}
            />
            <Button
              variant="contained" onClick={handleExtract} disabled={extracting || !extractUrl.trim()}
              sx={{ px: 3, whiteSpace: 'nowrap', background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }}
            >
              {extracting ? 'Extracting...' : 'Extract'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Header + Stats */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Companies</Typography>
          <Typography variant="body2" color="text.secondary">{companies.length} companies tracked</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={refresh} sx={{ border: `1px solid ${theme.palette.divider}` }}><RefreshIcon /></IconButton>
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => { setEditItem({ name: '', industry: '', size: '', location: '', description: '' }); setEditDialog(true); }}
            sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }}
          >
            Add Company
          </Button>
        </Stack>
      </Stack>

      {/* Industry breakdown chips */}
      {Object.keys(industryStats).length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(industryStats).map(([ind, count]) => (
            <Chip key={ind} label={`${ind} (${count})`} size="small" variant="outlined"
              sx={{ borderColor: alpha(theme.palette.primary.main, 0.3), color: theme.palette.text.secondary }} />
          ))}
        </Stack>
      )}

      {/* Search */}
      <TextField
        fullWidth size="small" placeholder="Search companies..." value={search}
        onChange={e => setSearch(e.target.value)} sx={{ mb: 3 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      {/* Company Cards */}
      {loading ? (
        <Grid container spacing={2}>{[1, 2, 3].map(i => <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={200} /></Grid>)}</Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CompanyIcon sx={{ fontSize: 64, color: alpha(theme.palette.text.primary, 0.15), mb: 2 }} />
          <Typography color="text.secondary">No companies yet. Extract one from a URL or add manually.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(company => (
            <Grid item xs={12} md={6} key={company.id}>
              <Card sx={{ transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha('#000', 0.15)}` } }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{company.name || 'Unnamed Company'}</Typography>
                      <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                        {company.industry && (
                          <Chip icon={<IndustryIcon sx={{ fontSize: 14 }} />} label={company.industry} size="small" variant="outlined" />
                        )}
                        {company.size && (
                          <Chip icon={<SizeIcon sx={{ fontSize: 14 }} />} label={company.size} size="small" variant="outlined" />
                        )}
                        {company.location && (
                          <Chip icon={<LocationIcon sx={{ fontSize: 14 }} />} label={company.location} size="small" variant="outlined" />
                        )}
                      </Stack>
                      {company.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {company.description}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditItem({ ...company }); setEditDialog(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(company.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  {/* Expandable Leads Section */}
                  <Divider sx={{ my: 1.5 }} />
                  <Button
                    size="small" startIcon={<LeadIcon />}
                    endIcon={expandedId === company.id ? <ExpandLess /> : <ExpandMore />}
                    onClick={() => handleToggleLeads(company.id)}
                    sx={{ textTransform: 'none', color: theme.palette.text.secondary }}
                  >
                    View Job Leads
                  </Button>
                  <Collapse in={expandedId === company.id}>
                    {loadingLeads === company.id ? (
                      <Skeleton variant="text" width="100%" />
                    ) : (companyLeads[company.id] || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, pl: 1 }}>No leads found for this company.</Typography>
                    ) : (
                      <List dense sx={{ mt: 0.5 }}>
                        {(companyLeads[company.id] || []).map((lead: any) => (
                          <ListItem key={lead.id} sx={{ borderRadius: 1, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
                            secondaryAction={
                              <Stack direction="row" spacing={0.5}>
                                {lead.url && (
                                  <Tooltip title="Open posting">
                                    <IconButton size="small" href={lead.url} target="_blank" rel="noopener"><OpenIcon fontSize="small" /></IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Quick apply">
                                  <Button size="small" variant="outlined" onClick={() => handleQuickApply(lead)} sx={{ minWidth: 0, px: 1, fontSize: '0.7rem' }}>Apply</Button>
                                </Tooltip>
                              </Stack>
                            }
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}><LeadIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText
                              primary={lead.title} secondary={[lead.location, lead.employment_type].filter(Boolean).join(' · ')}
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
          ))}
        </Grid>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem?.id ? 'Edit Company' : 'Add Company'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Company Name" value={editItem?.name || ''} onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
            <TextField fullWidth label="Industry" value={editItem?.industry || ''} onChange={e => setEditItem({ ...editItem, industry: e.target.value })} />
            <TextField fullWidth label="Size" value={editItem?.size || ''} onChange={e => setEditItem({ ...editItem, size: e.target.value })} placeholder="e.g. 50-200, 1000+" />
            <TextField fullWidth label="Location" value={editItem?.location || ''} onChange={e => setEditItem({ ...editItem, location: e.target.value })} />
            <TextField fullWidth label="Description" value={editItem?.description || ''} onChange={e => setEditItem({ ...editItem, description: e.target.value })} multiline rows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>{editItem?.id ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompaniesPage;
