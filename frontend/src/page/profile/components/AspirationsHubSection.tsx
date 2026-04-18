import React from 'react';
import {
  Box,
  Button,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowOutward as OpenIcon,
  Badge as RolesIcon,
  BusinessOutlined as CompaniesIcon,
  Refresh as RefreshIcon,
  Route as AspirationsIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import type { AspirationItem } from '../../../service/aspirations';
import {
  CardShell,
  EmptyState,
  InlineFeedback,
  SectionCard,
  SectionHeader,
  toRadiusPx,
} from '../../../design-system';

const PREVIEW_LIMIT = 3;

interface AspirationsPreviewCardProps {
  title: string;
  items: AspirationItem[];
  icon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  path: string;
  actionLabel: string;
}

interface AspirationsHubSectionProps {
  loading: boolean;
  error?: string;
  roles: AspirationItem[];
  companies: AspirationItem[];
  onRetry: () => void;
}

const AspirationsPreviewCard: React.FC<AspirationsPreviewCardProps> = ({
  title,
  items,
  icon,
  emptyTitle,
  emptyDescription,
  path,
  actionLabel,
}) => {
  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const overflowCount = items.length - previewItems.length;

  if (items.length === 0) {
    return (
      <CardShell surface="inset" density="compact" aria-label={`${title} aspirations empty state`}>
        <Stack spacing={2} sx={{ height: '100%', justifyContent: 'center' }}>
          <EmptyState
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
            layout="section"
            compact
          />
          <Button
            component={RouterLink}
            to={path}
            variant="outlined"
            sx={{ alignSelf: 'center' }}
          >
            {actionLabel}
          </Button>
        </Stack>
      </CardShell>
    );
  }

  return (
    <CardShell surface="base" density="compact" aria-label={`${title} aspirations preview`}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: toRadiusPx(24),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                color: 'primary.main',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {items.length} saved
              </Typography>
            </Box>
          </Stack>

          <Button
            size="small"
            component={RouterLink}
            to={path}
            endIcon={<OpenIcon sx={{ fontSize: 16 }} />}
          >
            Open
          </Button>
        </Stack>

        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {previewItems.map((item) => (
            <Box key={item.id}>
              <Typography variant="body2" fontWeight={700}>
                {item.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.reason || item.notes || 'Saved aspiration ready for ranking and routing.'}
              </Typography>
            </Box>
          ))}
        </Stack>

        {overflowCount > 0 && (
          <Typography variant="caption" color="text.secondary">
            +{overflowCount} more on the dedicated {title.toLowerCase()} page
          </Typography>
        )}
      </Stack>
    </CardShell>
  );
};

export const AspirationsHubSection: React.FC<AspirationsHubSectionProps> = ({
  loading,
  error,
  roles,
  companies,
  onRetry,
}) => {
  return (
    <SectionCard
      id="section-aspirations"
      header={(
        <SectionHeader
          icon={<AspirationsIcon />}
          title="Aspirations hub"
          count={roles.length + companies.length}
          supportingText="Keep profile direction visible on /me while handing detailed role and company management to the focused deep-link pages."
          divider
          size="compact"
        />
      )}
    >
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 2 }).map((_, index) => (
            <Grid size={{ xs: 12, md: 6 }} key={index}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: toRadiusPx(36) }} />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Stack spacing={2}>
          <InlineFeedback tone="error" density="compact">
            {error}
          </InlineFeedback>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRetry}>
              Retry
            </Button>
            <Button component={RouterLink} to="/me/aspirations/roles">
              Open roles
            </Button>
            <Button component={RouterLink} to="/me/aspirations/companies">
              Open companies
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <AspirationsPreviewCard
              title="Roles"
              items={roles}
              icon={<RolesIcon />}
              emptyTitle="No role aspirations yet"
              emptyDescription="Capture the titles and career arcs you want Baldin to prioritize."
              path="/me/aspirations/roles"
              actionLabel="Open roles"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AspirationsPreviewCard
              title="Companies"
              items={companies}
              icon={<CompaniesIcon />}
              emptyTitle="No company aspirations yet"
              emptyDescription="Save the teams and employers you want ranking and discovery to bias toward."
              path="/me/aspirations/companies"
              actionLabel="Open companies"
            />
          </Grid>
        </Grid>
      )}
    </SectionCard>
  );
};

export default AspirationsHubSection;
