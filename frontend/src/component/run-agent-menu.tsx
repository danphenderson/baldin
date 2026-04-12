import React, { useContext } from 'react';
import { SmartToyOutlined as AgentIcon } from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { runAgent } from '../service/agents';
import type { AgentSummaryRead, AgentRunRead } from '../service/agents';
import AgentPickerMenu from './agent-picker-menu';

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

  const handleSelect = async (agent: AgentSummaryRead) => {
    if (!token) return;
    try {
      const run = await runAgent(token, agent.id, { application_id: applicationId });
      if (!run.session_document_id) {
        notify('Agent completed but no session was created', 'warning');
        return;
      }
      onSessionCreated(run);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Agent launch failed', 'error');
    }
  };

  return (
    <AgentPickerMenu
      buttonLabel="Run Agent"
      busyLabel="Launching…"
      idleIcon={<AgentIcon />}
      disabled={disabled}
      onAgentSelected={handleSelect}
    />
  );
};

export default RunAgentMenu;
