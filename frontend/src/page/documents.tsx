import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, Tabs, Tab,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tooltip, Skeleton, Alert, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Description as DocIcon, Download as DownloadIcon, Delete as DeleteIcon,
  Edit as EditIcon, Add as AddIcon, Refresh as RefreshIcon,
  Article as ResumeIcon, Mail as LetterIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { getResumes, createResume, updateResume, deleteResume, downloadResume, getResumeTemplates } from '../service/resumes';
import { getCoverLetters, createCoverLetter, updateCoverLetter, deleteCoverLetter, downloadCoverLetter, getCoverLetterTemplates } from '../service/cover-letters';

const DocumentsPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const [tab, setTab] = useState(0);
  const [resumes, setResumes] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [resumeTemplates, setResumeTemplates] = useState<any[]>([]);
  const [clTemplates, setClTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDoc, setEditDoc] = useState<any>(null);
  const [editType, setEditType] = useState<'resume' | 'cover_letter'>('resume');
  const [editOpen, setEditOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [r, cl] = await Promise.all([getResumes(token), getCoverLetters(token)]);
      setResumes(r || []);
      setCoverLetters(cl || []);
      try {
        const [rt, clt] = await Promise.all([getResumeTemplates(token), getCoverLetterTemplates(token)]);
        setResumeTemplates(rt || []);
        setClTemplates(clt || []);
      } catch { /* templates optional */ }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSave = async () => {
    if (!token || !editDoc) return;
    try {
      if (editType === 'resume') {
        if (editDoc.id) await updateResume(token, editDoc.id, editDoc);
        else await createResume(token, editDoc);
      } else {
        if (editDoc.id) await updateCoverLetter(token, editDoc.id, editDoc);
        else await createCoverLetter(token, editDoc);
      }
      setEditOpen(false);
      setEditDoc(null);
      refresh();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (id: string, type: 'resume' | 'cover_letter') => {
    if (!token) return;
    try {
      if (type === 'resume') await deleteResume(token, id);
      else await deleteCoverLetter(token, id);
      refresh();
    } catch (e: any) { setError(e.message); }
  };

  const handleDownload = async (id: string, type: 'resume' | 'cover_letter') => {
    if (!token) return;
    try {
      if (type === 'resume') await downloadResume(token, id);
      else await downloadCoverLetter(token, id);
    } catch (e: any) { setError(e.message); }
  };

  const openCreate = (type: 'resume' | 'cover_letter') => {
    setEditType(type);
    setEditDoc({ name: '', content: '', content_type: 'custom' });
    setEditOpen(true);
  };

  const openEdit = (doc: any, type: 'resume' | 'cover_letter') => {
    setEditType(type);
    setEditDoc(doc);
    setEditOpen(true);
  };

  const DocCard: React.FC<{ doc: any; type: 'resume' | 'cover_letter' }> = ({ doc, type }) => (
    <Card sx={{ transition: 'all 0.2s', '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.3) } }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: type === 'resume'
              ? alpha(theme.palette.primary.main, 0.1)
              : alpha(theme.palette.secondary.main, 0.1),
          }}>
            {type === 'resume' ? <ResumeIcon color="primary" /> : <LetterIcon color="secondary" />}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight={600} noWrap>{doc.name || 'Untitled'}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
              <Chip label={doc.content_type || 'custom'} size="small"
                color={doc.content_type === 'generated' ? 'secondary' : doc.content_type === 'template' ? 'primary' : 'default'}
                sx={{ fontSize: '0.7rem', height: 22 }}
              />
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Download PDF"><IconButton size="small" onClick={() => handleDownload(doc.id, type)}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(doc, type)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(doc.id, type)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Stack>
        </Box>
        {doc.content && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {doc.content.substring(0, 150)}{doc.content.length > 150 ? '...' : ''}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Documents</Typography>
          <Typography variant="body2" color="text.secondary">
            {resumes.length} resumes &middot; {coverLetters.length} cover letters
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh"><IconButton onClick={refresh} sx={{ border: `1px solid ${theme.palette.divider}` }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
            const type = tab === 1 ? 'cover_letter' : 'resume';
            setEditType(type);
            setEditDoc({ name: '', content: '', content_type: tab === 2 ? 'template' : 'custom' });
            setEditOpen(true);
          }}>
            New {tab === 0 ? 'Resume' : tab === 1 ? 'Cover Letter' : 'Template'}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' } }}>
        <Tab icon={<ResumeIcon />} iconPosition="start" label={`Resumes (${resumes.length})`} />
        <Tab icon={<LetterIcon />} iconPosition="start" label={`Cover Letters (${coverLetters.length})`} />
        <Tab icon={<DocIcon />} iconPosition="start" label={`Templates (${resumeTemplates.length + clTemplates.length})`} />
      </Tabs>

      {loading ? (
        <Grid container spacing={2}>
          {[1,2,3,4].map(i => <Grid size={{ xs: 12, md: 6 }} key={i}><Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {(tab === 0 ? resumes : tab === 1 ? coverLetters : [...resumeTemplates.map(t => ({...t, _tplType: 'resume'})), ...clTemplates.map(t => ({...t, _tplType: 'cover_letter'}))]).map((doc: any) => (
            <Grid size={{ xs: 12, md: 6 }} key={doc.id}>
              <DocCard doc={doc} type={tab === 0 ? 'resume' : tab === 1 ? 'cover_letter' : doc._tplType || 'resume'} />
            </Grid>
          ))}
          {(tab === 0 ? resumes : tab === 1 ? coverLetters : [...resumeTemplates, ...clTemplates]).length === 0 && (
            <Grid size={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <DocIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No {tab === 0 ? 'resumes' : tab === 1 ? 'cover letters' : 'templates'} yet</Typography>
                <Button variant="contained" size="small" sx={{ mt: 2 }} startIcon={<AddIcon />}
                  onClick={() => openCreate(tab === 0 ? 'resume' : 'cover_letter')}>
                  Create your first
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setEditDoc(null); }} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {editDoc?.id ? 'Edit' : 'Create'} {editType === 'resume' ? 'Resume' : 'Cover Letter'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Name" value={editDoc?.name || ''}
              onChange={e => setEditDoc((p: any) => ({ ...p, name: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={editDoc?.content_type || 'custom'} label="Type"
                onChange={e => setEditDoc((p: any) => ({ ...p, content_type: e.target.value }))}>
                <MenuItem value="custom">Custom</MenuItem>
                <MenuItem value="template">Template</MenuItem>
                <MenuItem value="generated">Generated</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Content" multiline rows={12} value={editDoc?.content || ''}
              onChange={e => setEditDoc((p: any) => ({ ...p, content: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setEditOpen(false); setEditDoc(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsPage;
