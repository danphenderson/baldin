import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Alert, Avatar, Divider, Tabs, Tab, LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Save as SaveIcon,
  Upload as UploadIcon, AutoAwesome as AIIcon, Code as SkillIcon,
  Work as WorkIcon, School as SchoolIcon, CardMembership as CertIcon,
  Contacts as ContactIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { getUser, updateUser } from '../service/users';
import { getSkills, createSkill, updateSkill, deleteSkill, extractSkill } from '../service/skills';
import { getExperiences, createExperience, updateExperience, deleteExperience } from '../service/experiences';
import { getEducations as getEducation, createEducation, updateEducation, deleteEducation } from '../service/education';
import { getCertificates, createCertificate, updateCertificate, deleteCertificate } from '../service/certificates';
import { getContacts, createContact, updateContact, deleteContact } from '../service/contacts';

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const { token, setUser } = useContext(UserContext);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile fields
  const [profileForm, setProfileForm] = useState<any>({});

  // Section data
  const [skills, setSkills] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  // Editing
  const [editItem, setEditItem] = useState<any>(null);
  const [editSection, setEditSection] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  // AI extraction
  const [extracting, setExtracting] = useState(false);
  const [extractFile, setExtractFile] = useState<File | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [u, sk, ex, ed, ce, co] = await Promise.all([
        getUser(token), getSkills(token), getExperiences(token),
        getEducation(token), getCertificates(token), getContacts(token),
      ]);
      setProfileForm(u || {});
      setSkills(sk || []);
      setExperiences(ex || []);
      setEducation(ed || []);
      setCertificates(ce || []);
      setContacts(co || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateUser(token, profileForm);
      setUser(updated);
      setSuccess('Profile updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleExtractSkills = async () => {
    if (!token || !extractFile) return;
    setExtracting(true);
    try {
      await extractSkill(token, { file: extractFile, mode: 'entire_document' });
      setExtractFile(null);
      setSuccess('Skills extracted! Refreshing...');
      setTimeout(() => { setSuccess(''); refresh(); }, 2000);
    } catch (e: any) { setError(e.message); }
    setExtracting(false);
  };

  // Generic CRUD handlers
  const handleSaveItem = async () => {
    if (!token || !editItem) return;
    try {
      const ops: any = {
        skills: { create: createSkill, update: updateSkill },
        experiences: { create: createExperience, update: updateExperience },
        education: { create: createEducation, update: updateEducation },
        certificates: { create: createCertificate, update: updateCertificate },
        contacts: { create: createContact, update: updateContact },
      };
      const op = ops[editSection];
      if (editItem.id) await op.update(token, editItem.id, editItem);
      else await op.create(token, editItem);
      setEditOpen(false);
      setEditItem(null);
      refresh();
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteItem = async (id: string, section: string) => {
    if (!token) return;
    const ops: any = { skills: deleteSkill, experiences: deleteExperience, education: deleteEducation, certificates: deleteCertificate, contacts: deleteContact };
    try { await ops[section](token, id); refresh(); }
    catch (e: any) { setError(e.message); }
  };

  const openCreate = (section: string, template: any) => {
    setEditSection(section);
    setEditItem(template);
    setEditOpen(true);
  };

  const openEdit = (section: string, item: any) => {
    setEditSection(section);
    setEditItem({ ...item });
    setEditOpen(true);
  };

  const userInitials = profileForm
    ? `${profileForm.first_name?.[0] || ''}${profileForm.last_name?.[0] || ''}`.toUpperCase() || '?'
    : '?';

  const tabs = [
    { label: 'Skills', icon: <SkillIcon />, count: skills.length },
    { label: 'Experience', icon: <WorkIcon />, count: experiences.length },
    { label: 'Education', icon: <SchoolIcon />, count: education.length },
    { label: 'Certificates', icon: <CertIcon />, count: certificates.length },
    { label: 'Contacts', icon: <ContactIcon />, count: contacts.length },
  ];

  if (loading) {
    return <Box><Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 3 }} /><Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} /></Box>;
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Profile Hero */}
      <Card sx={{ mb: 3, background: theme.palette.mode === 'dark' ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.1)}, ${alpha(theme.palette.secondary.dark, 0.08)})` : undefined }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Avatar sx={{ width: 80, height: 80, fontSize: '2rem', fontWeight: 800, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }}>
              {userInitials}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth size="small" label="First Name" value={profileForm.first_name || ''} onChange={e => setProfileForm((p: any) => ({ ...p, first_name: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth size="small" label="Last Name" value={profileForm.last_name || ''} onChange={e => setProfileForm((p: any) => ({ ...p, last_name: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth size="small" label="Email" value={profileForm.email || ''} disabled />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth size="small" label="Phone" value={profileForm.phone_number || ''} onChange={e => setProfileForm((p: any) => ({ ...p, phone_number: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth size="small" label="Address Line 1" value={profileForm.address_line_1 || ''} onChange={e => setProfileForm((p: any) => ({ ...p, address_line_1: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth size="small" label="Address Line 2" value={profileForm.address_line_2 || ''} onChange={e => setProfileForm((p: any) => ({ ...p, address_line_2: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <TextField fullWidth size="small" label="City" value={profileForm.city || ''} onChange={e => setProfileForm((p: any) => ({ ...p, city: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <TextField fullWidth size="small" label="State" value={profileForm.state || ''} onChange={e => setProfileForm((p: any) => ({ ...p, state: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <TextField fullWidth size="small" label="Zip Code" value={profileForm.zip_code || ''} onChange={e => setProfileForm((p: any) => ({ ...p, zip_code: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
                  <TextField fullWidth size="small" label="Country" value={profileForm.country || ''} onChange={e => setProfileForm((p: any) => ({ ...p, country: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth size="small" label="Time Zone" value={profileForm.time_zone || ''} onChange={e => setProfileForm((p: any) => ({ ...p, time_zone: e.target.value }))} placeholder="e.g. America/New_York" />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* AI Import Section */}
      <Card sx={{ mb: 3, border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}` }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <AIIcon color="primary" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>AI Resume Import</Typography>
              <Typography variant="body2" color="text.secondary">Upload your resume to auto-extract skills</Typography>
            </Box>
            <Button component="label" variant="outlined" startIcon={<UploadIcon />} disabled={extracting}>
              Choose File
              <input type="file" hidden accept=".pdf,.txt,.html" onChange={(e) => setExtractFile(e.target.files?.[0] || null)} />
            </Button>
            {extractFile && (
              <>
                <Chip label={extractFile.name} size="small" onDelete={() => setExtractFile(null)} />
                <Button variant="contained" size="small" startIcon={<AIIcon />} onClick={handleExtractSkills} disabled={extracting}>
                  {extracting ? 'Extracting...' : 'Extract'}
                </Button>
              </>
            )}
          </Stack>
          {extracting && <LinearProgress sx={{ mt: 2 }} />}
        </CardContent>
      </Card>

      {/* Tabbed Sections */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ px: 2, pt: 1, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 } }}
          variant="scrollable" scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={`${t.label} (${t.count})`} />
          ))}
        </Tabs>
        <Divider />
        <CardContent sx={{ p: 3 }}>
          {/* Skills Tab */}
          {tab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('skills', { name: '', category: '', yoe: 0, subskills: '' })}>Add Skill</Button>
              </Box>
              {skills.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No skills yet. Add manually or use AI import.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {skills.map((skill: any) => (
                    <Chip key={skill.id} label={`${skill.name}${skill.yoe ? ` (${skill.yoe}yr)` : ''}`}
                      color="primary" variant="outlined"
                      onDelete={() => handleDeleteItem(skill.id, 'skills')}
                      onClick={() => openEdit('skills', skill)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Experience Tab */}
          {tab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('experiences', { title: '', company: '', location: '', start_date: '', end_date: '', description: '', projects: '' })}>Add Experience</Button>
              </Box>
              <Stack spacing={2}>
                {experiences.map((exp: any) => (
                  <Box key={exp.id} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{exp.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</Typography>
                        <Typography variant="caption" color="text.secondary">{exp.start_date} — {exp.end_date || 'Present'}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openEdit('experiences', exp)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteItem(exp.id, 'experiences')}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </Box>
                    {exp.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{exp.description}</Typography>}
                    {exp.projects && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>Projects: {exp.projects}</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Education Tab */}
          {tab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('education', { university: '', degree: '', gradePoint: '', start_date: '', end_date: '', activities: '', achievements: '' })}>Add Education</Button>
              </Box>
              <Stack spacing={2}>
                {education.map((edu: any) => (
                  <Box key={edu.id} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{edu.degree}</Typography>
                        <Typography variant="body2" color="text.secondary">{edu.university}</Typography>
                        <Typography variant="caption" color="text.secondary">{edu.start_date} — {edu.end_date || 'Present'}{edu.gradePoint ? ` · GPA: ${edu.gradePoint}` : ''}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openEdit('education', edu)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteItem(edu.id, 'education')}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </Box>
                    {edu.activities && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Activities: {edu.activities}</Typography>}
                    {edu.achievements && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Achievements: {edu.achievements}</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Certificates Tab */}
          {tab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('certificates', { title: '', issuer: '', issued_date: '', expiration_date: '' })}>Add Certificate</Button>
              </Box>
              <Stack spacing={2}>
                {certificates.map((cert: any) => (
                  <Box key={cert.id} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{cert.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{cert.issuer}</Typography>
                        <Typography variant="caption" color="text.secondary">{cert.issued_date}{cert.expiration_date ? ` — ${cert.expiration_date}` : ''}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openEdit('certificates', cert)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteItem(cert.id, 'certificates')}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Contacts Tab */}
          {tab === 4 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('contacts', { first_name: '', last_name: '', email: '', phone_number: '', time_zone: '', notes: '' })}>Add Contact</Button>
              </Box>
              <Grid container spacing={2}>
                {contacts.map((contact: any) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={contact.id}>
                    <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>{contact.first_name} {contact.last_name}</Typography>
                          {contact.email && <Typography variant="body2" color="text.secondary">{contact.email}</Typography>}
                          {contact.phone_number && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{contact.phone_number}</Typography>}
                          {contact.time_zone && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>TZ: {contact.time_zone}</Typography>}
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => openEdit('contacts', contact)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteItem(contact.id, 'contacts')}><DeleteIcon fontSize="small" /></IconButton>
                        </Stack>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Generic Edit Dialog */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setEditItem(null); }} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editItem?.id ? 'Edit' : 'Add'} {editSection.charAt(0).toUpperCase() + editSection.slice(1).replace(/s$/, '')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editItem && Object.keys(editItem).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at' && k !== 'updated_at').map((key) => (
              <TextField key={key} fullWidth label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={editItem[key] ?? ''} onChange={e => setEditItem((p: any) => ({ ...p, [key]: e.target.value }))}
                multiline={key === 'description' || key === 'notes' || key === 'projects'}
                rows={key === 'description' || key === 'notes' ? 3 : 1}
                type={key === 'yoe' ? 'number' : key.includes('date') ? 'date' : 'text'}
                InputLabelProps={key.includes('date') ? { shrink: true } : undefined}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setEditOpen(false); setEditItem(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveItem}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
