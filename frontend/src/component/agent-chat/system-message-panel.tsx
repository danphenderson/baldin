import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Collapse, Paper, Stack, Typography } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SettingsSuggestOutlined as ContextIcon,
} from '@mui/icons-material';
import type { AgentChatMessageRead } from '../../service/agent-chat';
import ChatMarkdown from './chat-markdown';

export interface SystemMessagePanelProps {
  messages: AgentChatMessageRead[];
}

const SystemMessagePanel: React.FC<SystemMessagePanelProps> = ({ messages }) => {
  const [open, setOpen] = useState(false);

  const combinedContent = useMemo(() => (
    messages
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join('\n\n---\n\n')
  ), [messages]);

  if (!combinedContent) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip icon={<ContextIcon />} label="Context" size="small" variant="outlined" />
          {messages.length > 1 && (
            <Typography variant="caption" color="text.secondary">
              {messages.length} system messages
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="text"
            onClick={() => setOpen((value) => !value)}
            startIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            {open ? 'Hide' : 'Show'}
          </Button>
        </Stack>
        <Collapse in={open}>
          <ChatMarkdown>{combinedContent}</ChatMarkdown>
        </Collapse>
      </Stack>
    </Paper>
  );
};

export default SystemMessagePanel;
