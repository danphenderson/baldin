import React from 'react';
import {
  Card, CardContent, Typography, Button, Chip, Stack, Box, IconButton,
  Tooltip, Collapse, Divider, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Delete as DeleteIcon, Edit as EditIcon, OpenInNew as OpenIcon,
  Business as CompanyIcon, LocationOn as LocationIcon, Work as WorkIcon,
  ExpandMore, ExpandLess,
  TrendingUp as SeniorityIcon, AttachMoney as SalaryIcon,
  AccessTime as TimeIcon, Person as ManagerIcon,
  School as EducationIcon, Category as FunctionIcon,
  Notes as NotesIcon,
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
  expanded: boolean;
  applying: boolean;
  onToggleExpand: (id: string) => void;
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

const LeadCard: React.FC<LeadCardProps> = ({
  lead, expanded, applying, onToggleExpand, onEdit, onDelete, onApply,
}) => {
  const theme = useTheme();
  const companyName = lead.companies?.[0]?.name;
  const gradientBg = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
        '&:hover': {
          borderLeftColor: theme.palette.primary.main,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Title + actions row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography
            variant="body1"
            fontWeight={700}
            sx={{
              flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
            }}
          >
            {lead.title || 'Untitled Position'}
          </Typography>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, ml: 0.5 }}>
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
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit(lead)}
                aria-label={`Edit ${lead.title || 'lead'}`}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => onDelete(lead)}
                aria-label={`Delete ${lead.title || 'lead'}`}
                sx={{ color: alpha(theme.palette.error.main, 0.7), '&:hover': { color: theme.palette.error.main } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Company + location line */}
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

        {/* Metadata chips */}
        <Stack direction="row" sx={{ mt: 1.25, flexWrap: 'wrap', gap: { xs: 0.5, sm: 0.75 } }}>
          <MetaChip icon={<WorkIcon sx={{ fontSize: 14 }} />} label={lead.employment_type} color={theme.palette.primary.main} />
          <MetaChip icon={<SeniorityIcon sx={{ fontSize: 14 }} />} label={lead.seniority_level} color={theme.palette.secondary.main} />
          <MetaChip icon={<FunctionIcon sx={{ fontSize: 14 }} />} label={lead.job_function} />
          <MetaChip icon={<EducationIcon sx={{ fontSize: 14 }} />} label={lead.education_level} />
        </Stack>

        {/* Salary */}
        {lead.salary && (
          <Typography variant="body2" fontWeight={600} sx={{ mt: 1.25, color: theme.palette.success.main }}>
            <SalaryIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
            {lead.salary}
          </Typography>
        )}

        {/* Hiring manager */}
        {lead.hiring_manager && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.75 }}>
            <ManagerIcon sx={{ fontSize: 14, mr: 0.5 }} />
            {lead.hiring_manager}
          </Typography>
        )}

        {/* Expandable description + notes */}
        {(lead.description || lead.notes) && (
          <Box sx={{ mt: 1 }}>
            <Collapse in={expanded} collapsedSize={0}>
              {lead.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1, whiteSpace: 'pre-wrap', lineHeight: 1.65,
                    maxHeight: 200, overflowY: 'auto',
                  }}
                >
                  {lead.description}
                </Typography>
              )}
              {lead.notes && (
                <>
                  <Divider sx={{ my: 1.25 }} />
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <NotesIcon sx={{ fontSize: 14, color: theme.palette.warning.main }} />
                    <Typography variant="caption" fontWeight={600}>Notes</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {lead.notes}
                  </Typography>
                </>
              )}
            </Collapse>
            <Button
              size="small"
              onClick={() => onToggleExpand(lead.id)}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ mt: 0.5, textTransform: 'none', color: 'text.secondary', fontWeight: 500 }}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? 'Less' : 'Details'}
            </Button>
          </Box>
        )}

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Footer: Quick Apply + timestamp */}
        <Divider sx={{ mt: 1.5, mb: 1.25, opacity: 0.5 }} />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Button
            size="small"
            variant="contained"
            onClick={() => onApply(lead)}
            disabled={applying}
            sx={{ background: gradientBg, px: 2.5, fontSize: '0.8rem' }}
          >
            {applying ? 'Applying...' : 'Quick Apply'}
          </Button>
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
