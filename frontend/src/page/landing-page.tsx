import React, { useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  alpha,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ArrowOutward as ArrowOutwardIcon,
  AutoAwesome as AutoAwesomeIcon,
  DataObjectOutlined as DataObjectOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  HubOutlined as HubOutlinedIcon,
  InsightsRounded as InsightsRoundedIcon,
  MenuRounded as MenuRoundedIcon,
  ShieldMoonOutlined as ShieldMoonOutlinedIcon,
  SmartToyOutlined as SmartToyOutlinedIcon,
  TimelineRounded as TimelineRoundedIcon,
  TrackChangesRounded as TrackChangesRoundedIcon,
  TravelExploreRounded as TravelExploreRoundedIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  CardShell,
  StatusChip,
  brandGradient,
  brandHoverGradient,
  monoFontFamily,
  softBrandGradient,
  type CardShellTone,
} from '../design-system';

type IconComponent = React.ElementType;

const heroSignals: Array<{ label: string; description: string }> = [
  { label: 'Local-first workspace', description: 'Keep the search loop in your own system of record.' },
  { label: 'Structured lead capture', description: 'Turn listings and notes into reusable pipeline data.' },
  { label: 'Aspiration-aware ranking', description: 'Prioritize roles against the work you actually want.' },
  { label: 'Application visibility', description: 'See what is live, blocked, and overdue at a glance.' },
  { label: 'Workflow orchestration', description: 'Use agents and extractors where the loop needs leverage.' },
];

const featureCards: Array<{
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  tone: CardShellTone;
  icon: IconComponent;
}> = [
  {
    eyebrow: 'Discover',
    title: 'Source roles without losing context.',
    description: 'Capture leads, companies, and people into one queue instead of scattering search state across tabs.',
    detail: 'Built for a data-heavy top-of-funnel, not a generic list of bookmarks.',
    tone: 'primary',
    icon: TravelExploreRoundedIcon,
  },
  {
    eyebrow: 'Extract',
    title: 'Normalize messy job inputs into structured fields.',
    description: 'Run extractor workflows to pull useful metadata out of listings, resumes, and supporting documents.',
    detail: 'The same control plane can support parsing, review, and admin-style utility flows.',
    tone: 'info',
    icon: DataObjectOutlinedIcon,
  },
  {
    eyebrow: 'Rank',
    title: 'Prioritize roles against your aspirations.',
    description: 'Bring ranking context closer to the lead so fit, alignment text, and next action stay legible together.',
    detail: 'Designed for deliberate targeting, not black-box lead spam.',
    tone: 'warning',
    icon: TrackChangesRoundedIcon,
  },
  {
    eyebrow: 'Apply',
    title: 'Move from lead to active application with less drift.',
    description: 'Track queue, board, and detail states in a single surface so the application pipeline stays current.',
    detail: 'Useful when real follow-up depends on reliable state transitions.',
    tone: 'success',
    icon: InsightsRoundedIcon,
  },
  {
    eyebrow: 'Workspace',
    title: 'Keep documents and comparisons close to the work.',
    description: 'Draft, edit, compare, and store resumes or cover letters without leaving the operating surface.',
    detail: 'The workspace stays part of the job-search loop instead of a detached file bucket.',
    tone: 'neutral',
    icon: DescriptionOutlinedIcon,
  },
  {
    eyebrow: 'Agents',
    title: 'Add automation where the loop actually stalls.',
    description: 'Use agent sessions and workflow tooling for operational leverage, not vague AI theater.',
    detail: 'Grounded in orchestration visibility, admin controls, and route-level accountability.',
    tone: 'primary',
    icon: SmartToyOutlinedIcon,
  },
];

