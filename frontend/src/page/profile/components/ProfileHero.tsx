import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField,
  useTheme, alpha, Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit as EditIcon, Close as CloseIcon, Save as SaveIcon,
} from '@mui/icons-material';
import type { UserRead, UserUpdate } from '../../../service/users';

export interface SectionCounts {
  skills: number;
  experiences: number;
  education: number;
  certificates: number;
  contacts: number;
}

interface ProfileHeroProps {
  profile: UserRead | null;
  editingProfile: boolean;
  profileDraft: UserUpdate;
  saving: boolean;
  userInitials: string;
  fullName: string;
  locationLine: string;
  startEditProfile: () => void;
  cancelEditProfile: () => void;
  handleSaveProfile: () => void;
  pf: (key: keyof UserUpdate, value: string) => void;
  sectionCounts?: SectionCounts;
  completionPercent?: number;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  profile,
  editingProfile,
  profileDraft,
  saving,
  userInitials,
  fullName,
  locationLine,
  startEditProfile,
  cancelEditProfile,
  handleSaveProfile,
  pf,
  sectionCounts,
  completionPercent,
}) => {
  const theme = useTheme();

  return (
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
                  variant="text"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={startEditProfile}
                  sx={{ flexShrink: 0, color: 'text.secondary', fontWeight: 500 }}
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

              {/* ── Stats Strip ─── */}
              {sectionCounts && completionPercent !== undefined && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 1.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 0.5,
                    lineHeight: 1.6,
                  }}
                >
                  {[
                    sectionCounts.skills > 0 && `${sectionCounts.skills} Skill${sectionCounts.skills !== 1 ? 's' : ''}`,
                    sectionCounts.experiences > 0 && `${sectionCounts.experiences} Role${sectionCounts.experiences !== 1 ? 's' : ''}`,
                    sectionCounts.education > 0 && `${sectionCounts.education} Edu`,
                    sectionCounts.certificates > 0 && `${sectionCounts.certificates} Cert${sectionCounts.certificates !== 1 ? 's' : ''}`,
                    sectionCounts.contacts > 0 && `${sectionCounts.contacts} Contact${sectionCounts.contacts !== 1 ? 's' : ''}`,
                  ]
                    .filter(Boolean)
                    .map((text, i, arr) => (
                      <React.Fragment key={i}>
                        <Box component="span">{text}</Box>
                        {i < arr.length - 1 && (
                          <Box
                            component="span"
                            sx={{
                              mx: 0.25,
                              opacity: 0.35,
                            }}
                          >
                            ·
                          </Box>
                        )}
                      </React.Fragment>
                    ))}
                  {(sectionCounts.skills > 0 ||
                    sectionCounts.experiences > 0 ||
                    sectionCounts.education > 0 ||
                    sectionCounts.certificates > 0 ||
                    sectionCounts.contacts > 0) && (
                    <Box component="span" sx={{ mx: 0.25, opacity: 0.35 }}>·</Box>
                  )}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 700,
                      color: completionPercent === 100
                        ? theme.palette.success.main
                        : theme.palette.primary.main,
                    }}
                  >
                    {completionPercent}% complete
                  </Box>
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
