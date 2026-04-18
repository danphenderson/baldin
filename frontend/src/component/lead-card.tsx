import React from 'react';
import {
  Typography, Button, Stack, Box, IconButton,
  Tooltip, Divider, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Delete as DeleteIcon, Edit as EditIcon, OpenInNew as OpenIcon,
  Business as CompanyIcon, LocationOn as LocationIcon, Work as WorkIcon,
  TrendingUp as SeniorityIcon, AttachMoney as SalaryIcon,
  AccessTime as TimeIcon,
  School as EducationIcon, Category as FunctionIcon,
  Groups as GroupsIcon, ChatBubbleOutline as CommentIcon,
  ArrowForward as ArrowIcon, Stars as AspirationIcon,
} from '@mui/icons-material';
import type { LeadRead } from '../service/leads';
import type { ApplicationCreationIntent } from '../service/applications';
import { CardShell, StatusChip, getStatusMetaSx, radiusTokens, toRadiusPx } from '../design-system';
import ApplicationIntentButton from './application-intent-button';
import { timeAgo } from '../util/format';
import { brandGradient } from '../design-system';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LeadCardProps {
  lead: LeadRead;
  applying: boolean;
  ranking?: {
    relevanceScore: number;
    message: string;
  } | null;
  applicationHandoff?: {
    state: 'ready' | 'already-applied';
    message: string;
    applicationLabel?: string;
    ctaLabel?: string;
  } | null;
  onOpen: (lead: LeadRead) => void;
  onEdit: (lead: LeadRead) => void;
  onDelete: (lead: LeadRead) => void;
  onApply: (lead: LeadRead, intent: ApplicationCreationIntent) => void;
}

