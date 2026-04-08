import React, { useContext, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, useTheme,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  SchoolOutlined as AlumniIcon,
  Celebration as CelebrationIcon,
} from '@mui/icons-material';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import { updatePlacement } from '../../service/users';

type PlacementStatus = 'active' | 'graduated' | 'alumni';

const GraduationPage: React.FC = () => {
  const theme = useTheme();
  const { token, user, setUser } = useContext(UserContext);

  const placementStatus: PlacementStatus = (user?.placement_status as PlacementStatus) ?? 'active';

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  usePageToolbarHeader('Graduation', 'Placement lifecycle');

  const handleTransition = async (targetStatus: PlacementStatus) => {
    if (!token) return;
    setActing(true);
    try {
      const updated = await updatePlacement(token, { placement_status: targetStatus });
      setUser(updated);
      setSnack({ open: true, message: `Status updated to ${targetStatus}`, severity: 'success' });
    } catch (e: unknown) {
      setSnack({ open: true, message: e instanceof Error ? e.message : 'Update failed', severity: 'error' });
    }
    setActing(false);
    setConfirmOpen(false);
  };

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      {/* ── Active state ── */}
      {placementStatus === 'active' && (
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: 4 }, textAlign: 'center' }}>
            <CelebrationIcon sx={{ fontSize: 56, color: theme.palette.warning.main, mb: 2 }} />
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
              Got a job? Congratulations!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
              Graduating transitions your account. You&apos;ll retain read-only access to your
              connections and messages, but can no longer create new ones.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<TrophyIcon />}
              onClick={() => setConfirmOpen(true)}
              disabled={acting}
            >
              I Got a Job!
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Graduated state ── */}
      {placementStatus === 'graduated' && (
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: 4 }, textAlign: 'center' }}>
            <TrophyIcon sx={{ fontSize: 56, color: theme.palette.success.main, mb: 2 }} />
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h4" fontWeight={800}>
                You&apos;re graduated!
              </Typography>
              <Chip label="Graduated" color="success" size="small" />
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
              Your connections and messages remain available in read-only mode. When you&apos;re
              ready to join the alumni network, you can transition to alumni status below.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AlumniIcon />}
              onClick={() => setConfirmOpen(true)}
              disabled={acting}
            >
              Become Alumni
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Alumni state ── */}
      {placementStatus === 'alumni' && (
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: 4 }, textAlign: 'center' }}>
            <AlumniIcon sx={{ fontSize: 56, color: theme.palette.info.main, mb: 2 }} />
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h4" fontWeight={800}>
                Welcome, Alumni!
              </Typography>
              <Chip label="Alumni" color="info" size="small" />
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
              You&apos;re part of the Baldin alumni community. Your profile remains visible
              in the directory for other job seekers to discover.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {placementStatus === 'active' ? 'Confirm Graduation' : 'Confirm Alumni Transition'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {placementStatus === 'active'
              ? 'Are you sure? This action moves you to graduated status. You will retain read-only access to your connections and messages.'
              : 'Are you sure you want to transition to alumni status?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={acting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleTransition(placementStatus === 'active' ? 'graduated' : 'alumni')}
            disabled={acting}
          >
            {acting ? 'Updating…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default GraduationPage;
