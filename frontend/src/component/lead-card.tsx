import React from 'react';
import {
  Card, CardContent, Typography, Button, Chip, Stack, Box, IconButton,
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
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import type { LeadRead } from '../service/leads';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LeadCardProps {
  lead: LeadRead;
  applying: boolean;
  onOpen: (lead: LeadRead) => void;
  onEdit: (lead: LeadRead) => void;
  onDelete: (lead: LeadRead) => void;
  onApply: (lead: LeadRead) => void;
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function MetaChip({
  icon, label, color,
}: {
  icon: React.ReactElement;
  label: string | null | undefined;
  color?: string;
}) {
  if (!label) return null;
  return (
    <Chip
      icon={icon}
      label={label}
      size="small"
      variant="outlined"
      sx={{
        borderColor: color ? alpha(color, 0.35) : undefined,
        color: color || 'text.secondary',
        '& .MuiChip-icon': { color: color || 'text.secondary' },
      }}
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
  lead, applying, onOpen, onEdit, onDelete, onApply,
}) => {
  const theme = useTheme();
  const companyName = lead.companies?.[0]?.name;
  const gradientBg = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`;
  const otherInterestCount = getOtherInterestCount(lead);
  const canEdit = Boolean(lead.viewer_permissions?.can_update_shared_fields);
  const canDelete = Boolean(lead.viewer_permissions?.can_delete_shared_lead);
  const isActive = (lead.interest_count ?? 0) > 1 || (lead.comment_count ?? 0) > 0;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open lead ${lead.title || 'Untitled Position'}`}
      onClick={() => onOpen(lead)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(lead);
        }
      }}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
        borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          borderLeftColor: theme.palette.primary.main,
          boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
          outlineOffset: 2,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {lead.viewer_is_registered && <Chip size="small" color="success" label="Following" />}
              {isActive && <Chip size="small" color="secondary" label="Active" />}
              {!lead.viewer_is_registered && lead.viewer_permissions?.can_register && <Chip size="small" variant="outlined" label="Joinable" />}
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
          <MetaChip icon={<WorkIcon sx={{ fontSize: 14 }} />} label={lead.employment_type} color={theme.palette.primary.main} />
          <MetaChip icon={<SeniorityIcon sx={{ fontSize: 14 }} />} label={lead.seniority_level} color={theme.palette.secondary.main} />
          <MetaChip icon={<FunctionIcon sx={{ fontSize: 14 }} />} label={lead.job_function} />
          <MetaChip icon={<EducationIcon sx={{ fontSize: 14 }} />} label={lead.education_level} />
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
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <GroupsIcon sx={{ fontSize: 16, color: 'primary.main' }} />
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
                <CommentIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} onClick={stopCardClick}>
            <Button
              size="small"
              variant="contained"
              onClick={() => onApply(lead)}
              disabled={applying}
              sx={{ background: gradientBg, px: 2.5, fontSize: '0.8rem' }}
            >
              {applying ? 'Applying...' : 'Quick Apply'}
            </Button>
            <Button size="small" endIcon={<ArrowIcon />} onClick={() => onOpen(lead)}>
              View Lead
            </Button>
          </Stack>
          <Tooltip title={new Date(lead.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ cursor: 'default' }}>
              <TimeIcon sx={{ fontSize: 13, color: 'text.secondary', opacity: 0.6 }} />
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                {timeAgo(lead.created_at)}
              </Typography>
            </Stack>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LeadCard;
