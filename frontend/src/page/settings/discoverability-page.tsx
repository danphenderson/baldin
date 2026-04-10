import React, { useContext, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  TravelExplore as TravelExploreIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import { updateUser } from '../../service/users';

const DiscoverabilityPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user, setUser } = useContext(UserContext);
  const [acting, setActing] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const isDiscoverable = Boolean(user?.is_discoverable);

  usePageToolbarHeader('Discoverability', 'Choose how other members can find you');

  const handleToggle = async (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (!token || !user) return;

    setActing(true);
    try {
      const updated = await updateUser(token, { is_discoverable: checked });
      setUser(updated);
      setSnack({
        open: true,
        message: checked ? 'Your profile is now visible in Discover.' : 'Your profile is now hidden from Discover.',
        severity: 'success',
      });
    } catch (error: unknown) {
      setSnack({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to update discoverability.',
        severity: 'error',
      });
    } finally {
      setActing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: 4 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h5" fontWeight={800}>
                  Network visibility
                </Typography>
                <Chip
                  label={isDiscoverable ? 'Visible' : 'Hidden'}
                  color={isDiscoverable ? 'success' : 'default'}
                  size="small"
                />
                {user?.is_superuser && (
                  <Chip
                    icon={<AutoAwesomeIcon fontSize="small" />}
                    label="Superuser default"
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>

              <Typography variant="body1" color="text.secondary" sx={{ mt: 1.25 }}>
                {user?.is_superuser
                  ? 'Superusers start visible so other members can find them quickly, but you can opt out whenever you need privacy.'
                  : 'Regular accounts start hidden until you choose to appear in Discover and public profile surfaces.'}
              </Typography>
            </Box>

            <FormControlLabel
              sx={{ m: 0 }}
              labelPlacement="start"
              label={acting ? 'Saving…' : isDiscoverable ? 'Visible' : 'Hidden'}
              control={(
                <Switch
                  checked={isDiscoverable}
                  onChange={handleToggle}
                  disabled={acting || !token}
                />
              )}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 3, sm: 3.5 }, '&:last-child': { pb: 3.5 } }}>
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              What this changes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isDiscoverable
                ? 'Your Discover card and public network profile are visible to authenticated Baldin members.'
                : 'Your Discover card and public network profile stay hidden until you turn discoverability back on.'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.is_superuser
                ? 'This setting only affects network visibility. Your superuser workflow access stays intact.'
                : 'You can still browse Discover and request connections to superusers even while your own profile stays hidden.'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 3, sm: 3.5 }, '&:last-child': { pb: 3.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TravelExploreIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Need help from a superuser?
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Use the focused superuser Discover view to send individual connection requests.
                This prototype keeps discovery explicit and avoids a bulk-connect action.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={() => navigate('/network/discover?superusers_only=true')}
            >
              Browse Superusers
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
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

export default DiscoverabilityPage;
