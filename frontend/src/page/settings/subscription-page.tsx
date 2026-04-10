import React, { useContext, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, useTheme, alpha,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as NoIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';

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

const SubscriptionPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useContext(UserContext);
  const [upgradeDialog, setUpgradeDialog] = useState<Tier | null>(null);

  const currentTier: Tier = (user?.subscription_tier as Tier) ?? 'free';
  const expiresAt = user?.subscription_expires_at;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const effectiveTier: Tier = currentTier !== 'free' && isExpired ? 'free' : currentTier;

  usePageToolbarHeader('Subscription', 'Manage your plan');

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
      {/* Current plan badge */}
      <Card sx={{ mb: 3 }}>
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

      {/* Feature comparison table */}
      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Feature</TableCell>
              {TIER_ORDER.map((t) => (
                <TableCell key={t} align="center" sx={{ fontWeight: 700 }}>
                  <Stack spacing={0.5} alignItems="center">
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
                <TableCell align="center">{renderCell(row.free)}</TableCell>
                <TableCell align="center">{renderCell(row.starter)}</TableCell>
                <TableCell align="center">{renderCell(row.pro)}</TableCell>
              </TableRow>
            ))}
            {/* CTA row */}
            <TableRow>
              <TableCell />
              {TIER_ORDER.map((t) => {
                const idx = TIER_ORDER.indexOf(t);
                const currentIdx = TIER_ORDER.indexOf(effectiveTier);
                const canUpgrade = idx > currentIdx;

                return (
                  <TableCell key={t} align="center" sx={{ py: 2 }}>
                    {canUpgrade ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setUpgradeDialog(t)}
                      >
                        Upgrade
                      </Button>
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

      {/* Upgrade placeholder dialog */}
      <Dialog
        open={upgradeDialog !== null}
        onClose={() => setUpgradeDialog(null)}
        maxWidth="xs"
        fullWidth
      >
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
    </Box>
  );
};

export default SubscriptionPage;
