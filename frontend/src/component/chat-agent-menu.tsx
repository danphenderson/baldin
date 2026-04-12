import React, { useContext } from 'react';
import { ChatBubbleOutline as ChatIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import AgentPickerMenu from './agent-picker-menu';
import { createChatSession } from '../service/agent-chat';
import type { AgentSummaryRead } from '../service/agents';

export interface ChatAgentMenuProps {
  applicationId: string;
  disabled?: boolean;
}

const ChatAgentMenu: React.FC<ChatAgentMenuProps> = ({
  applicationId,
  disabled = false,
}) => {
  const { token } = useContext(UserContext);
  const { notify } = useNotification();
  const navigate = useNavigate();

  const handleSelect = async (agent: AgentSummaryRead) => {
    if (!token) return;
    try {
      const session = await createChatSession(token, agent.id, {
        application_id: applicationId,
      });
      navigate(`/automation/agents/${agent.id}/chat/${session.id}`);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Chat launch failed', 'error');
    }
  };

  return (
    <AgentPickerMenu
      buttonLabel="Chat with Agent"
      busyLabel="Opening chat…"
      idleIcon={<ChatIcon />}
      disabled={disabled}
      onAgentSelected={handleSelect}
    />
  );
};

export default ChatAgentMenu;
