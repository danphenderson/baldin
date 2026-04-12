import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { KeyboardArrowDown as JumpIcon } from '@mui/icons-material';
import type { AgentChatMessageRead } from '../../service/agent-chat';
import ChatMessageBubble, { type ChatDisplayMessage } from './chat-message-bubble';
import SystemMessagePanel from './system-message-panel';

export interface ChatThreadProps {
  systemMessages: AgentChatMessageRead[];
  messages: ChatDisplayMessage[];
  hasOlderMessages: boolean;
  loadingOlderMessages: boolean;
  onLoadOlderMessages: () => void;
  onScroll: React.UIEventHandler<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  showJumpToBottom: boolean;
  onJumpToBottom: () => void;
}

const ChatThread: React.FC<ChatThreadProps> = ({
  systemMessages,
  messages,
  hasOlderMessages,
  loadingOlderMessages,
  onLoadOlderMessages,
  onScroll,
  scrollContainerRef,
  messagesEndRef,
  showJumpToBottom,
  onJumpToBottom,
}) => (
  <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
    <Box
      ref={scrollContainerRef}
      role="log"
      aria-live="polite"
      onScroll={onScroll}
      sx={{
        height: '100%',
        overflowY: 'auto',
        px: { xs: 0.5, sm: 1 },
        pb: 2,
      }}
    >
      <Stack spacing={1.5}>
        <SystemMessagePanel messages={systemMessages} />
        {hasOlderMessages && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button size="small" onClick={onLoadOlderMessages} disabled={loadingOlderMessages}>
              {loadingOlderMessages ? 'Loading earlier messages…' : 'Load earlier messages'}
            </Button>
          </Box>
        )}
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">
              The chat is ready. Send the first message to start the conversation.
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </Stack>
    </Box>
    {showJumpToBottom && (
      <Button
        variant="contained"
        size="small"
        startIcon={<JumpIcon />}
        onClick={onJumpToBottom}
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 12,
          borderRadius: 999,
          boxShadow: 2,
        }}
      >
        Latest
      </Button>
    )}
  </Box>
);

export default ChatThread;
