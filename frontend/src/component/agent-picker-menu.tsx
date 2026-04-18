import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Button, Menu, MenuItem, ListItemText,
  CircularProgress, Box, useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { getAgents } from '../service/agents';
import type { AgentSummaryRead } from '../service/agents';
import { getKindLabel, kindColor } from './agent-card';

export interface AgentPickerMenuProps {
  buttonLabel: string;
  busyLabel: string;
  idleIcon: React.ReactNode;
  disabled?: boolean;
  onAgentSelected: (agent: AgentSummaryRead) => Promise<void>;
}

const AgentPickerMenu: React.FC<AgentPickerMenuProps> = ({
  buttonLabel,
  busyLabel,
  idleIcon,
  disabled = false,
  onAgentSelected,
}) => {
  const { token } = useContext(UserContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const fetchRequestIdRef = useRef(0);

  const [agents, setAgents] = useState<AgentSummaryRead[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchAgents = useCallback(async () => {
    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;
    setFetchError(false);
    setFetched(false);

    if (!token) {
      setFetchError(false);
      setAgents([]);
      setFetched(true);
      return;
    }

    try {
      const all = await getAgents(token);
      if (fetchRequestIdRef.current !== requestId) {
        return;
      }
      setAgents(all.filter((agent) => agent.is_enabled));
      setFetched(true);
    } catch {
      if (fetchRequestIdRef.current !== requestId) {
        return;
      }
      setFetchError(true);
    }
  }, [token]);

  useEffect(() => {
    if (menuOpen) {
      fetchAgents();
    }
  }, [menuOpen, fetchAgents]);

  const handleOpen = () => {
    setMenuOpen(true);
  };

  const handleClose = () => {
    if (!busy) {
      setMenuOpen(false);
    }
  };

  const handleSelect = async (agent: AgentSummaryRead) => {
    if (!token || busy) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      await onAgentSelected(agent);
    } catch {
      // The caller owns error reporting. Avoid surfacing an unhandled rejection.
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = () => {
    setFetchError(false);
    setFetched(false);
    fetchAgents();
  };

  const renderMenuItems = () => {
    if (fetchError) {
      return (
        <MenuItem onClick={handleRetry}>
          <ListItemText
            primary="Failed to load agents"
            secondary="Click to retry"
            slotProps={{ primary: { variant: 'body2', color: 'error' } }}
          />
        </MenuItem>
      );
    }

    if (!fetched) {
      return (
        <MenuItem disabled>
          <ListItemText primary="Loading agents…" slotProps={{ primary: { variant: 'body2' } }} />
        </MenuItem>
      );
    }

    if (agents.length === 0) {
      return (
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            navigate('/automation/agents');
          }}
        >
          <ListItemText
            primary="No agents available"
            secondary="Create one to get started"
            slotProps={{
              primary: { variant: 'body2', sx: { fontStyle: 'italic' } },
              secondary: { variant: 'caption' },
            }}
          />
        </MenuItem>
      );
    }

    return agents.map((agent) => (
      <MenuItem key={agent.id} onClick={() => handleSelect(agent)}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: kindColor(agent.kind, theme),
            flexShrink: 0,
            mr: 1.5,
          }}
        />
        <ListItemText
          primary={agent.name}
          secondary={getKindLabel(agent.kind)}
          slotProps={{
            primary: { variant: 'body2', fontWeight: 500 },
            secondary: { variant: 'caption' },
          }}
        />
      </MenuItem>
    ));
  };

  return (
    <>
      <Button
        ref={anchorRef}
        variant="outlined"
        size="small"
        onClick={handleOpen}
        disabled={disabled || busy}
        startIcon={
          busy
            ? <CircularProgress size={16} color="inherit" />
            : idleIcon
        }
        aria-haspopup="true"
        aria-expanded={menuOpen || undefined}
        aria-busy={busy || undefined}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {busy ? busyLabel : buttonLabel}
      </Button>

      <Menu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { minWidth: 220, maxHeight: 280 } },
        }}
      >
        {renderMenuItems()}
      </Menu>
    </>
  );
};

export default AgentPickerMenu;
