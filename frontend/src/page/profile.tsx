import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Alert, Avatar, Divider, Tabs, Tab, LinearProgress, Tooltip, Collapse,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Save as SaveIcon,
  Upload as UploadIcon, AutoAwesome as AIIcon, Code as SkillIcon,
  Work as WorkIcon, School as SchoolIcon, CardMembership as CertIcon,
  Contacts as ContactIcon, Close as CloseIcon, Check as CheckIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'motion/react';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import { getUser, updateUser, type UserRead, type UserUpdate } from '../service/users';
import {
  getSkills, createSkill, updateSkill, deleteSkill, extractSkill,
  type SkillRead, type SkillCreate,
} from '../service/skills';
import {
  getExperiences, createExperience, updateExperience, deleteExperience,
  type ExperienceRead, type ExperienceCreate,
} from '../service/experiences';
import {
  getEducations as getEducation, createEducation, updateEducation, deleteEducation,
  type EducationRead, type EducationCreate,
} from '../service/education';
import {
  getCertificates, createCertificate, updateCertificate, deleteCertificate,
  type CertificateRead, type CertificateCreate,
} from '../service/certificates';
import {
  getContacts, createContact, updateContact, deleteContact,
  type ContactRead, type ContactCreate,
} from '../service/contacts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionKey = 'skills' | 'experiences' | 'education' | 'certificates' | 'contacts';

type EditableItem =
  | (SkillRead | SkillCreate)
  | (ExperienceRead | ExperienceCreate)
  | (EducationRead | EducationCreate)
  | (CertificateRead | CertificateCreate)
  | (ContactRead | ContactCreate);

interface DeleteTarget {
  id: string;
  section: SectionKey;
  label: string;
}

// ---------------------------------------------------------------------------
// Field configs for each section dialog
// ---------------------------------------------------------------------------

interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  multiline?: boolean;
  rows?: number;
}

const SKILL_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Skill Name' },
  { key: 'category', label: 'Category' },
  { key: 'yoe', label: 'Years of Experience', type: 'number' },
  { key: 'subskills', label: 'Sub-skills' },
];

const EXPERIENCE_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Job Title' },
  { key: 'company', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'end_date', label: 'End Date', type: 'date' },
  { key: 'description', label: 'Description', multiline: true, rows: 3 },
  { key: 'projects', label: 'Projects', multiline: true, rows: 2 },
];

const EDUCATION_FIELDS: FieldConfig[] = [
  { key: 'degree', label: 'Degree' },
  { key: 'university', label: 'University' },
  { key: 'gradePoint', label: 'GPA' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'end_date', label: 'End Date', type: 'date' },
  { key: 'activities', label: 'Activities', multiline: true, rows: 2 },
  { key: 'achievements', label: 'Achievements', multiline: true, rows: 2 },
];

const CERTIFICATE_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Certificate Title' },
  { key: 'issuer', label: 'Issuer' },
  { key: 'issued_date', label: 'Issued Date', type: 'date' },
  { key: 'expiration_date', label: 'Expiration Date', type: 'date' },
];

const CONTACT_FIELDS: FieldConfig[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone_number', label: 'Phone Number' },
  { key: 'time_zone', label: 'Time Zone' },
  { key: 'notes', label: 'Notes', multiline: true, rows: 3 },
];

const SECTION_FIELDS: Record<SectionKey, FieldConfig[]> = {
  skills: SKILL_FIELDS,
  experiences: EXPERIENCE_FIELDS,
  education: EDUCATION_FIELDS,
  certificates: CERTIFICATE_FIELDS,
  contacts: CONTACT_FIELDS,
};

const SECTION_LABELS: Record<SectionKey, string> = {
  skills: 'Skill',
  experiences: 'Experience',
  education: 'Education',
  certificates: 'Certificate',
  contacts: 'Contact',
};

const BLANK_TEMPLATES: Record<SectionKey, EditableItem> = {
  skills: { name: '', category: '', yoe: 0, subskills: '' },
  experiences: { title: '', company: '', location: '', start_date: '', end_date: '', description: '', projects: '' },
  education: { university: '', degree: '', gradePoint: '', start_date: '', end_date: '', activities: '', achievements: '' },
  certificates: { title: '', issuer: '', issued_date: '', expiration_date: '' },
  contacts: { first_name: '', last_name: '', email: '', phone_number: '', time_zone: '', notes: '' },
};

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

