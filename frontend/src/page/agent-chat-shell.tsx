import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Skeleton, Snackbar, Stack,
} from '@mui/material';
import {
  ChatBubbleOutline as ChatIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import { getAgent } from '../service/agents';
import {
  getChatHistory,
  getChatSession,
  saveChatToDocument,
  sendChatMessage,
  updateChatSession,
} from '../service/agent-chat';
import type {
  AgentChatMessageRead,
  AgentChatSessionRead,
} from '../service/agent-chat';
import ChatComposer, { type ChatComposerError } from '../component/agent-chat/chat-composer';
import ChatThread from '../component/agent-chat/chat-thread';
import ChatSessionHeader from '../component/agent-chat/chat-session-header';
import type { ChatDisplayMessage } from '../component/agent-chat/chat-message-bubble';
import EmptyState from '../component/common/empty-state';
import { getAgentModelDisplayLabel } from '../util/agent-models';

interface StreamState {
  controller: AbortController;
  assistantMessageId: string;
  content: string;
}

interface RetryState extends ChatComposerError {
  mode: 'resend' | 'reload';
  content: string | null;
}

interface SavedDocumentState {
  documentId: string;
}

const DEFAULT_SESSION_LIMIT = 50;
const NEAR_BOTTOM_THRESHOLD = 72;

const createLocalMessageId = (prefix: string, sequence: number): string => `${prefix}-${sequence}`;

const isLocalMessageId = (messageId: string): boolean => messageId.startsWith('local-');

const compareChatMessages = (
  left: Pick<ChatDisplayMessage, 'id' | 'created_at'>,
  right: Pick<ChatDisplayMessage, 'id' | 'created_at'>,
): number => {
  const createdAtDelta = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  if (isLocalMessageId(left.id) || isLocalMessageId(right.id)) {
    return 0;
  }

  return left.id.localeCompare(right.id);
};

const dedupeMessages = (
  messages: ReadonlyArray<AgentChatMessageRead | ChatDisplayMessage>,
): ChatDisplayMessage[] => {
  const seen = new Set<string>();
  return [...messages]
    .sort(compareChatMessages)
    .reduceRight<ChatDisplayMessage[]>((deduped, message) => {
      if (seen.has(message.id)) {
        return deduped;
      }
      seen.add(message.id);
      deduped.unshift(message);
      return deduped;
    }, []);
};

const countCanonicalMessages = (messages: ChatDisplayMessage[]): number => (
  messages.filter((message) => !isLocalMessageId(message.id)).length
);

const mergeCanonicalMessages = (
  current: ChatDisplayMessage[],
  incoming: AgentChatMessageRead[],
): ChatDisplayMessage[] => {
  const retained = current.filter((message) => !isLocalMessageId(message.id));
  return dedupeMessages([...retained, ...incoming]);
};

const AgentChatShellPage: React.FC = () => {
  const { agentId, sessionId } = useParams<{ agentId: string; sessionId: string }>();
  const { token } = useContext(UserContext);
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [session, setSession] = useState<AgentChatSessionRead | null>(null);
  const [agentName, setAgentName] = useState('Agent');
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streamState, setStreamState] = useState<StreamState | null>(null);
  const [composerError, setComposerError] = useState<RetryState | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [savedDocument, setSavedDocument] = useState<SavedDocumentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const messageSequenceRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatDisplayMessage[]>([]);

  const title = useMemo(() => session?.title?.trim() || 'Untitled chat', [session?.title]);
  const systemMessages = useMemo(
    () => messages.filter((message) => message.role === 'system'),
    [messages],
  );
  const conversationMessages = useMemo(
    () => messages.filter((message) => message.role !== 'system'),
    [messages],
  );
  const hasAssistantMessage = useMemo(
    () => messages.some((message) => message.role === 'assistant' && Boolean(message.content.trim())),
    [messages],
  );
  const hasOlderMessages = olderCursor !== null;

  usePageToolbarHeader(title, 'Agent chat');

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const syncSession = useCallback(async (limit?: number) => {
    if (!token || !sessionId) {
      return null;
    }

    const currentCanonicalCount = countCanonicalMessages(messagesRef.current);
    const result = await getChatSession(
      token,
      sessionId,
      limit ?? Math.max(DEFAULT_SESSION_LIMIT, currentCanonicalCount + 5),
    );

    if (agentId && result.agent_id !== agentId) {
      navigate(`/automation/agents/${result.agent_id}/chat/${result.id}`, { replace: true });
      return null;
    }

    setSession(result);
    setOlderCursor(result.message_history?.next_before ?? null);
    setMessages((current) => mergeCanonicalMessages(current, result.messages ?? []));
    return result;
  }, [agentId, navigate, sessionId, token]);

  const refresh = useCallback(async () => {
    if (!token || !sessionId) {
      setOlderCursor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const result = await syncSession(DEFAULT_SESSION_LIMIT);
      if (!result) {
        return;
      }
      try {
        const agent = await getAgent(token, result.agent_id);
        setAgentName(agent.name.trim() || 'Agent');
      } catch {
        setAgentName('Agent');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load chat session';
      setSession(null);
      setOlderCursor(null);
      setMessages([]);
      if (/not found/i.test(message)) {
        setNotFound(true);
      } else {
        setLoadError(message);
        notify(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [notify, sessionId, syncSession, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (stickToBottom) {
      scrollToBottom(streamState ? 'auto' : 'smooth');
    }
  }, [messages, scrollToBottom, stickToBottom, streamState]);

  const handleThreadScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_THRESHOLD;
    setStickToBottom(nearBottom);
    setShowJumpToBottom(!nearBottom);
  };

  const handleLoadOlderMessages = useCallback(async () => {
    if (!token || !sessionId || !session || !olderCursor) {
      return;
    }

    setLoadingOlderMessages(true);
    try {
      const page = await getChatHistory(token, sessionId, {
        before: olderCursor,
        limit: DEFAULT_SESSION_LIMIT,
      });
      setMessages((current) => dedupeMessages([...page.items, ...current]));
      setOlderCursor(page.next_before ?? null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to load earlier messages', 'error');
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [notify, olderCursor, session, sessionId, token]);

  const handleSaveTitle = useCallback(async (nextTitle: string) => {
    if (!token || !session) {
      return;
    }
    setSavingTitle(true);
    try {
      const updated = await updateChatSession(token, session.id, { title: nextTitle });
      setSession((current) => current ? { ...current, ...updated } : updated);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to update chat title', 'error');
      throw error;
    } finally {
      setSavingTitle(false);
    }
  }, [notify, session, token]);

  const handleSubmitMessage = useCallback((contentOverride?: string) => {
    if (!token || !sessionId || !session) {
      return;
    }

    const content = (contentOverride ?? draft).trim();
    if (!content || streamState || session.status === 'archived') {
      return;
    }

    const now = new Date().toISOString();
    messageSequenceRef.current += 1;
    const userMessageId = createLocalMessageId('local-user', messageSequenceRef.current);
    messageSequenceRef.current += 1;
    const assistantMessageId = createLocalMessageId('local-assistant', messageSequenceRef.current);

    const optimisticUser: ChatDisplayMessage = {
      id: userMessageId,
      role: 'user',
      content,
      created_at: now,
      metadata: {},
    };
    const optimisticAssistant: ChatDisplayMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date(Date.now() + 1).toISOString(),
      metadata: {},
      isStreaming: true,
    };

    let sawDelta = false;

    setComposerError(null);
    setDraft('');
    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);

    const controller = sendChatMessage(
      token,
      sessionId,
      content,
      (chunk) => {
        sawDelta = true;
        setMessages((current) => current.map((message) => (
          message.id === assistantMessageId
            ? { ...message, content: `${message.content}${chunk}`, isStreaming: true }
            : message
        )));
      },
      (message) => {
        setStreamState(null);
        setMessages((current) => current.map((entry) => (
          entry.id === assistantMessageId
            ? { ...message, isStreaming: false }
            : entry
        )));
        void syncSession();
      },
      (error) => {
        setStreamState(null);
        setMessages((current) => current.filter((entry) => entry.id !== assistantMessageId));
        setComposerError({
          message: error,
          mode: sawDelta ? 'reload' : 'resend',
          content,
        });
        void syncSession().catch(() => {});
      },
    );

    setStreamState({ controller, assistantMessageId, content });
  }, [draft, session, sessionId, streamState, syncSession, token]);

  const handleCancelStreaming = useCallback(() => {
    if (!streamState) {
      return;
    }

    streamState.controller.abort();
    setMessages((current) => current.flatMap((message) => {
      if (message.id !== streamState.assistantMessageId) {
        return [message];
      }
      if (!message.content.trim()) {
        return [];
      }
      return [{ ...message, isStreaming: false, isCancelled: true }];
    }));
    setStreamState(null);
  }, [streamState]);

  const handleRetry = useCallback(() => {
    if (!composerError) {
      return;
    }
    if (composerError.mode === 'resend' && composerError.content) {
      handleSubmitMessage(composerError.content);
      return;
    }
    void syncSession();
    setComposerError(null);
  }, [composerError, handleSubmitMessage, syncSession]);

  const handleSaveDocument = useCallback(async () => {
    if (!token || !session) {
      return;
    }

    setSavingDocument(true);
    try {
      const saved = await saveChatToDocument(token, session.id, {});
      setSavedDocument({ documentId: saved.document_id });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to save chat as a document', 'error');
    } finally {
      setSavingDocument(false);
    }
  }, [notify, session, token]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <Skeleton variant="text" width={220} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={160} height={28} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={560} />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <EmptyState
          icon={<ErrorIcon />}
          title="Unable to load chat session"
          description={loadError}
          action={{ label: 'Retry', onClick: refresh, icon: <RefreshIcon /> }}
        />
      </Box>
    );
  }

  if (notFound || !session || !agentId) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <EmptyState
          icon={<ChatIcon />}
          title="Chat session not found"
          description="This chat session may have been deleted."
          action={{ label: 'Back to Agent', onClick: () => navigate(`/automation/agents/${agentId ?? ''}`) }}
        />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          maxWidth: 960,
          mx: 'auto',
          minHeight: 'calc(100vh - 180px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          spacing={2}
          sx={{
            flex: 1,
            minHeight: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 4,
            bgcolor: 'background.default',
            p: { xs: 1.5, sm: 2 },
          }}
        >
          <ChatSessionHeader
            agentName={agentName}
            title={title}
            status={session.status}
            modelLabel={getAgentModelDisplayLabel(session.model_name ?? null)}
            applicationId={session.application_id}
            isSavingTitle={savingTitle}
            isSavingDocument={savingDocument}
            canSaveDocument={!streamState && !savingDocument && hasAssistantMessage}
            onBack={() => navigate(`/automation/agents/${agentId}`)}
            onSaveTitle={handleSaveTitle}
            onSaveDocument={() => {
              void handleSaveDocument();
            }}
          />
          <Box sx={{ minHeight: 0, flex: 1 }}>
            <ChatThread
              systemMessages={systemMessages}
              messages={conversationMessages}
              hasOlderMessages={hasOlderMessages}
              loadingOlderMessages={loadingOlderMessages}
              onLoadOlderMessages={handleLoadOlderMessages}
              onScroll={handleThreadScroll}
              scrollContainerRef={scrollContainerRef}
              messagesEndRef={messagesEndRef}
              showJumpToBottom={showJumpToBottom}
              onJumpToBottom={() => {
                setStickToBottom(true);
                setShowJumpToBottom(false);
                scrollToBottom();
              }}
            />
          </Box>
          {loadingOlderMessages && (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <CircularProgress size={16} />
              <Alert severity="info" sx={{ py: 0 }}>
                Loading more chat history…
              </Alert>
            </Stack>
          )}
          <ChatComposer
            value={draft}
            onChange={setDraft}
            onSubmit={() => handleSubmitMessage()}
            onCancel={handleCancelStreaming}
            onRetry={handleRetry}
            streaming={Boolean(streamState)}
            archived={session.status === 'archived'}
            error={composerError}
          />
        </Stack>
      </Box>
      <Snackbar
        open={Boolean(savedDocument)}
        autoHideDuration={6000}
        onClose={() => setSavedDocument(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSavedDocument(null)}
          action={savedDocument ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                navigate(`/workspace/${savedDocument.documentId}/edit`);
                setSavedDocument(null);
              }}
            >
              Open document
            </Button>
          ) : undefined}
        >
          Chat saved as a document.
        </Alert>
      </Snackbar>
    </>
  );
};

export default AgentChatShellPage;
