import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { UserContext } from '../context/user-context';

type Tier = 'free' | 'starter' | 'pro';

const TIER_RANK: Record<Tier, number> = { free: 0, starter: 1, pro: 2 };

function effectiveTier(
  tier: Tier | undefined,
  expiresAt: string | null | undefined,
): Tier {
  const t = tier ?? 'free';
  if (t === 'free') return 'free';
  if (expiresAt && new Date(expiresAt) < new Date()) return 'free';
  return t;
}

interface TierGateProps {
  requiredTier: Tier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback: React.FC<{ requiredTier: Tier }> = ({ requiredTier }) => {
  const navigate = useNavigate();

  return (
    <Card variant="outlined" sx={{ maxWidth: 420, mx: 'auto', my: 3 }}>
      <CardContent>
        <Stack spacing={2} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
          <LockIcon color="action" sx={{ fontSize: 40 }} />
          <Typography variant="subtitle1" fontWeight={700}>
            Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature requires the {requiredTier} plan or above.
          </Typography>
          <Button variant="contained" size="small" onClick={() => navigate('/settings/subscription')}>
            View plans
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

const TierGate: React.FC<TierGateProps> = ({ requiredTier, children, fallback }) => {
  const { user } = useContext(UserContext);
  const current = effectiveTier(
    user?.subscription_tier as Tier | undefined,
    user?.subscription_expires_at,
  );

  if (TIER_RANK[current] >= TIER_RANK[requiredTier]) {
    return <>{children}</>;
  }

  return <>{fallback ?? <DefaultFallback requiredTier={requiredTier} />}</>;
};

export default TierGate;