const pipelineStages: Array<{
  title: string;
  detail: string;
  metric: string;
  tone: CardShellTone;
}> = [
  { title: 'Discover', detail: 'Capture companies, people, and listings into a single working queue.', metric: 'Queue live', tone: 'primary' },
  { title: 'Extract', detail: 'Run extractor workflows that convert raw inputs into usable structure.', metric: 'Schema ready', tone: 'info' },
  { title: 'Rank', detail: 'Score against aspirations so prioritization has visible reasoning.', metric: 'Context first', tone: 'warning' },
  { title: 'Apply', detail: 'Push the right lead into the application pipeline with supporting documents in place.', metric: 'Pipeline clear', tone: 'success' },
  { title: 'Track', detail: 'Keep conversations, deadlines, and follow-up state in the same system.', metric: 'Next action visible', tone: 'neutral' },
];

const privacyPillars: Array<{
  title: string;
  description: string;
  icon: IconComponent;
}> = [
  {
    title: 'Your search stays in your workspace.',
    description: 'Local-first foundations keep documents, lead notes, and pipeline movement close to the operator.',
    icon: ShieldMoonOutlinedIcon,
  },
  {
    title: 'No recruiter-marketplace abstraction layer.',
    description: 'Baldin is built around your workflow state, not a shared public graph you have to maintain.',
    icon: HubOutlinedIcon,
  },
  {
    title: 'Automation remains inspectable.',
    description: 'Extractors, agents, and admin-style workflows are useful because their state is visible and reviewable.',
    icon: TimelineRoundedIcon,
  },
];

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null);

  const mobileMenuOpen = Boolean(menuAnchorEl);
  const productAppPath = token ? '/dashboard' : '/login';
  const productAppLabel = token ? 'Open product app' : 'Sign in to product app';
  const canvas = theme.baldin.surface.canvas;
  const heroBackground = [
    `radial-gradient(circle at 10% 10%, ${alpha(theme.palette.primary.main, 0.24)} 0%, transparent 34%)`,
    `radial-gradient(circle at 88% 16%, ${alpha(theme.palette.secondary.main, 0.22)} 0%, transparent 32%)`,
    `radial-gradient(circle at 52% 100%, ${alpha(theme.palette.info.main, 0.12)} 0%, transparent 26%)`,
    canvas,
  ].join(', ');
  const horizontalBrandButtonSx = {
    background: brandGradient(theme, 90),
    '&:hover': {
      background: brandHoverGradient(theme, 90),
    },
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setMenuAnchorEl(event.currentTarget);
  const handleMenuClose = () => setMenuAnchorEl(null);

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        color: 'text.primary',
        backgroundColor: 'background.default',
        backgroundImage: heroBackground,
        overflowX: 'hidden',
      }}
    >
      <Box
        component="section"
        sx={{
          position: 'relative',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 2, md: 3 }, pb: { xs: 8, md: 12 } }}>
          <Stack
            component="nav"
            aria-label="Marketing navigation"
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{
              border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              borderRadius: 999,
              px: { xs: 2, md: 2.5 },
              py: 1,
              backgroundColor: alpha(theme.baldin.surface.base, 0.78),
              backdropFilter: 'blur(18px)',
              boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.16)}`,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                aria-hidden="true"
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: '14px',
                  background: brandGradient(theme, 135),
                  boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.32)}`,
                }}
              >
                <AutoAwesomeIcon sx={{ color: theme.palette.common.white, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Baldin
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontFamily: monoFontFamily,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}
                >
                  Career control plane
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Button color="inherit" href="#features">
                Features
              </Button>
              <Button color="inherit" href="#pipeline">
                Pipeline
              </Button>
              <Button color="inherit" href="#privacy">
                Privacy
              </Button>
              <Button color="inherit" component={RouterLink} to="/login">
                Sign in
              </Button>
            </Stack>

            <IconButton
              aria-label="Open navigation menu"
              onClick={handleMenuOpen}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary' }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)' },
              gap: { xs: 6, lg: 8 },
              alignItems: 'center',
              pt: { xs: 7, md: 10 },
            }}
          >
            <Stack spacing={{ xs: 3.5, md: 4.5 }}>
              <Typography
                variant="overline"
                sx={{
                  color: theme.palette.secondary.light,
                  fontFamily: monoFontFamily,
                  letterSpacing: '0.24em',
                }}
              >
                LOCAL-FIRST / PRIVATE / OPERATOR-CONTROLLED
              </Typography>

              <Stack spacing={2.5}>
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: theme.baldin.fontFamily.display,
                    fontWeight: 700,
                    fontSize: { xs: '3.3rem', sm: '4.4rem', md: '5.6rem' },
                    lineHeight: { xs: 0.98, md: 0.94 },
                    letterSpacing: { xs: '-0.05em', md: '-0.06em' },
                    maxWidth: 760,
                    textWrap: 'balance',
                  }}
                >
                  Run your job search like a system.
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    maxWidth: 650,
                    color: 'text.secondary',
                    fontFamily: theme.baldin.fontFamily.body,
                    fontWeight: 400,
                    lineHeight: 1.45,
                  }}
                >
                  Baldin keeps discovery, extraction, ranking, applications, documents, and follow-up in one control plane you actually own.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="brand"
                  size="large"
                  endIcon={<ArrowOutwardIcon />}
                  sx={{
                    ...horizontalBrandButtonSx,
                    minHeight: 52,
                    px: 3,
                  }}
                >
                  Start the control plane
                </Button>
                <Button component={RouterLink} to={productAppPath} variant="outlined" size="large" sx={{ minHeight: 52, px: 3 }}>
                  {productAppLabel}
                </Button>
              </Stack>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 560 }}>
                Purpose-built for real job-search operations: structured leads, aspiration-aware ranking, workflow visibility, and a calmer application pipeline.
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(5, minmax(0, 1fr))',
                  },
                  gap: 1.5,
                }}
              >
                {heroSignals.map((signal) => (
                  <Box
                    key={signal.label}
                    sx={{
                      minHeight: 104,
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                      backgroundColor: alpha(theme.baldin.surface.raised, 0.68),
                      px: 2,
                      py: 1.75,
                      backdropFilter: 'blur(14px)',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: theme.palette.primary.light, mb: 0.75 }}>
                      {signal.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {signal.description}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>

            <Box sx={{ position: 'relative', minHeight: { xs: 460, md: 560 } }}>
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  inset: { xs: '8% 4% auto', md: '8% 10% auto' },
                  height: { xs: 300, md: 360 },
                  borderRadius: '50%',
                  background: softBrandGradient(theme, {
                    angle: 125,
                    startOpacity: 0.38,
                    endOpacity: 0.14,
                    startTone: 'main',
                    endTone: 'light',
                  }),
                  filter: 'blur(84px)',
                }}
              />

              <CardShell
                tone="primary"
                sx={{
                  position: 'relative',
                  height: '100%',
                  background: `linear-gradient(180deg, ${alpha(theme.baldin.surface.overlay, 0.96)} 0%, ${alpha(theme.baldin.surface.base, 0.98)} 100%)`,
                  boxShadow: `0 28px 80px ${alpha(theme.palette.common.black, 0.28)}`,
                }}
              >
                <Stack spacing={3}>
                  <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{
                          fontFamily: monoFontFamily,
                          color: theme.palette.secondary.light,
                          letterSpacing: '0.18em',
                        }}
                      >
                        LIVE WORKSPACE
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 0.5, maxWidth: 320 }}>
                        One surface for the whole search loop.
                      </Typography>
                    </Box>
                    <StatusChip label="Local-first" tone="success" emphasis="soft" />
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                      gap: 1.5,
                    }}
                  >
                    {[
                      ['Queued leads', '126'],
                      ['Ranked roles', '18'],
                      ['Live workflows', '4'],
                      ['Next follow-ups', '7'],
                    ].map(([label, value]) => (
                      <Box
                        key={label}
                        sx={{
                          borderRadius: 2.5,
                          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                          backgroundColor: alpha(theme.baldin.surface.raised, 0.72),
                          px: 1.5,
                          py: 1.25,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                          {label}
                        </Typography>
                        <Typography variant="h5">{value}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider />

                  <Stack spacing={1.25}>
                    {pipelineStages.map((stage) => (
                      <Box
                        key={stage.title}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto',
                          gap: 1.5,
                          alignItems: 'center',
                          px: 1.5,
                          py: 1.4,
                          borderRadius: 2.5,
                          border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                          backgroundColor: alpha(theme.baldin.surface.inset, 0.86),
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.25 }}>
                            {stage.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {stage.detail}
                          </Typography>
                        </Box>
                        <StatusChip label={stage.metric} tone={stage.tone} emphasis="outline" />
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardShell>

              <CardShell
                tone="warning"
                sx={{
                  position: 'absolute',
                  right: { xs: 12, md: -20 },
                  bottom: { xs: 14, md: 26 },
                  width: { xs: '78%', sm: 296 },
                  backgroundColor: alpha(theme.baldin.surface.overlay, 0.96),
                  boxShadow: `0 20px 70px ${alpha(theme.palette.common.black, 0.24)}`,
                }}
              >
                <Stack spacing={1.5}>
                  <StatusChip label="Agent suggestion" tone="warning" emphasis="soft" />
                  <Typography variant="h6">Draft a follow-up when the application moves stages.</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    The useful part is the workflow state around the draft, not just the generated text.
                  </Typography>
                </Stack>
              </CardShell>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Stack spacing={{ xs: 9, md: 12 }}>
          <Box component="section" id="features">
            <Stack spacing={1.5} sx={{ mb: 3.5 }}>
              <Typography
                variant="overline"
                sx={{
                  color: theme.palette.secondary.light,
                  fontFamily: monoFontFamily,
                  letterSpacing: '0.18em',
                }}
              >
                SYSTEM MODULES
              </Typography>
              <Typography variant="h2" sx={{ maxWidth: 760 }}>
                Everything the search loop usually scatters across tabs.
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 760, color: 'text.secondary' }}>
                The landing page stays grounded in Baldin’s actual product surfaces: lead intake, extraction workflows, ranking, applications, documents, messages, and operational visibility.
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              {featureCards.map((card) => {
                const Icon = card.icon;

                return (
                  <CardShell
                    key={card.title}
                    tone={card.tone}
                    sx={{
                      backgroundImage: softBrandGradient(theme, {
                        angle: 140,
                        startOpacity: 0.12,
                        endOpacity: 0.04,
                        startTone: 'main',
                        endTone: 'dark',
                        reverse: card.tone === 'neutral',
                      }),
                    }}
                  >
                    <Stack spacing={2.5} sx={{ height: '100%' }}>
                      <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                        <Box
                          sx={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: 2.5,
                            backgroundColor: alpha(theme.palette.common.white, 0.06),
                            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                          }}
                        >
                          <Icon sx={{ color: 'text.primary' }} />
                        </Box>
                        <StatusChip label={card.eyebrow} tone={card.tone} emphasis="outline" />
                      </Stack>

                      <Box>
                        <Typography
                          variant="overline"
                          sx={{
                            color: 'text.secondary',
                            fontFamily: monoFontFamily,
                            letterSpacing: '0.18em',
                          }}
                        >
                          {card.eyebrow}
                        </Typography>
                        <Typography variant="h5" sx={{ mt: 0.5, mb: 1.25 }}>
                          {card.title}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1.25 }}>
                          {card.description}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ mt: 'auto', color: alpha(theme.palette.text.primary, 0.86) }}>
                        {card.detail}
                      </Typography>
                    </Stack>
                  </CardShell>
                );
              })}
            </Box>
          </Box>

          <Box component="section" id="pipeline">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 320px) minmax(0, 1fr)' },
                gap: 2.5,
                alignItems: 'start',
              }}
            >
              <CardShell tone="info">
                <Stack spacing={2}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: theme.palette.info.light,
                      fontFamily: monoFontFamily,
                      letterSpacing: '0.18em',
                    }}
                  >
                    PIPELINE MOTIF
                  </Typography>
                  <Typography variant="h3">Discover → Extract → Rank → Apply → Track</Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    The point is not another generic dashboard. It is a visible operating loop where each stage hands real context to the next one.
                  </Typography>
                </Stack>
              </CardShell>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr))' },
                  gap: 1.5,
                }}
              >
                {pipelineStages.map((stage, index) => (
                  <Box
                    key={stage.title}
                    sx={{
                      position: 'relative',
                      ...(index < pipelineStages.length - 1 && {
                        '&::after': {
                          content: '""',
                          display: { xs: 'none', md: 'block' },
                          position: 'absolute',
                          top: '50%',
                          right: -12,
                          width: 24,
                          borderTop: `1px solid ${alpha(theme.palette.secondary.main, 0.38)}`,
                        },
                      }),
                    }}
                  >
                    <CardShell tone={stage.tone} surface="base" sx={{ height: '100%' }}>
                      <Stack spacing={1.5} sx={{ height: '100%' }}>
                        <StatusChip label={stage.metric} tone={stage.tone} emphasis="soft" />
                        <Typography variant="h6">{stage.title}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 'auto' }}>
                          {stage.detail}
                        </Typography>
                      </Stack>
                    </CardShell>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <Box component="section" id="privacy">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 320px' },
                gap: 2.5,
              }}
            >
              <CardShell tone="success">
                <Stack spacing={2.5}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: theme.palette.success.light,
                      fontFamily: monoFontFamily,
                      letterSpacing: '0.18em',
                    }}
                  >
                    LOCAL-FIRST PRIVACY
                  </Typography>
                  <Typography variant="h2" sx={{ maxWidth: 760 }}>
                    Private by default, useful by design.
                  </Typography>
                  <Typography variant="body1" sx={{ maxWidth: 720, color: 'text.secondary' }}>
                    Baldin is positioned as a career control plane, not a public network. That changes how the product treats your documents, rankings, workflows, and administrative state.
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                      gap: 1.5,
                    }}
                  >
                    {privacyPillars.map((pillar) => {
                      const Icon = pillar.icon;

                      return (
                        <Box
                          key={pillar.title}
                          sx={{
                            borderRadius: 2.5,
                            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                            backgroundColor: alpha(theme.baldin.surface.raised, 0.66),
                            px: 2,
                            py: 2,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'grid',
                              placeItems: 'center',
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              backgroundColor: alpha(theme.palette.success.main, 0.12),
                              color: theme.palette.success.light,
                              mb: 1.25,
                            }}
                          >
                            <Icon fontSize="small" />
                          </Box>
                          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                            {pillar.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {pillar.description}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Stack>
              </CardShell>

              <Stack spacing={2}>
                <CardShell tone="neutral" surface="base">
                  <Stack spacing={1.5}>
                    <Typography
                      variant="overline"
                      sx={{
                        color: 'text.secondary',
                        fontFamily: monoFontFamily,
                        letterSpacing: '0.18em',
                      }}
                    >
                      TRUST POSTURE
                    </Typography>
                    <Typography variant="h4">0 shared recruiter graph</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Your search narrative is not forced into a marketplace model to make the product useful.
                    </Typography>
                  </Stack>
                </CardShell>

                <CardShell tone="primary">
                  <Stack spacing={1.5}>
                    <Typography
                      variant="overline"
                      sx={{
                        color: theme.palette.primary.light,
                        fontFamily: monoFontFamily,
                        letterSpacing: '0.18em',
                      }}
                    >
                      OPERATIONS VIEW
                    </Typography>
                    <Typography variant="h4">1 control plane</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Leads, documents, applications, and workflow state stay close enough to support reliable action.
                    </Typography>
                  </Stack>
                </CardShell>
              </Stack>
            </Box>
          </Box>

          <CardShell
            component="section"
            tone="primary"
            sx={{
              position: 'relative',
              overflow: 'hidden',
              background: [
                `radial-gradient(circle at 12% 18%, ${alpha(theme.palette.primary.light, 0.24)} 0%, transparent 32%)`,
                `radial-gradient(circle at 88% 24%, ${alpha(theme.palette.secondary.light, 0.24)} 0%, transparent 32%)`,
                `linear-gradient(135deg, ${alpha(theme.baldin.surface.overlay, 0.98)} 0%, ${alpha(theme.baldin.surface.base, 0.98)} 100%)`,
              ].join(', '),
            }}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              justifyContent="space-between"
              spacing={3}
              alignItems={{ xs: 'flex-start', lg: 'center' }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    color: theme.palette.secondary.light,
                    fontFamily: monoFontFamily,
                    letterSpacing: '0.2em',
                  }}
                >
                  READY TO RUN THE LOOP
                </Typography>
                <Typography variant="h2" sx={{ mt: 1, mb: 1.25, maxWidth: 720 }}>
                  Build a calmer, more legible search system.
                </Typography>
                <Typography variant="body1" sx={{ maxWidth: 680, color: 'text.secondary' }}>
                  Move from scattered tabs to one operating surface for discovery, extraction, ranking, applications, documents, and follow-up.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="brand"
                  size="large"
                  endIcon={<ArrowOutwardIcon />}
                  sx={{
                    ...horizontalBrandButtonSx,
                    minHeight: 52,
                    minWidth: { sm: 220 },
                  }}
                >
                  Create account
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  size="large"
                  sx={{
                    minHeight: 52,
                    minWidth: { sm: 180 },
                    borderColor: alpha(theme.palette.common.white, 0.18),
                    color: theme.palette.common.white,
                    '&:hover': {
                      borderColor: alpha(theme.palette.common.white, 0.3),
                      backgroundColor: alpha(theme.palette.common.white, 0.05),
                    },
                  }}
                >
                  Sign in
                </Button>
              </Stack>
            </Stack>
          </CardShell>
        </Stack>
      </Container>

      <Box
        component="footer"
        sx={{
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          py: 3,
          backgroundColor: alpha(theme.baldin.surface.canvas, 0.88),
          backdropFilter: 'blur(18px)',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Baldin
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Career control plane for deliberate job-search operations.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Link href="#features" underline="none" color="inherit" sx={{ fontWeight: 600 }}>
                Features
              </Link>
              <Link href="#pipeline" underline="none" color="inherit" sx={{ fontWeight: 600 }}>
                Pipeline
              </Link>
              <Link href="#privacy" underline="none" color="inherit" sx={{ fontWeight: 600 }}>
                Privacy
              </Link>
              <Link component={RouterLink} to="/user-terms" underline="none" color="inherit" sx={{ fontWeight: 600 }}>
                Privacy and terms
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Menu anchorEl={menuAnchorEl} open={mobileMenuOpen} onClose={handleMenuClose}>
        <MenuItem component="a" href="#features" onClick={handleMenuClose}>
          Features
        </MenuItem>
        <MenuItem component="a" href="#pipeline" onClick={handleMenuClose}>
          Pipeline
        </MenuItem>
        <MenuItem component="a" href="#privacy" onClick={handleMenuClose}>
          Privacy
        </MenuItem>
        <MenuItem component={RouterLink} to="/login" onClick={handleMenuClose}>
          Sign in
        </MenuItem>
        <MenuItem component={RouterLink} to="/register" onClick={handleMenuClose}>
          Create account
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LandingPage;
