import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Button, Menu, MenuItem, ListItemText,
  CircularProgress, Box, useTheme,
} from '@mui/material';
import { SmartToyOutlined as AgentIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { getAgents, runAgent } from '../service/agents';
import type { AgentSummaryRead, AgentRunRead } from '../service/agents';
import { getKindLabel, kindColor } from './agent-card';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface RunAgentMenuProps {
  applicationId: string;
  onSessionCreated: (run: AgentRunRead) => void;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const RunAgentMenu: React.FC<RunAgentMenuProps> = ({
  applicationId,
  onSessionCreated,
  disabled = false,
}) => {
  const { token } = useContext(UserContext);
  const { notify } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();
  const anchorRef = useRef<HTMLButtonElement>(null);

  const [agents, setAgents] = useState<AgentSummaryRead[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [launching, setLaunching] = useState(false);

  /* ---- Fetch enabled agents every time the menu opens ---- */

  const fetchAgents = useCallback(async () => {
    if (!token) return;
    setFetchError(false);
    try {
      const all = await getAgents(token);
      setAgents(all.filter((a) => a.is_enabled));
      setFetched(true);
    } catch {
      setFetchError(true);
    }
  }, [token]);

  useEffect(() => {
    if (menuOpen) {
      fetchAgents();
    }
  }, [menuOpen, fetchAgents]);

  /* ---- Handlers ---- */

  const handleOpen = () => {
    setMenuOpen(true);
  };

  const handleClose = () => {
    if (!launching) setMenuOpen(false);
  };

  const handleSelect = async (agent: AgentSummaryRead) => {
    if (!token || launching) return;
    setMenuOpen(false);
    setLaunching(true);
    try {
      const run = await runAgent(token, agent.id, { application_id: applicationId });
      if (!run.session_document_id) {
        notify('Agent completed but no session was created', 'warning');
        return;
      }
      onSessionCreated(run);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Agent launch failed', 'error');
    } finally {
      setLaunching(false);
    }
  };

  const handleRetry = () => {
    setFetchError(false);
    setFetched(false);
    fetchAgents();
  };

  /* ---- Menu content ---- */

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
          <ListItemText primary="Loading agents\u2026" slotProps={{ primary: { variant: 'body2' } }} />
        </MenuItem>
      );
    }

    if (agents.length === 0) {
      return (
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            navigate('/network/agents');
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

  /* ---- Render ---- */

  return (
    <>
      <Button
        ref={anchorRef}
        variant="outlined"
        size="small"
        onClick={handleOpen}
        disabled={disabled || launching}
        startIcon={
          launching
            ? <CircularProgress size={16} color="inherit" />
            : <AgentIcon />
        }
        aria-haspopup="true"
        aria-expanded={menuOpen || undefined}
        aria-busy={launching || undefined}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {launching ? 'Launching\u2026' : 'Run Agent'}
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

export default RunAgentMenu;