type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function MetaChip({
  icon, label, tone = 'neutral',
}: {
  icon: React.ReactElement;
  label: string | null | undefined;
  tone?: StatusTone;
}) {
  if (!label) return null;
  return (
    <StatusChip
      icon={icon}
      label={label}
      size="small"
      tone={tone}
      emphasis="outline"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const getOtherInterestCount = (lead: LeadRead): number => {
  const interestCount = lead.interest_count ?? 0;
  return Math.max(interestCount - (lead.viewer_is_registered ? 1 : 0), 0);
};

const stopCardClick: React.MouseEventHandler<HTMLElement> = (event) => {
  event.stopPropagation();
};

const LeadCard: React.FC<LeadCardProps> = ({
  lead, applying, ranking, applicationHandoff, onOpen, onEdit, onDelete, onApply,
}) => {
  const theme = useTheme();
  const companyName = lead.companies?.[0]?.name;
  const gradientBg = brandGradient(theme);
  const activityRadius = theme.baldin?.radius.lg ?? radiusTokens.lg;
  const otherInterestCount = getOtherInterestCount(lead);
  const canEdit = Boolean(lead.viewer_permissions?.can_update_shared_fields);
  const canDelete = Boolean(lead.viewer_permissions?.can_delete_shared_lead);
  const isActive = (lead.interest_count ?? 0) > 1 || (lead.comment_count ?? 0) > 0;
  const hasExistingApplication = applicationHandoff?.state === 'already-applied';
  const applyButtonLabel = applicationHandoff?.ctaLabel ?? 'Create Application';
  const applyButtonAriaLabel = hasExistingApplication
    ? `Existing application for ${lead.title || 'this lead'}`
    : `Create application for ${lead.title || 'this lead'}`;

  const cardTone = ranking ? 'warning' : 'primary';

  return (
    <CardShell
      aria-label={`Open lead ${lead.title || 'Untitled Position'}`}
      onClick={() => onOpen(lead)}
      interactive
      tone={cardTone}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {lead.viewer_is_registered && <StatusChip size="small" tone="success" label="Following" />}
              {isActive && <StatusChip size="small" tone="info" label="Active" />}
              {!lead.viewer_is_registered && lead.viewer_permissions?.can_register && (
                <StatusChip
                  size="small"
                  emphasis="outline"
                  tone="primary"
                  label="Joinable"
                />
              )}
            </Stack>
            <Typography
              variant="body1"
              fontWeight={700}
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.35,
              }}
            >
              {lead.title || 'Untitled Position'}
            </Typography>
            {ranking && (
              <Stack
                data-testid="lead-card-ranking-strip"
                direction="row"
                spacing={1}
                alignItems="flex-start"
                sx={{
                  mt: 1,
                  px: 1.25,
                  py: 1,
                  borderRadius: toRadiusPx(theme.baldin?.radius.sm ?? radiusTokens.sm),
                  backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                }}
              >
                <StatusChip
                  size="small"
                  emphasis="solid"
                  tone="warning"
                  icon={<AspirationIcon sx={{ fontSize: 14 }} />}
                  label={`${ranking.relevanceScore}/10`}
                />
                {ranking.message && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.45,
                      fontStyle: 'italic',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      pt: 0.25,
                    }}
                  >
                    {ranking.message}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, ml: 0.5 }} onClick={stopCardClick}>
            {lead.url && (
              <Tooltip title="Open posting">
                <IconButton
                  size="small"
                  component="a"
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open job posting for ${lead.title || 'this lead'}`}
                >
                  <OpenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title="Edit shared fields">
                <IconButton
                  size="small"
                  onClick={() => onEdit(lead)}
                  aria-label={`Edit ${lead.title || 'lead'}`}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete shared lead">
                <IconButton
                  size="small"
                  onClick={() => onDelete(lead)}
                  aria-label={`Delete ${lead.title || 'lead'}`}
                  sx={{ color: alpha(theme.palette.error.main, 0.7), '&:hover': { color: theme.palette.error.main } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>

        {(companyName || lead.location) && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
            {companyName && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CompanyIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {companyName}
                </Typography>
              </Stack>
            )}
            {companyName && lead.location && (
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.4 }}>
                &bull;
              </Typography>
            )}
            {lead.location && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <LocationIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">{lead.location}</Typography>
              </Stack>
            )}
          </Stack>
        )}

        <Stack direction="row" sx={{ mt: 1.25, flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.75 } }}>
          <MetaChip icon={<WorkIcon sx={{ fontSize: 14 }} />} label={lead.employment_type} tone="primary" />
          <MetaChip icon={<SeniorityIcon sx={{ fontSize: 14 }} />} label={lead.seniority_level} tone="info" />
          <MetaChip icon={<FunctionIcon sx={{ fontSize: 14 }} />} label={lead.job_function} tone="neutral" />
          <MetaChip icon={<EducationIcon sx={{ fontSize: 14 }} />} label={lead.education_level} tone="neutral" />
        </Stack>

        {lead.salary && (
          <Typography variant="body2" fontWeight={600} sx={{ mt: 1.25, color: theme.palette.success.main }}>
            <SalaryIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
            {lead.salary}
          </Typography>
        )}

        {lead.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.25,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.65,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {lead.description}
          </Typography>
        )}

        <Box
          data-testid="lead-card-collaboration-strip"
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: toRadiusPx(activityRadius),
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <GroupsIcon sx={{ fontSize: 16, ...getStatusMetaSx(theme, 'primary') }} />
                <Typography variant="body2" fontWeight={700}>{lead.interest_count ?? 0} tracking</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {lead.viewer_is_registered
                  ? otherInterestCount > 0
                    ? `${otherInterestCount} other ${otherInterestCount === 1 ? 'person is' : 'people are'} interested.`
                    : 'You are the first registered viewer.'
                  : (lead.interest_count ?? 0) > 0
                    ? 'There is existing interest on this lead.'
                    : 'No one has registered yet.'}
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CommentIcon sx={{ fontSize: 16, ...getStatusMetaSx(theme, 'secondary') }} />
                <Typography variant="body2" fontWeight={700}>{lead.comment_count ?? 0} comments</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {lead.comment_count ? 'Shared context is already building here.' : 'No conversation yet.'}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ mt: 1.5, mb: 1.25, opacity: 0.5 }} />
        {applicationHandoff && (
          <Box sx={{ mb: 1.25 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
              <StatusChip
                size="small"
                emphasis="outline"
                tone={hasExistingApplication ? 'info' : 'warning'}
                label={hasExistingApplication ? 'Duplicate guard active' : 'Ready to apply'}
              />
              {applicationHandoff.applicationLabel && (
                <StatusChip
                  size="small"
                  tone="success"
                  label={`Existing application: ${applicationHandoff.applicationLabel}`}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {applicationHandoff.message}
            </Typography>
          </Box>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} onClick={stopCardClick}>
            <ApplicationIntentButton
              size="small"
              variant="contained"
              onSelect={(intent) => onApply(lead, intent)}
              loading={applying}
              disabled={hasExistingApplication}
              label={applyButtonLabel}
              loadingLabel="Creating..."
              ariaLabel={applyButtonAriaLabel}
              sx={{ background: gradientBg, px: 2.5, fontSize: '0.8rem' }}
            />
            <Button size="small" endIcon={<ArrowIcon />} onClick={() => onOpen(lead)}>
              View Lead
            </Button>
          </Stack>
          <Tooltip title={new Date(lead.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ cursor: 'default' }}>
              <TimeIcon sx={{ fontSize: 13, ...getStatusMetaSx(theme, 'neutral'), opacity: 0.6 }} />
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                {timeAgo(lead.created_at)}
              </Typography>
            </Stack>
          </Tooltip>
        </Stack>
    </CardShell>
  );
};

export default LeadCard;
