import React, { useContext, useEffect, useMemo } from 'react';
import {
  Box, Typography, Chip, Stack, useTheme, Skeleton, Alert,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Code as SkillIcon, Work as WorkIcon, School as SchoolIcon,
  CardMembership as CertIcon, Contacts as ContactIcon,
} from '@mui/icons-material';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import type { SkillRead } from '../../service/skills';

import { useProfileData } from './hooks/useProfileData';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import { stagger } from './constants';
import { ProfileHero } from './components/ProfileHero';
import { ProfileBuilderPanel } from './components/ProfileBuilderPanel';
import { ProfileSection } from './components/ProfileSection';
import { ItemCard } from './components/ItemCard';
import { EmptyState } from './components/EmptyState';
import { DateSpan } from './components/DateSpan';
import { EditDialog } from './components/EditDialog';
import { DeleteDialog } from './components/DeleteDialog';
import { DocumentsSummary } from './components/DocumentsSummary';
import ProfileImportModal from '../../component/profile-import-modal';
import MFASetupCard from '../../component/mfa-setup-card';

const MotionBox = motion.create(Box);

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const { token, setUser } = useContext(UserContext);

  const data = useProfileData(token, setUser);

  const { completionPercent, rankedTasks } = useProfileCompletion(
    data.profile,
    data.skills,
    data.experiences,
    data.education,
    data.certificates,
    data.contacts,
  );

  const sectionCounts = useMemo(() => ({
    skills: data.skills.length,
    experiences: data.experiences.length,
    education: data.education.length,
    certificates: data.certificates.length,
    contacts: data.contacts.length,
  }), [data.skills, data.experiences, data.education, data.certificates, data.contacts]);

  useEffect(() => { data.refresh(); }, [data.refresh]);

  // Auto-open import modal for first-time users (empty profile)
  useEffect(() => {
    if (!data.loading && completionPercent === 0) {
      data.setShowImportModal(true);
    }
  }, [data.loading, completionPercent]);

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------

  const userInitials = useMemo(() => {
    if (!data.profile) return '?';
    return `${data.profile.first_name?.[0] ?? ''}${data.profile.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  }, [data.profile]);

  const fullName = useMemo(() => {
    if (!data.profile) return '';
    const parts = [data.profile.first_name, data.profile.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Unnamed User';
  }, [data.profile]);

  const locationLine = useMemo(() => {
    if (!data.profile) return '';
    return [data.profile.city, data.profile.state, data.profile.country].filter(Boolean).join(', ');
  }, [data.profile]);

  usePageToolbarHeader('Profile', "Your professional identity powering Baldin's AI autopilot");

  const skillsByCategory = useMemo(() => {
    const map = new Map<string, SkillRead[]>();
    for (const skill of data.skills) {
      const cat = skill.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(skill);
    }
    return map;
  }, [data.skills]);

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (data.loading) {
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
      {data.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => data.setError('')}>
          {data.error}
        </Alert>
      )}

      {/* ── Profile Hero ─────────────────────────────────────────────── */}
      <ProfileHero
        profile={data.profile}
        editingProfile={data.editingProfile}
        profileDraft={data.profileDraft}
        saving={data.saving}
        userInitials={userInitials}
        fullName={fullName}
        locationLine={locationLine}
        startEditProfile={data.startEditProfile}
        cancelEditProfile={data.cancelEditProfile}
        handleSaveProfile={data.handleSaveProfile}
        pf={data.pf}
        sectionCounts={sectionCounts}
        completionPercent={completionPercent}
      />

      {/* ── Profile Builder Panel ──────────────────────────────────── */}
      <ProfileBuilderPanel
        completionPercent={completionPercent}
        rankedTasks={rankedTasks}
        openCreate={data.openCreate}
        startEditProfile={data.startEditProfile}
        onOpenImportModal={() => data.setShowImportModal(true)}
      />

      {/* ── Profile Sections ────────────────────────────────────────── */}
      <Stack spacing={3}>

        {/* ── Skills ──────────────────── */}
        <ProfileSection
          id="section-skills"
          icon={<SkillIcon />}
          title="Skills"
          count={data.skills.length}
          onAdd={() => data.openCreate('skills')}
        >
          {data.skills.length === 0 ? (
            <EmptyState icon={<SkillIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Skills" onAdd={() => data.openCreate('skills')} />
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
                          onClick={() => data.openEdit('skills', skill)}
                          onDelete={() => data.confirmDelete(skill.id, 'skills', skill.name ?? 'skill')}
                          sx={{ '&:hover': { borderColor: theme.palette.primary.main } }}
                        />
                      ))}
                    </Box>
                  </MotionBox>
                ))}
              </Stack>
            </AnimatePresence>
          )}
        </ProfileSection>

        {/* ── Experience ──────────────── */}
        <ProfileSection
          id="section-experience"
          icon={<WorkIcon />}
          title="Experience"
          count={data.experiences.length}
          onAdd={() => data.openCreate('experiences')}
        >
          {data.experiences.length === 0 ? (
            <EmptyState icon={<WorkIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Experience" onAdd={() => data.openCreate('experiences')} />
          ) : (
            <Stack spacing={2}>
              {data.experiences.map(exp => (
                <ItemCard
                  key={exp.id}
                  onEdit={() => data.openEdit('experiences', exp)}
                  onDelete={() => data.confirmDelete(exp.id, 'experiences', exp.title ?? 'experience')}
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
        </ProfileSection>

        {/* ── Education ──────────────── */}
        <ProfileSection
          id="section-education"
          icon={<SchoolIcon />}
          title="Education"
          count={data.education.length}
          onAdd={() => data.openCreate('education')}
        >
          {data.education.length === 0 ? (
            <EmptyState icon={<SchoolIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Education" onAdd={() => data.openCreate('education')} />
          ) : (
            <Stack spacing={2}>
              {data.education.map(edu => (
                <ItemCard
                  key={edu.id}
                  onEdit={() => data.openEdit('education', edu)}
                  onDelete={() => data.confirmDelete(edu.id, 'education', edu.degree ?? 'education')}
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
        </ProfileSection>

        {/* ── Certificates ──────────── */}
        <ProfileSection
          id="section-certificates"
          icon={<CertIcon />}
          title="Certificates"
          count={data.certificates.length}
          onAdd={() => data.openCreate('certificates')}
        >
          {data.certificates.length === 0 ? (
            <EmptyState icon={<CertIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Certificates" onAdd={() => data.openCreate('certificates')} />
          ) : (
            <Stack spacing={2}>
              {data.certificates.map(cert => (
                <ItemCard
                  key={cert.id}
                  onEdit={() => data.openEdit('certificates', cert)}
                  onDelete={() => data.confirmDelete(cert.id, 'certificates', cert.title ?? 'certificate')}
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
        </ProfileSection>

        {/* ── Contacts ──────────────── */}
        <ProfileSection
          id="section-contacts"
          icon={<ContactIcon />}
          title="Contacts"
          count={data.contacts.length}
          onAdd={() => data.openCreate('contacts')}
        >
          {data.contacts.length === 0 ? (
            <EmptyState icon={<ContactIcon sx={{ fontSize: 32, color: 'primary.main' }} />} section="Contacts" onAdd={() => data.openCreate('contacts')} />
          ) : (
            <Grid container spacing={2}>
              {data.contacts.map(contact => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={contact.id}>
                  <ItemCard
                    onEdit={() => data.openEdit('contacts', contact)}
                    onDelete={() => data.confirmDelete(contact.id, 'contacts', `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'contact')}
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
        </ProfileSection>

        {/* ── Documents Summary ────────────────────────────────────────── */}
        <DocumentsSummary token={token} />

        {/* ── Security (MFA) ──────────────────────────────────────────── */}
        <MFASetupCard />
      </Stack>

      {/* ── Edit / Create Dialog ─────────────────────────────────────── */}
      <EditDialog
        open={data.editOpen}
        editSection={data.editSection}
        editItem={data.editItem}
        editSaving={data.editSaving}
        setEditItem={data.setEditItem}
        onClose={data.closeEdit}
        onSave={data.handleSaveItem}
      />

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      <DeleteDialog
        deleteTarget={data.deleteTarget}
        onCancel={data.cancelDelete}
        onConfirm={data.handleDelete}
      />

      {/* ── Profile Import Modal ──────────────────────────────────────── */}
      <ProfileImportModal
        open={data.showImportModal}
        onClose={() => data.setShowImportModal(false)}
        token={token}
        onSuccess={() => {
          data.setToast('Profile imported successfully');
          data.refresh();
        }}
      />

      {/* ── Success toast ─────────────────────────────────────────────── */}
      <Snackbar
        open={!!data.toast}
        autoHideDuration={3000}
        onClose={() => data.setToast('')}
        message={data.toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ProfilePage;