const stagger = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const MotionBox = motion.create(Box);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const DateSpan: React.FC<{ value: string | null | undefined }> = ({ value }) => {
  if (!value) return <>Present</>;
  try {
    return <>{new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>;
  } catch {
    return <>{value}</>;
  }
};

const EmptyState: React.FC<{ icon: React.ReactNode; section: string; onAdd: () => void }> = ({ icon, section, onAdd }) => {
  const theme = useTheme();
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Box sx={{
        display: 'inline-flex', p: 2, borderRadius: '50%', mb: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      }}>
        {icon}
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        No {section.toLowerCase()} yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 320, mx: 'auto' }}>
        {section === 'Skills'
          ? 'Add skills manually or use the AI resume import above.'
          : `Add your ${section.toLowerCase()} to build a stronger profile.`}
      </Typography>
      <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>
        Add {section.replace(/s$/, '')}
      </Button>
    </Box>
  );
};

const ItemCard: React.FC<{
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  ariaLabel: string;
}> = ({ children, onEdit, onDelete, ariaLabel }) => {
  const theme = useTheme();
  return (
    <MotionBox
      layout
      {...stagger}
      transition={{ duration: 0.22 }}
      sx={{
        p: 2.5, borderRadius: 2.5,
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.3), bgcolor: alpha(theme.palette.primary.main, 0.02) },
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
          <Tooltip title="Edit" arrow>
            <IconButton size="small" onClick={onEdit} aria-label={`Edit ${ariaLabel}`}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton size="small" color="error" onClick={onDelete} aria-label={`Delete ${ariaLabel}`}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </MotionBox>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const { token, setUser } = useContext(UserContext);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);

  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [profile, setProfile] = useState<UserRead | null>(null);
  const [profileDraft, setProfileDraft] = useState<UserUpdate>({});

  const [skills, setSkills] = useState<SkillRead[]>([]);
  const [experiences, setExperiences] = useState<ExperienceRead[]>([]);
  const [education, setEducation] = useState<EducationRead[]>([]);
  const [certificates, setCertificates] = useState<CertificateRead[]>([]);
  const [contacts, setContacts] = useState<ContactRead[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<SectionKey>('skills');
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [extractFile, setExtractFile] = useState<File | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [u, sk, ex, ed, ce, co] = await Promise.all([
        getUser(token), getSkills(token), getExperiences(token),
        getEducation(token), getCertificates(token), getContacts(token),
      ]);
      setProfile(u);
      setSkills(sk || []);
      setExperiences(ex || []);
      setEducation(ed || []);
      setCertificates(ce || []);
      setContacts(co || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load profile data');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  // -----------------------------------------------------------------------
  // Profile handlers
  // -----------------------------------------------------------------------

  const startEditProfile = () => {
    if (!profile) return;
    setProfileDraft({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone_number: profile.phone_number ?? '',
      address_line_1: profile.address_line_1 ?? '',
      address_line_2: profile.address_line_2 ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      zip_code: profile.zip_code ?? '',
      country: profile.country ?? '',
      time_zone: profile.time_zone ?? '',
    });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateUser(token, profileDraft);
      setUser(updated);
      setProfile(updated);
      setEditingProfile(false);
      setToast('Profile updated');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    }
    setSaving(false);
  };

  const pf = (key: keyof UserUpdate, value: string) =>
    setProfileDraft(prev => ({ ...prev, [key]: value }));

  // -----------------------------------------------------------------------
  // AI extraction
  // -----------------------------------------------------------------------

  const handleExtractSkills = async () => {
    if (!token || !extractFile) return;
    setExtracting(true);
    try {
      await extractSkill(token, { file: extractFile, mode: 'entire_document' });
      setExtractFile(null);
      setToast('Skills extracted successfully');
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    }
    setExtracting(false);
  };

  // -----------------------------------------------------------------------
  // Section CRUD
  // -----------------------------------------------------------------------

  const openCreate = (section: SectionKey) => {
    setEditSection(section);
    setEditItem({ ...BLANK_TEMPLATES[section] } as Record<string, unknown>);
    setEditOpen(true);
  };

  const openEdit = (section: SectionKey, item: EditableItem) => {
    setEditSection(section);
    setEditItem({ ...item } as Record<string, unknown>);
    setEditOpen(true);
  };

  const handleSaveItem = async () => {
    if (!token || !editItem) return;
    setEditSaving(true);
    try {
      const isUpdate = 'id' in editItem && !!editItem.id;
      const ops = {
        skills: { create: createSkill, update: updateSkill },
        experiences: { create: createExperience, update: updateExperience },
        education: { create: createEducation, update: updateEducation },
        certificates: { create: createCertificate, update: updateCertificate },
        contacts: { create: createContact, update: updateContact },
      } as const;
      const op = ops[editSection];
      if (isUpdate) {
        await (op.update as (t: string, id: string, data: unknown) => Promise<unknown>)(token, editItem.id as string, editItem);
      } else {
        await (op.create as (t: string, data: unknown) => Promise<unknown>)(token, editItem);
      }
      setEditOpen(false);
      setEditItem(null);
      setToast(`${SECTION_LABELS[editSection]} ${isUpdate ? 'updated' : 'created'}`);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setEditSaving(false);
  };

  const confirmDelete = (id: string, section: SectionKey, label: string) => {
    setDeleteTarget({ id, section, label });
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    const ops: Record<SectionKey, (t: string, id: string) => Promise<unknown>> = {
      skills: deleteSkill, experiences: deleteExperience, education: deleteEducation,
      certificates: deleteCertificate, contacts: deleteContact,
    };
    try {
      await ops[deleteTarget.section](token, deleteTarget.id);
      setToast(`${SECTION_LABELS[deleteTarget.section]} deleted`);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
    setDeleteTarget(null);
  };

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------

  const userInitials = useMemo(() => {
    if (!profile) return '?';
    return `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  }, [profile]);

  const fullName = useMemo(() => {
    if (!profile) return '';
    const parts = [profile.first_name, profile.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Unnamed User';
  }, [profile]);

  const locationLine = useMemo(() => {
    if (!profile) return '';
    return [profile.city, profile.state, profile.country].filter(Boolean).join(', ');
  }, [profile]);

  usePageToolbarHeader('Profile', "Your professional identity powering Baldin's AI autopilot");

  const skillsByCategory = useMemo(() => {
    const map = new Map<string, SkillRead[]>();
    for (const skill of skills) {
      const cat = skill.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(skill);
    }
    return map;
  }, [skills]);

  const tabs = [
    { label: 'Skills', icon: <SkillIcon />, count: skills.length },
    { label: 'Experience', icon: <WorkIcon />, count: experiences.length },
    { label: 'Education', icon: <SchoolIcon />, count: education.length },
    { label: 'Certificates', icon: <CertIcon />, count: certificates.length },
    { label: 'Contacts', icon: <ContactIcon />, count: contacts.length },
  ];

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ── Profile Hero ─────────────────────────────────────────────── */}
      <Card
        sx={{
          mb: 3,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.12)}, ${alpha(theme.palette.secondary.dark, 0.06)})`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.06)}, ${alpha(theme.palette.secondary.light, 0.04)})`,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          {editingProfile ? (
            /* ─── Edit mode ─── */
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>Edit Profile</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={cancelEditProfile}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </Stack>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="First Name" value={profileDraft.first_name ?? ''} onChange={e => pf('first_name', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Last Name" value={profileDraft.last_name ?? ''} onChange={e => pf('last_name', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Phone" value={profileDraft.phone_number ?? ''} onChange={e => pf('phone_number', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Address Line 1" value={profileDraft.address_line_1 ?? ''} onChange={e => pf('address_line_1', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Address Line 2" value={profileDraft.address_line_2 ?? ''} onChange={e => pf('address_line_2', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="City" value={profileDraft.city ?? ''} onChange={e => pf('city', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="State" value={profileDraft.state ?? ''} onChange={e => pf('state', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="Zip Code" value={profileDraft.zip_code ?? ''} onChange={e => pf('zip_code', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="Country" value={profileDraft.country ?? ''} onChange={e => pf('country', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField fullWidth size="small" label="Time Zone" value={profileDraft.time_zone ?? ''} onChange={e => pf('time_zone', e.target.value)} placeholder="e.g. America/New_York" />
                </Grid>
              </Grid>
            </Box>
          ) : (
            /* ─── View mode ─── */
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Avatar
                sx={{
                  width: 72, height: 72, fontSize: '1.75rem', fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      {fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {profile?.email}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={startEditProfile}
                    sx={{ flexShrink: 0 }}
                  >
                    Edit
                  </Button>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}
                  useFlexGap
                >
                  {locationLine && (
                    <Chip
                      label={locationLine}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: alpha(theme.palette.text.secondary, 0.2) }}
                    />
                  )}
                  {profile?.phone_number && (
                    <Chip
                      label={profile.phone_number}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: alpha(theme.palette.text.secondary, 0.2) }}
                    />
                  )}
                  {profile?.time_zone && (
                    <Chip
                      label={profile.time_zone}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: alpha(theme.palette.text.secondary, 0.2) }}
                    />
                  )}
                </Stack>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── AI Resume Import ─────────────────────────────────────────── */}
      <Card
        sx={{
          mb: 3,
          border: `1px dashed ${alpha(theme.palette.primary.main, 0.25)}`,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
            onClick={() => setAiExpanded(prev => !prev)}
            role="button"
            tabIndex={0}
            aria-expanded={aiExpanded}
            aria-label="Toggle AI resume import"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAiExpanded(prev => !prev); } }}
          >
            <Box
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
              }}
            >
              <AIIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                AI Resume Import
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload your resume to auto-extract skills
              </Typography>
            </Box>
            <ExpandIcon
              sx={{
                transform: aiExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s',
                color: 'text.secondary',
              }}
            />
          </Box>
          <Collapse in={aiExpanded}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
              sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}
            >
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                disabled={extracting}
                sx={{ flexShrink: 0 }}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".pdf,.txt,.html"
                  onChange={e => setExtractFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              {extractFile && (
                <Chip
                  label={extractFile.name}
                  size="small"
                  onDelete={() => setExtractFile(null)}
                  sx={{ maxWidth: 250 }}
                />
              )}
              <Button
                variant="contained"
                size="small"
                startIcon={<AIIcon />}
                onClick={handleExtractSkills}
                disabled={extracting || !extractFile}
                sx={{ flexShrink: 0 }}
              >
                {extracting ? 'Extracting…' : 'Extract Skills'}
              </Button>
            </Stack>
            {extracting && <LinearProgress sx={{ mt: 2 }} />}
          </Collapse>
        </CardContent>
      </Card>

      {/* ── Tabbed Sections ──────────────────────────────────────────── */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2, pt: 1,
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              icon={t.icon}
              iconPosition="start"
              label={
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                  {t.label}
                  <Chip
                    label={t.count}
                    size="small"
                    sx={{
                      height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700,
                      bgcolor: tab === i ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.text.secondary, 0.08),
                      color: tab === i ? theme.palette.primary.main : theme.palette.text.secondary,
                    }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
        <Divider />
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

          {/* ── Skills ──────────────────── */}
          {tab === 0 && (
            <Box>
              {skills.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('skills')}>
                    Add Skill
                  </Button>
                </Box>
              )}
              {skills.length === 0 ? (
                <EmptyState icon={<SkillIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Skills" onAdd={() => openCreate('skills')} />
              ) : (
                <AnimatePresence mode="popLayout">
                  <Stack spacing={2.5}>
                    {[...skillsByCategory.entries()].map(([category, categorySkills]) => (
                      <MotionBox key={category} {...stagger} transition={{ duration: 0.2 }}>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ mb: 1, pl: 0.5 }}
                        >
                          {category}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {categorySkills.map(skill => (
                            <Chip
                              key={skill.id}
                              label={
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                  {skill.name}
                                  {skill.yoe ? (
                                    <Box
                                      component="span"
                                      sx={{
                                        fontSize: '0.7rem', fontWeight: 700, opacity: 0.6,
                                        ml: 0.25,
                                      }}
                                    >
                                      {skill.yoe}y
                                    </Box>
                                  ) : null}
                                </Box>
                              }
                              color="primary"
                              variant="outlined"
                              onClick={() => openEdit('skills', skill)}
                              onDelete={() => confirmDelete(skill.id, 'skills', skill.name ?? 'skill')}
                              sx={{ '&:hover': { borderColor: theme.palette.primary.main } }}
                            />
                          ))}
                        </Box>
                      </MotionBox>
                    ))}
                  </Stack>
                </AnimatePresence>
              )}
            </Box>
          )}

          {/* ── Experience ──────────────── */}
          {tab === 1 && (
            <Box>
              {experiences.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('experiences')}>
                    Add Experience
                  </Button>
                </Box>
              )}
              {experiences.length === 0 ? (
                <EmptyState icon={<WorkIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Experience" onAdd={() => openCreate('experiences')} />
              ) : (
                <Stack spacing={2}>
                  {experiences.map(exp => (
                    <ItemCard
                      key={exp.id}
                      onEdit={() => openEdit('experiences', exp)}
                      onDelete={() => confirmDelete(exp.id, 'experiences', exp.title ?? 'experience')}
                      ariaLabel={exp.title ?? 'experience'}
                    >
                      <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {exp.title || 'Untitled Role'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <DateSpan value={exp.start_date} /> — <DateSpan value={exp.end_date} />
                      </Typography>
                      {exp.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>
                          {exp.description}
                        </Typography>
                      )}
                      {exp.projects && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                          Projects: {exp.projects}
                        </Typography>
                      )}
                    </ItemCard>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* ── Education ──────────────── */}
          {tab === 2 && (
            <Box>
              {education.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('education')}>
                    Add Education
                  </Button>
                </Box>
              )}
              {education.length === 0 ? (
                <EmptyState icon={<SchoolIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Education" onAdd={() => openCreate('education')} />
              ) : (
                <Stack spacing={2}>
                  {education.map(edu => (
                    <ItemCard
                      key={edu.id}
                      onEdit={() => openEdit('education', edu)}
                      onDelete={() => confirmDelete(edu.id, 'education', edu.degree ?? 'education')}
                      ariaLabel={edu.degree ?? 'education'}
                    >
                      <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {edu.degree || 'Untitled Degree'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {edu.university}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <DateSpan value={edu.start_date} /> — <DateSpan value={edu.end_date} />
                        {edu.gradePoint ? ` · GPA: ${edu.gradePoint}` : ''}
                      </Typography>
                      {edu.activities && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Activities: {edu.activities}
                        </Typography>
                      )}
                      {edu.achievements && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Achievements: {edu.achievements}
                        </Typography>
                      )}
                    </ItemCard>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* ── Certificates ──────────── */}
          {tab === 3 && (
            <Box>
              {certificates.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('certificates')}>
                    Add Certificate
                  </Button>
                </Box>
              )}
              {certificates.length === 0 ? (
                <EmptyState icon={<CertIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Certificates" onAdd={() => openCreate('certificates')} />
              ) : (
                <Stack spacing={2}>
                  {certificates.map(cert => (
                    <ItemCard
                      key={cert.id}
                      onEdit={() => openEdit('certificates', cert)}
                      onDelete={() => confirmDelete(cert.id, 'certificates', cert.title ?? 'certificate')}
                      ariaLabel={cert.title ?? 'certificate'}
                    >
                      <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {cert.title || 'Untitled Certificate'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {cert.issuer}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {cert.issued_date && <><DateSpan value={cert.issued_date} /></>}
                        {cert.expiration_date && <> — <DateSpan value={cert.expiration_date} /></>}
                      </Typography>
                    </ItemCard>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* ── Contacts ──────────────── */}
          {tab === 4 && (
            <Box>
              {contacts.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => openCreate('contacts')}>
                    Add Contact
                  </Button>
                </Box>
              )}
              {contacts.length === 0 ? (
                <EmptyState icon={<ContactIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Contacts" onAdd={() => openCreate('contacts')} />
              ) : (
                <Grid container spacing={2}>
                  {contacts.map(contact => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={contact.id}>
                      <ItemCard
                        onEdit={() => openEdit('contacts', contact)}
                        onDelete={() => confirmDelete(contact.id, 'contacts', `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'contact')}
                        ariaLabel={`${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'contact'}
                      >
                        <Typography variant="body1" fontWeight={700}>
                          {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                        </Typography>
                        {contact.email && <Typography variant="body2" color="text.secondary">{contact.email}</Typography>}
                        {contact.phone_number && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{contact.phone_number}</Typography>}
                        {contact.time_zone && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>TZ: {contact.time_zone}</Typography>}
                      </ItemCard>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Edit / Create Dialog ─────────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onClose={() => { if (!editSaving) { setEditOpen(false); setEditItem(null); } }}
        maxWidth="sm"
        fullWidth
        aria-labelledby="edit-dialog-title"
      >
        <DialogTitle id="edit-dialog-title" sx={{ fontWeight: 700 }}>
          {editItem && 'id' in editItem && editItem.id ? 'Edit' : 'Add'} {SECTION_LABELS[editSection]}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {SECTION_FIELDS[editSection].map(field => (
              <TextField
                key={field.key}
                fullWidth
                label={field.label}
                value={(editItem as Record<string, unknown>)?.[field.key] ?? ''}
                onChange={e => setEditItem(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
                multiline={field.multiline}
                rows={field.rows ?? 1}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                size="small"
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => { setEditOpen(false); setEditItem(null); }}
            disabled={editSaving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveItem}
            disabled={editSaving}
            startIcon={editSaving ? undefined : <CheckIcon />}
          >
            {editSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 700 }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteTarget?.label}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Success toast ─────────────────────────────────────────────── */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ProfilePage;
