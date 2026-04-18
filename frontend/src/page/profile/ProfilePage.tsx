import React, { useContext } from 'react';
import Grid from '@mui/material/Grid';
import {
  AutoAwesomeOutlined as SignalsIcon,
  BadgeOutlined as RolesIcon,
  BusinessOutlined as CompaniesIcon,
  FlagOutlined as DirectionIcon,
  LayersOutlined as StoryIcon,
  LocationOnOutlined as LocationIcon,
  NorthEastOutlined as RouteIcon,
  ScheduleOutlined as TimeZoneIcon,
  WorkOutlineOutlined as WorkflowIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import { UserContext } from '../../context/user-context';
import {
  CardShell,
  CardTitle,
  Caption,
  EmptyState,
  LoadingState,
  MetricStrip,
  Mono,
  SectionCard,
  SectionHeader,
  SituationHeader,
  StatusChip,
} from '../../design-system';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import type { UserRead } from '../../service/users';

import { useProfileHubData } from './hooks/useProfileHubData';

const FACT_PILL_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  px: 1.25,
  py: 0.75,
  borderRadius: '999px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
};

function buildHeroInitials(user: UserRead | null): string {
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();
  return initials || user?.email?.[0]?.toUpperCase() || 'ME';
}

function FactPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Box sx={FACT_PILL_SX}>
      {icon}
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function SignalThemeCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <CardShell density="compact" surface="inset">
      <Stack spacing={1}>
        <CardTitle>{title}</CardTitle>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Stack>
    </CardShell>
  );
}

function StoryBlockCard({
  title,
  organization,
  period,
  summary,
}: {
  title: string;
  organization: string;
  period: string;
  summary: string;
}) {
  return (
    <CardShell density="compact" surface="inset">
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={1}
        >
          <Box>
            <CardTitle>{title}</CardTitle>
            <Caption>{organization}</Caption>
          </Box>
          <Mono color="text.secondary">{period}</Mono>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          {summary}
        </Typography>
      </Stack>
    </CardShell>
  );
}

