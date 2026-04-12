import React from 'react';
import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import {
  PersonOutline as UserIcon,
  SmartToyOutlined as AssistantIcon,
} from '@mui/icons-material';
import type { AgentChatMessageRead } from '../../service/agent-chat';
import ChatMarkdown from './chat-markdown';

export interface ChatDisplayMessage extends AgentChatMessageRead {
  isStreaming?: boolean;
  isCancelled?: boolean;
}

export interface ChatMessageBubbleProps {
  message: ChatDisplayMessage;
}

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const typingCursorSx = {
  display: 'inline-block',
  width: '0.55ch',
  ml: 0.2,
  animation: 'agent-chat-cursor 1s steps(1) infinite',
  '@keyframes agent-chat-cursor': {
    '0%, 45%': { opacity: 1 },
    '50%, 100%': { opacity: 0 },
  },
};

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const avatar = isUser ? <UserIcon fontSize="small" /> : <AssistantIcon fontSize="small" />;
  const label = isUser ? 'You' : 'Assistant';
  const bubbleColor = isUser ? 'primary.main' : 'background.paper';
  const textColor = isUser ? 'primary.contrastText' : 'text.primary';

  return (
    <Box
      data-testid={message.isStreaming ? 'streaming-message' : undefined}
      sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
    >
      <Stack
        direction={isUser ? 'row-reverse' : 'row'}
        spacing={1}
        alignItems="flex-start"
        sx={{ maxWidth: { xs: '92%', sm: '80%' } }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: 14,
            mt: 0.5,
            bgcolor: isUser ? 'primary.light' : 'grey.200',
            color: isUser ? 'primary.contrastText' : 'text.primary',
          }}
        >
          {avatar}
        </Avatar>
        <Box>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="baseline"
            sx={{ mb: 0.4, justifyContent: isUser ? 'flex-end' : 'flex-start' }}
          >
            <Typography variant="caption" fontWeight={700}>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(message.created_at)}
            </Typography>
            {message.isCancelled && (
              <Typography variant="caption" color="warning.main">
                Stopped
              </Typography>
            )}
          </Stack>
          <Paper
            variant={isUser ? 'elevation' : 'outlined'}
            elevation={isUser ? 0 : undefined}
            sx={{
              px: 1.5,
              py: 1.2,
              bgcolor: bubbleColor,
              color: textColor,
              borderRadius: 3,
              borderTopRightRadius: isUser ? 1 : 3,
              borderTopLeftRadius: isUser ? 3 : 1,
            }}
          >
            {isUser ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 }}>
                {message.content}
              </Typography>
            ) : (
              <Box>
                {message.content ? (
                  <ChatMarkdown color="inherit">{message.content}</ChatMarkdown>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Thinking…
                  </Typography>
                )}
                {message.isStreaming && (
                  <Box component="span" aria-hidden="true" sx={typingCursorSx}>
                    |
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export default ChatMessageBubble;
