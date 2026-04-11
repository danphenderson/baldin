import React from 'react';
import {
  Card, CardContent, Typography, Chip, Stack, Box, IconButton,
  Tooltip, Switch, useTheme,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { AgentSummaryRead, AgentKind } from '../service/agents';
import { CardTitle, Caption } from './common/text';
import { ALPHA_CHIP, ALPHA_HOVER } from '../theme/effects';
import { timeAgo } from '../util/format';

/* ------------------------------------------------------------------ */
/*  Kind display helpers                                               */
/* ------------------------------------------------------------------ */

const KIND_LABELS: Record<AgentKind, string> = {
  cover_letter: 'Cover Letter Workspace',
  follow_up: 'Follow-Up Planner',
  outreach: 'Outreach Tracker',
  custom: 'Custom',
};

function kindColor(kind: AgentKind, theme: Theme): string {
  switch (kind) {
    case 'cover_letter': return theme.palette.primary.main;
    case 'follow_up': return theme.palette.secondary.main;
    case 'outreach': return theme.palette.info.main;
    default: return theme.palette.text.secondary;
  }
}

export function getKindLabel(kind: AgentKind): string {
  return KIND_LABELS[kind] ?? kind;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AgentCardProps {
  agent: AgentSummaryRead;
  onEdit: (agent: AgentSummaryRead) => void;
  onDelete: (agent: AgentSummaryRead) => void;
  onToggleEnabled: (agent: AgentSummaryRead) => void;
  onClick: (agent: AgentSummaryRead) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const stop: React.MouseEventHandler<HTMLElement> = (e) => e.stopPropagation();

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AgentCard: React.FC<AgentCardProps> = ({
  agent, onEdit, onDelete, onToggleEnabled, onClick,
}) => {
  const theme = useTheme();
  const kColor = kindColor(agent.kind, theme);

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open agent ${agent.name}`}
      onClick={() => onClick(agent)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(agent);
        }
      }}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
        borderLeft: `3px solid ${alpha(kColor, 0.5)}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          borderLeftColor: kColor,
          boxShadow: `0 10px 24px ${alpha(kColor, 0.12)}`,
          bgcolor: alpha(theme.palette.action.hover, ALPHA_HOVER),
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
          outlineOffset: 2,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header: name + enabled switch */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <CardTitle sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agent.name}
          </CardTitle>
          <Box onClick={stop} sx={{ flexShrink: 0 }}>
            <Tooltip title={agent.is_enabled ? 'Disable agent' : 'Enable agent'}>
              <Switch
                size="small"
                checked={agent.is_enabled}
                onChange={() => onToggleEnabled(agent)}
                slotProps={{ input: { 'aria-label': `Toggle ${agent.name} enabled` } }}
              />
            </Tooltip>
          </Box>
        </Box>

        {/* Kind badge */}
        <Chip
          label={KIND_LABELS[agent.kind] ?? agent.kind}
          size="small"
          sx={{
            mt: 1,
            alignSelf: 'flex-start',
            bgcolor: alpha(kColor, ALPHA_CHIP),
            color: kColor,
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1.25,
            flexGrow: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.55,
            ...(agent.description ? {} : { fontStyle: 'italic', opacity: 0.5 }),
          }}
        >
          {agent.description || 'No description'}
        </Typography>

        {/* Footer: timestamp + actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
          <Tooltip title={new Date(agent.updated_at).toLocaleString()}>
            <Box>
              <Caption>Updated {timeAgo(agent.updated_at)}</Caption>
            </Box>
          </Tooltip>

          <Stack direction="row" spacing={0.25} onClick={stop}>
            <Tooltip title="Edit agent">
              <IconButton
                size="small"
                onClick={() => onEdit(agent)}
                aria-label={`Edit ${agent.name}`}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete agent">
              <IconButton
                size="small"
                onClick={() => onDelete(agent)}
                aria-label={`Delete ${agent.name}`}
                sx={{ color: alpha(theme.palette.error.main, 0.7), '&:hover': { color: theme.palette.error.main } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AgentCard;
