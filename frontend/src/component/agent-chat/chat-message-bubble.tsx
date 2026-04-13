import React from 'react';
import {
  Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip as Chip } from '../../design-system';
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

interface RetrievalCitation {
  kind: 'document' | 'url';
  title: string;
  snippet: string;
  url: string | null;
  documentId: string | null;
  documentKind: string | null;
}

interface ParsedRetrievalMetadata {
  citations: RetrievalCitation[];
  warnings: string[];
  urlFetchMethod: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

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

const parseRetrievalMetadata = (metadata: unknown): ParsedRetrievalMetadata | null => {
  if (!isRecord(metadata) || !isRecord(metadata.retrieval)) {
    return null;
  }

  const retrieval = metadata.retrieval;
  const citations = Array.isArray(retrieval.citations)
    ? retrieval.citations.flatMap<RetrievalCitation>((entry, index) => {
      if (!isRecord(entry)) {
        return [];
      }

      const kind = entry.kind === 'url' ? 'url' : 'document';
      const title = typeof entry.title === 'string' && entry.title.trim()
        ? entry.title.trim()
        : `${kind === 'url' ? 'URL' : 'Document'} ${index + 1}`;
      const snippet = typeof entry.snippet === 'string' ? entry.snippet.trim() : '';
      const url = typeof entry.url === 'string' && entry.url.trim() ? entry.url.trim() : null;
      const documentId = typeof entry.document_id === 'string' ? entry.document_id : null;
      const documentKind = typeof entry.document_kind === 'string' ? entry.document_kind : null;

      return [{
        kind,
        title,
        snippet,
        url,
        documentId,
        documentKind,
      }];
    })
    : [];

  const documentWarnings = isRecord(retrieval.documents) && Array.isArray(retrieval.documents.warnings)
    ? retrieval.documents.warnings.filter((warning): warning is string => (
      typeof warning === 'string' && warning.trim().length > 0
    ))
    : [];

  const urlWarning = isRecord(retrieval.url) && typeof retrieval.url.warning === 'string'
    ? retrieval.url.warning.trim()
    : '';
  const urlFetchMethod = isRecord(retrieval.url) && typeof retrieval.url.fetch_method === 'string'
    ? retrieval.url.fetch_method
    : null;
  const warnings = urlWarning ? [...documentWarnings, urlWarning] : documentWarnings;

  if (citations.length === 0 && warnings.length === 0) {
    return null;
  }

  return {
    citations,
    warnings,
    urlFetchMethod,
  };
};

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const avatar = isUser ? <UserIcon fontSize="small" /> : <AssistantIcon fontSize="small" />;
  const label = isUser ? 'You' : 'Assistant';
  const bubbleColor = isUser ? 'primary.main' : 'background.paper';
  const textColor = isUser ? 'primary.contrastText' : 'text.primary';
  const retrievalMetadata = !isUser ? parseRetrievalMetadata(message.metadata) : null;

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
              borderRadius: '12px',
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
          {!isUser && retrievalMetadata && (
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {retrievalMetadata.citations.length > 0 && (
                <Paper variant="outlined" sx={{ px: 1.25, py: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Sources
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 0.75 }}>
                    {retrievalMetadata.citations.map((citation, index) => (
                      <Stack key={`${citation.kind}-${citation.documentId ?? citation.url ?? index}`} spacing={0.5}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={citation.kind === 'url' ? 'URL' : (citation.documentKind ?? 'Document').replace(/_/g, ' ')}
                          />
                          {citation.kind === 'document' && citation.documentId ? (
                            <Link
                              component={RouterLink}
                              to={`/workspace/${citation.documentId}/edit`}
                              underline="hover"
                              variant="body2"
                            >
                              {citation.title}
                            </Link>
                          ) : citation.url ? (
                            <Link
                              href={citation.url}
                              target="_blank"
                              rel="noreferrer"
                              underline="hover"
                              variant="body2"
                            >
                              {citation.title}
                            </Link>
                          ) : (
                            <Typography variant="body2">{citation.title}</Typography>
                          )}
                          {citation.kind === 'url' && retrievalMetadata.urlFetchMethod && (
                            <Typography variant="caption" color="text.secondary">
                              via {retrievalMetadata.urlFetchMethod}
                            </Typography>
                          )}
                        </Stack>
                        {citation.snippet && (
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                            {citation.snippet}
                          </Typography>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              )}
              {retrievalMetadata.warnings.map((warning) => (
                <Alert key={warning} severity="warning" variant="outlined" sx={{ py: 0 }}>
                  {warning}
                </Alert>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default ChatMessageBubble;