function AspirationPreviewColumn({
  title,
  items,
  emptyTitle,
  emptyDescription,
  buttonLabel,
  onOpen,
}: {
  title: string;
  items: Array<{ label: string; note: string }>;
  emptyTitle: string;
  emptyDescription: string;
  buttonLabel: string;
  onOpen: () => void;
}) {
  return (
    <CardShell density="compact" surface="inset">
      <Stack spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={1}
        >
          <CardTitle>{title}</CardTitle>
          <StatusChip
            label={items.length === 0 ? 'Empty' : `${items.length} saved`}
            tone={items.length === 0 ? 'neutral' : 'primary'}
            emphasis="soft"
            size="small"
          />
        </Stack>

        {items.length === 0 ? (
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={700}>
              {emptyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {emptyDescription}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {items.map((item) => (
              <Box key={item.label}>
                <Typography variant="body2" fontWeight={700}>
                  {item.label}
                </Typography>
                <Caption sx={{ display: 'block', mt: 0.35 }}>{item.note}</Caption>
              </Box>
            ))}
          </Stack>
        )}

        <Button
          variant="outlined"
          size="small"
          endIcon={<RouteIcon />}
          onClick={onOpen}
          sx={{ alignSelf: 'flex-start' }}
        >
          {buttonLabel}
        </Button>
      </Stack>
    </CardShell>
  );
}

function WorkflowRouteCard({
  title,
  description,
  tone,
  buttonLabel,
  onOpen,
}: {
  title: string;
  description: string;
  tone: 'primary' | 'info';
  buttonLabel: string;
  onOpen: () => void;
}) {
  return (
    <CardShell density="compact" surface="inset">
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={1}
        >
          <CardTitle>{title}</CardTitle>
          <StatusChip label="Next route" tone={tone} emphasis="soft" size="small" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {description}
        </Typography>
        <Button
          variant="text"
          size="small"
          endIcon={<RouteIcon />}
          onClick={onOpen}
          sx={{ alignSelf: 'flex-start' }}
        >
          {buttonLabel}
        </Button>
      </Stack>
    </CardShell>
  );
}

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, loading } = useContext(UserContext);
  const hub = useProfileHubData(user);

  usePageToolbarHeader(
    'Profile & Aspirations',
    hub.status === 'populated'
      ? 'Keep direction, proof points, and aspiration handoff aligned before you rank leads.'
      : 'Set the direction Baldin should optimize toward.',
  );

  if (loading) {
    return (
      <Stack spacing={3}>
        <LoadingState kind="section" count={1} itemHeight={240} />
        <LoadingState kind="section" count={1} itemHeight={124} />
        <LoadingState kind="grid" count={4} itemHeight={220} columns={{ xs: 1, md: 2 }} />
      </Stack>
    );
  }

  const metricItems = [
    { label: 'Role tracks', value: hub.metrics.roleCount, icon: <RolesIcon fontSize="small" /> },
    { label: 'Company targets', value: hub.metrics.companyCount, icon: <CompaniesIcon fontSize="small" /> },
    { label: 'Direction themes', value: hub.metrics.signalCount, icon: <SignalsIcon fontSize="small" /> },
    { label: 'Story blocks', value: hub.metrics.storyCount, icon: <StoryIcon fontSize="small" /> },
  ];

  return (
    <Stack spacing={3}>
      <CardShell
        tone={hub.status === 'populated' ? 'primary' : 'neutral'}
        contentSx={{ p: 0 }}
      >
        <SituationHeader
          title={hub.hero.title}
          supportingText={hub.hero.summary}
          lead={(
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: hub.status === 'populated' ? 'primary.dark' : 'action.selected',
                color: hub.status === 'populated' ? 'primary.contrastText' : 'text.primary',
                fontWeight: 700,
              }}
            >
              {buildHeroInitials(user)}
            </Avatar>
          )}
          context={(
            <StatusChip
              label={hub.hero.statusLabel}
              tone={hub.status === 'populated' ? 'primary' : 'warning'}
              emphasis="soft"
              size="small"
            />
          )}
          actions={(
            <>
              <Button
                variant="contained"
                endIcon={<RouteIcon />}
                onClick={() => navigate('/me/aspirations/roles')}
              >
                {hub.status === 'populated' ? 'Review role aspirations' : 'Start role aspirations'}
              </Button>
              <Button
                variant="outlined"
                endIcon={<RouteIcon />}
                onClick={() => navigate('/me/aspirations/companies')}
              >
                {hub.status === 'populated' ? 'Review company aspirations' : 'Start company aspirations'}
              </Button>
            </>
          )}
          footer={(
            <Stack direction="row" gap={1} flexWrap="wrap">
              <FactPill
                icon={<DirectionIcon fontSize="small" color="primary" />}
                label={hub.hero.focusLabel}
              />
              <FactPill
                icon={<LocationIcon fontSize="small" color="primary" />}
                label={hub.hero.locationLabel}
              />
              <FactPill
                icon={<TimeZoneIcon fontSize="small" color="primary" />}
                label={hub.hero.timeZoneLabel}
              />
            </Stack>
          )}
          divider
        />

        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 3 }}>
          <MetricStrip
            items={metricItems}
            variant="inline"
            align="start"
            dividers={false}
          />
        </Box>
      </CardShell>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <SectionCard
              header={(
                <SectionHeader
                  icon={<SignalsIcon />}
                  title="Direction themes"
                  count={hub.metrics.signalCount}
                  supportingText="The strongest signal areas that should shape ranking, messaging, and how the rest of the flagship flow describes you."
                />
              )}
            >
              {hub.signalThemes.length === 0 ? (
                <EmptyState
                  layout="section"
                  compact
                  icon={<SignalsIcon />}
                  title="No direction themes yet"
                  description="Add roles or companies first, then use this hub to keep the narrative aligned before you move into ranking."
                  primaryAction={{
                    label: 'Start role aspirations',
                    onClick: () => navigate('/me/aspirations/roles'),
                  }}
                />
              ) : (
                <Grid container spacing={2}>
                  {hub.signalThemes.map((themeItem) => (
                    <Grid key={themeItem.title} size={{ xs: 12, md: 6 }}>
                      <SignalThemeCard
                        title={themeItem.title}
                        description={themeItem.description}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </SectionCard>

            <SectionCard
              header={(
                <SectionHeader
                  icon={<StoryIcon />}
                  title="Career story blocks"
                  count={hub.metrics.storyCount}
                  supportingText="Portable proof points you can reuse across ranking, tailored applications, and network outreach."
                />
              )}
            >
              {hub.storyBlocks.length === 0 ? (
                <EmptyState
                  layout="section"
                  compact
                  icon={<StoryIcon />}
                  title="No story blocks yet"
                  description="Once your direction is clear, turn the best supporting work into a few reusable narratives for later route handoff."
                  primaryAction={{
                    label: 'Review role aspirations',
                    onClick: () => navigate('/me/aspirations/roles'),
                  }}
                />
              ) : (
                <Stack spacing={2}>
                  {hub.storyBlocks.map((story) => (
                    <StoryBlockCard
                      key={`${story.title}-${story.organization}`}
                      title={story.title}
                      organization={story.organization}
                      period={story.period}
                      summary={story.summary}
                    />
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <SectionCard
              header={(
                <SectionHeader
                  icon={<WorkflowIcon />}
                  title="Aspirations handoff"
                  supportingText={hub.aspirationPreview.guidance}
                />
              )}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <AspirationPreviewColumn
                    title="Roles"
                    items={hub.aspirationPreview.roles}
                    emptyTitle="No role direction yet"
                    emptyDescription="Start with one or two titles that describe the move you want Baldin to optimize toward."
                    buttonLabel={hub.status === 'populated' ? 'Open role aspirations' : 'Start role aspirations'}
                    onOpen={() => navigate('/me/aspirations/roles')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <AspirationPreviewColumn
                    title="Companies"
                    items={hub.aspirationPreview.companies}
                    emptyTitle="No company list yet"
                    emptyDescription="Add target employers so ranking and apply handoff can stay grounded in the search you actually want."
                    buttonLabel={hub.status === 'populated' ? 'Open company aspirations' : 'Start company aspirations'}
                    onOpen={() => navigate('/me/aspirations/companies')}
                  />
                </Grid>
              </Grid>
            </SectionCard>

            <CardShell>
              <SectionHeader
                icon={<RouteIcon />}
                title="What this drives next"
                supportingText="This hub is the upstream control surface. Save direction here, then move straight into the operational routes that consume it."
              />

              <Stack spacing={2}>
                <WorkflowRouteCard
                  title="Leads ranking"
                  description="Use saved aspirations to prioritize the most aligned roles and companies before you spend effort on detailed review."
                  tone="primary"
                  buttonLabel="Open leads"
                  onOpen={() => navigate('/leads')}
                />
                <WorkflowRouteCard
                  title="Application handoff"
                  description="Keep your story blocks and target list coherent so application starts inherit the same direction-setting context."
                  tone="info"
                  buttonLabel="Open applications"
                  onOpen={() => navigate('/applications')}
                />
              </Stack>

              <Divider sx={{ my: 2.5, borderColor: theme.palette.divider }} />

              <Caption>
                The redesigned hub stays frontend-local for now, so the page structure can settle before a summary API contract is wired in.
              </Caption>
            </CardShell>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default ProfilePage;
