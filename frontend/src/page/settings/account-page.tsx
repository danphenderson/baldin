import React, { useContext, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  DialogContentText,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import {
  SurfaceCard as Card,
  SurfaceCardContent as CardContent,
  StatusChip as Chip,
  SurfaceDialog as Dialog,
  SurfaceDialogActions as DialogActions,
  SurfaceDialogContent as DialogContent,
  SurfaceDialogTitle as DialogTitle,
} from '../../design-system';
import {
  AutoAwesome as AutoAwesomeIcon,
  Cancel as NoIcon,
  Celebration as CelebrationIcon,
  CheckCircle as CheckIcon,
  EmojiEvents as TrophyIcon,
  InfoOutlined as InfoOutlinedIcon,
  SchoolOutlined as AlumniIcon,
  Star as StarIcon,
  TravelExplore as TravelExploreIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import { updateUser, updatePlacement } from '../../service/users';

/* ------------------------------------------------------------------ */
/*  Subscription helpers                                               */
/* ------------------------------------------------------------------ */

type Tier = 'free' | 'starter' | 'pro';

const TIER_ORDER: Tier[] = ['free', 'starter', 'pro'];

const TIER_META: Record<Tier, { label: string; color: 'default' | 'primary' | 'secondary' }> = {
  free: { label: 'Free', color: 'default' },
  starter: { label: 'Starter', color: 'primary' },
  pro: { label: 'Pro', color: 'secondary' },
};

interface FeatureRow {
  feature: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
}

const FEATURES: FeatureRow[] = [
  { feature: 'Discover browsing',            free: true,          starter: true,          pro: true },
  { feature: 'Lead collaboration',           free: true,          starter: true,          pro: true },
  { feature: 'Leads limit',                  free: 'Up to 5',    starter: 'Up to 25',    pro: 'Unlimited' },
  { feature: 'Connect with superusers',      free: true,          starter: true,          pro: true },
  { feature: 'Connect with other members',   free: false,         starter: true,          pro: true },
  { feature: 'Direct messages',              free: false,         starter: true,          pro: true },
  { feature: 'Group messages',               free: false,         starter: false,         pro: true },
  { feature: 'Priority features',            free: false,         starter: false,         pro: true },
];

function formatExpiry(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Placement helpers                                                  */
/* ------------------------------------------------------------------ */

type PlacementStatus = 'active' | 'graduated' | 'alumni';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AccountPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token, user, setUser } = useContext(UserContext);

  usePageToolbarHeader('Settings', 'Account');

  /* ── Subscription state ── */
  const currentTier: Tier = (user?.subscription_tier as Tier) ?? 'free';
  const expiresAt = user?.subscription_expires_at;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const effectiveTier: Tier = currentTier !== 'free' && isExpired ? 'free' : currentTier;
  const [upgradeDialog, setUpgradeDialog] = useState<Tier | null>(null);

  /* ── Discoverability state ── */
  const isDiscoverable = Boolean(user?.is_discoverable);
  const [discoverActing, setDiscoverActing] = useState(false);

  /* ── Placement state ── */
  const placementStatus: PlacementStatus = (user?.placement_status as PlacementStatus) ?? 'active';
  const [placementConfirmOpen, setPlacementConfirmOpen] = useState(false);
  const [placementActing, setPlacementActing] = useState(false);

  /* ── Shared snackbar ── */
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  /* ── Handlers ── */
  const handleDiscoverabilityToggle = async (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (!token || !user) return;
    setDiscoverActing(true);
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
      setDiscoverActing(false);
    }
  };

  const handlePlacementTransition = async (targetStatus: PlacementStatus) => {
    if (!token) return;
    setPlacementActing(true);
    try {
      const updated = await updatePlacement(token, { placement_status: targetStatus });
      setUser(updated);
      setSnack({ open: true, message: `Status updated to ${targetStatus}`, severity: 'success' });
    } catch (e: unknown) {
      setSnack({ open: true, message: e instanceof Error ? e.message : 'Update failed', severity: 'error' });
    }
    setPlacementActing(false);
    setPlacementConfirmOpen(false);
  };

  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value
        ? <CheckIcon fontSize="small" color="success" />
        : <NoIcon fontSize="small" sx={{ color: 'text.disabled' }} />;
    }
    return <Typography variant="body2">{value}</Typography>;
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Section 1: Subscription                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Subscription</Typography>

      <Alert
        severity="info"
        variant="outlined"
        icon={<InfoOutlinedIcon />}
        sx={{ mb: 2 }}
      >
        Developer Preview — All features are unlocked during the preview period. Subscription tiers shown below reflect planned pricing.
      </Alert>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <StarIcon sx={{ color: theme.palette.warning.main, fontSize: 32 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h5" fontWeight={800}>
                  {TIER_META[effectiveTier].label} Plan
                </Typography>
                <Chip
                  label={effectiveTier.toUpperCase()}
                  color={TIER_META[effectiveTier].color}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                {isExpired && currentTier !== 'free' && (
                  <Chip label="Expired" color="error" size="small" variant="outlined" />
                )}
              </Stack>
              {expiresAt && currentTier !== 'free' && !isExpired && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Renews on {formatExpiry(expiresAt)}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <TableContainer component={Card} sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Feature</TableCell>
              {TIER_ORDER.map((t) => (
                <TableCell key={t} align="left" sx={{ fontWeight: 700 }}>
                  <Stack spacing={0.5} alignItems="flex-start">
                    <span>{TIER_META[t].label}</span>
                    {t === effectiveTier && (
                      <Chip label="Current" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    )}
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {FEATURES.map((row) => (
              <TableRow
                key={row.feature}
                sx={{
                  ...(effectiveTier !== 'free' && {
                    [`& td:nth-of-type(${TIER_ORDER.indexOf(effectiveTier) + 2})`]: {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }),
                }}
              >
                <TableCell>{row.feature}</TableCell>
                <TableCell align="left">{renderCell(row.free)}</TableCell>
                <TableCell align="left">{renderCell(row.starter)}</TableCell>
                <TableCell align="left">{renderCell(row.pro)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell />
              {TIER_ORDER.map((t) => {
                const idx = TIER_ORDER.indexOf(t);
                const currentIdx = TIER_ORDER.indexOf(effectiveTier);
                const canUpgrade = idx > currentIdx;
                return (
                  <TableCell key={t} align="left" sx={{ py: 2 }}>
                    {canUpgrade ? (
                      <Button variant="contained" size="small" onClick={() => setUpgradeDialog(t)}>Upgrade</Button>
                    ) : idx === currentIdx ? (
                      <Typography variant="caption" color="text.secondary">Current plan</Typography>
                    ) : null}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Section 2: Network Visibility                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Network Visibility</Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle1" fontWeight={700}>
                  Discover visibility
                </Typography>
                <Chip
                  label={isDiscoverable ? 'Visible' : 'Hidden'}
                  color={isDiscoverable ? 'success' : 'default'}
                  size="small"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {user?.is_superuser
                  ? 'Superusers start visible so other members can find them quickly.'
                  : 'Regular accounts start hidden until you choose to appear in Discover.'}
              </Typography>
            </Box>
            <FormControlLabel
              sx={{ m: 0 }}
              labelPlacement="start"
              label={discoverActing ? 'Saving…' : isDiscoverable ? 'Visible' : 'Hidden'}
              control={
                <Switch
                  checked={isDiscoverable}
                  onChange={handleDiscoverabilityToggle}
                  disabled={discoverActing || !token}
                />
              }
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <TravelExploreIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={700}>Need help from a superuser?</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Browse the focused superuser Discover view to send individual connection requests.
              </Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => navigate('/network/discover?superusers_only=true')}>
              Browse Superusers
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  Section 3: Placement Status                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Placement Status</Typography>

      {placementStatus === 'active' && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, textAlign: 'center' }}>
            <CelebrationIcon sx={{ fontSize: 48, color: theme.palette.warning.main, mb: 1.5 }} />
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
              Got a job? Congratulations!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 480, mx: 'auto' }}>
              Graduating transitions your account. You&apos;ll retain read-only access to your
              connections and messages, but can no longer create new ones.
            </Typography>
            <Button
              variant="contained"
              startIcon={<TrophyIcon />}
              onClick={() => setPlacementConfirmOpen(true)}
              disabled={placementActing}
            >
              I Got a Job!
            </Button>
          </CardContent>
        </Card>
      )}

      {placementStatus === 'graduated' && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, textAlign: 'center' }}>
            <TrophyIcon sx={{ fontSize: 48, color: theme.palette.success.main, mb: 1.5 }} />
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h5" fontWeight={800}>You&apos;re graduated!</Typography>
              <Chip label="Graduated" color="success" size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 480, mx: 'auto' }}>
              Your connections and messages remain available in read-only mode. When you&apos;re
              ready to join the alumni network, transition below.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AlumniIcon />}
              onClick={() => setPlacementConfirmOpen(true)}
              disabled={placementActing}
            >
              Become Alumni
            </Button>
          </CardContent>
        </Card>
      )}

      {placementStatus === 'alumni' && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, textAlign: 'center' }}>
            <AlumniIcon sx={{ fontSize: 48, color: theme.palette.info.main, mb: 1.5 }} />
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h5" fontWeight={800}>Welcome, Alumni!</Typography>
              <Chip label="Alumni" color="info" size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
              You&apos;re part of the Baldin alumni community. Your profile remains visible
              in Discover for other job seekers to find.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* ── Placement confirmation dialog ── */}
      <Dialog open={placementConfirmOpen} onClose={() => setPlacementConfirmOpen(false)} maxWidth="xs" fullWidth>
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
          <Button onClick={() => setPlacementConfirmOpen(false)} disabled={placementActing}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handlePlacementTransition(placementStatus === 'active' ? 'graduated' : 'alumni')}
            disabled={placementActing}
          >
            {placementActing ? 'Updating…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Upgrade placeholder dialog ── */}
      <Dialog open={upgradeDialog !== null} onClose={() => setUpgradeDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Upgrade to {upgradeDialog ? TIER_META[upgradeDialog].label : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Stripe integration coming soon. Subscription upgrades will be available once payment processing is set up.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Shared snackbar ── */}
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

export default AccountPage;
