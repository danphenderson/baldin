import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
  PersonAdd as PersonAddIcon,
  LocationOn as LocationIcon,
  Lock as LockIcon,
  Mail as MessageIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getDirectoryProfile,
  type UserPublicProfileRead,
} from '../service/directory';
import { createConnection, getConnections } from '../service/connections';
import { createConversation } from '../service/messages';

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { token, user, canAccessTier } = useContext(UserContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserPublicProfileRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const notify = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getDirectoryProfile(token, userId)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token, userId]);

  useEffect(() => {
    if (!token || !userId || userId === user?.id) return;
    let cancelled = false;
    getConnections(token, { status: 'accepted', page: 1, page_size: 500 })
      .then((res) => {
        if (cancelled) return;
        const found = (res.items ?? []).some(
          (c) => c.requester.user_id === userId || c.addressee.user_id === userId,
        );
        setIsConnected(found);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, userId, user?.id]);

  usePageToolbarHeader(profile?.display_name ?? 'User Profile', profile?.headline ?? undefined);

  const isSelf = user?.id === userId;
  const canSendMessage = canAccessTier('starter');
  const canRequestConnection = Boolean(profile?.is_superuser) || canAccessTier('starter');

  const handleConnect = async () => {
    if (!token || !userId) return;
    setConnecting(true);
    try {
      await createConnection(token, { addressee_id: userId });
      setConnected(true);
      notify('Connection request sent');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to send request', 'error');
    }
    setConnecting(false);
  };

  const handleMessage = async () => {
    if (!token || !userId) return;
    setMessaging(true);
    try {
      const conv = await createConversation(token, {
        participant_user_ids: [userId],
        type: 'direct',
      });
      navigate(`/network/messages/${conv.id}`);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to open conversation', 'error');
    }
    setMessaging(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/network/directory')} sx={{ mb: 2 }}>
          Back to Directory
        </Button>
        <Alert severity="error">{error ?? 'Profile not found.'}</Alert>
      </Box>
    );
  }

  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ');

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/network/directory')} sx={{ mb: 3 }}>
        Back to Directory
      </Button>

      {/* Header card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Avatar
              src={profile.avatar_uri || undefined}
              sx={{ width: 80, height: 80, fontSize: 32 }}
            >
              {profile.display_name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={700}>{profile.display_name}</Typography>
              {profile.is_superuser && (
                <Chip
                  icon={<AutoAwesomeIcon fontSize="small" />}
                  label="Superuser"
                  color="warning"
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1.25 }}
                />
              )}
              {profile.headline && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: profile.is_superuser ? 1 : 0.5 }}>{profile.headline}</Typography>
              )}
              {location && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                  <LocationIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">{location}</Typography>
                </Stack>
              )}
              <Chip
                label={profile.placement_status}
                size="small"
                color={profile.placement_status === 'active' ? 'success' : 'default'}
                variant="outlined"
                sx={{ mt: 1.5 }}
              />
            </Box>
            {!isSelf && (
              <Stack spacing={1} alignItems={{ sm: 'flex-end' }}>
                <Stack direction="row" spacing={1}>
                  {isConnected && (
                    canSendMessage ? (
                      <Button
                        variant="outlined"
                        startIcon={messaging ? <CircularProgress size={16} color="inherit" /> : <MessageIcon />}
                        disabled={messaging}
                        onClick={handleMessage}
                      >
                        Message
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        onClick={() => navigate('/settings/subscription')}
                      >
                        Unlock Messages
                      </Button>
                    )
                  )}
                  {canRequestConnection ? (
                    <Button
                      variant="contained"
                      startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
                      disabled={connecting || connected}
                      onClick={handleConnect}
                    >
                      {connected ? 'Request Sent' : 'Connect'}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<LockIcon />}
                      onClick={() => navigate('/settings/subscription')}
                    >
                      Starter Required
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {profile.is_superuser
                    ? 'Superusers accept connection requests from any authenticated Baldin account.'
                    : 'Starter or Pro is required to connect with other members.'}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Bio */}
      {profile.bio && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>About</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{profile.bio}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {(profile.skills ?? []).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Skills</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(profile.skills ?? []).map((skill) => (
                <Chip key={skill.id} label={skill.name} size="small" variant="outlined" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Experiences */}
      {(profile.experiences ?? []).length > 0 && (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Experience</Typography>
            <Stack spacing={2}>
              {(profile.experiences ?? []).map((exp) => (
                <Box key={exp.id}>
                  <Typography variant="body1" fontWeight={600}>{exp.title}</Typography>
                  {exp.company && (
                    <Typography variant="body2" color="text.secondary">{exp.company}</Typography>
                  )}
                  {(exp.start_date || exp.end_date) && (
                    <Typography variant="caption" color="text.secondary">
                      {exp.start_date ?? '—'} – {exp.end_date ?? 'Present'}
                    </Typography>
                  )}
                  {exp.description && (
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>{exp.description}</Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfilePage;
