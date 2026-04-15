import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Collapse,
  DialogContentText,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  LoadingState,
  SurfaceCard as Card,
  SurfaceCardContent as CardContent,
  StatusChip as Chip,
  SurfaceDialog as Dialog,
  SurfaceDialogActions as DialogActions,
  SurfaceDialogContent as DialogContent,
  SurfaceDialogTitle as DialogTitle,
} from '../../design-system';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Group as GroupIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { useNotification } from '../../context/notification-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import { avatarUrl } from '../../service/users';
import {
  getConversation,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  type ConversationDetailRead,
  type MessageRead,
} from '../../service/messages';
import { AgentEnabledMultilineField } from '../../component/agent-surface';

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
};

const ConversationDetailPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { token, user } = useContext(UserContext);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<ConversationDetailRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showParticipants, setShowParticipants] = useState(false);

  const notify = useNotification();

  const currentUserId = user?.id;

  const loadConversation = useCallback(async () => {
    if (!token || !conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getConversation(token, conversationId);
      setConversation(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load conversation');
    }
    setLoading(false);
  }, [token, conversationId]);

  useEffect(() => { loadConversation(); }, [loadConversation]);

  useEffect(() => {
    if (!token || !conversationId) return;
    markAsRead(token, conversationId).catch(() => {});
  }, [token, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const displayName = (() => {
    if (!conversation) return 'Conversation';
    if (conversation.title) return conversation.title;
    const others = (conversation.participants ?? []).filter((p) => p.user_id !== currentUserId);
    if (others.length === 0) return 'Conversation';
    return others.map((p) => p.display_name).join(', ');
  })();

  usePageToolbarHeader(displayName);

  const handleSend = async () => {
    if (!token || !conversationId || !newMessage.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(token, conversationId, { content: newMessage.trim() });
      setConversation((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...(prev.messages ?? []), msg] };
      });
      setNewMessage('');
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : 'Failed to send message');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEdit = async (messageId: string) => {
    if (!token || !conversationId || !editContent.trim()) return;
    try {
      const updated = await editMessage(token, conversationId, messageId, { content: editContent.trim() });
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: (prev.messages ?? []).map((m) => (m.id === messageId ? updated : m)),
        };
      });
      setEditingId(null);
      setEditContent('');
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : 'Failed to edit message');
    }
  };

  const handleDelete = async () => {
    if (!token || !conversationId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMessage(token, conversationId, deleteTarget);
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: (prev.messages ?? []).filter((m) => m.id !== deleteTarget),
        };
      });
      setDeleteTarget(null);
      notify.success('Message deleted');
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : 'Failed to delete message');
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <LoadingState kind="list" />
      </Box>
    );
  }

  if (error || !conversation) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/network/messages')} sx={{ mb: 2 }}>
          Back to Messages
        </Button>
        <Alert severity="error">{error ?? 'Conversation not found.'}</Alert>
      </Box>
    );
  }

  const messages: MessageRead[] = conversation.messages ?? [];
  const participants = conversation.participants ?? [];
  const isGroup = conversation.type === 'group';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 400 }}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/network/messages')} size="small">
          Back
        </Button>
        <Typography variant="h6" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {displayName}
        </Typography>
        {isGroup && (
          <Chip
            label="Group"
            size="small"
            variant="outlined"
            color="primary"
          />
        )}
        {isGroup && (
          <Tooltip title={showParticipants ? 'Hide participants' : 'Show participants'}>
            <IconButton
              size="small"
              onClick={() => setShowParticipants((v) => !v)}
              aria-label={showParticipants ? 'Hide participants' : 'Show participants'}
            >
              {showParticipants ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              <GroupIcon sx={{ ml: 0.5 }} fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Participants panel for groups */}
      {isGroup && (
        <Collapse in={showParticipants}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Participants ({participants.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {participants.map((p) => (
                  <Chip
                    key={p.user_id}
                    avatar={<Avatar src={avatarUrl(p.user_id, p.avatar_uri)}>{p.display_name.charAt(0)}</Avatar>}
                    label={`${p.display_name}${p.role === 'admin' ? ' (admin)' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Collapse>
      )}

      {/* Messages list */}
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2, px: 1 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No messages yet. Send the first one!</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {messages.map((msg) => {
              const isOwn = msg.author.user_id === currentUserId;
              const isEditing = editingId === msg.id;

              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Stack
                    direction={isOwn ? 'row-reverse' : 'row'}
                    spacing={1}
                    alignItems="flex-start"
                    sx={{ maxWidth: '75%' }}
                  >
                    <Avatar
                      src={avatarUrl(msg.author.user_id, msg.author.avatar_uri)}
                      sx={{ width: 32, height: 32, fontSize: 14, mt: 0.5 }}
                    >
                      {msg.author.display_name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="baseline"
                        sx={{ mb: 0.25, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}
                      >
                        <Typography variant="caption" fontWeight={600}>
                          {isOwn ? 'You' : msg.author.display_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(msg.created_at)}
                        </Typography>
                        {msg.edited_at && (
                          <Typography variant="caption" color="text.secondary" fontStyle="italic">
                            (edited)
                          </Typography>
                        )}
                      </Stack>
                      <Card
                        sx={{
                          bgcolor: isOwn ? 'primary.main' : 'background.paper',
                          color: isOwn ? 'primary.contrastText' : 'text.primary',
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          {isEditing ? (
                            <Stack spacing={1}>
                              <AgentEnabledMultilineField
                                size="small"
                                multiline
                                maxRows={4}
                                surfaceId={msg.id}
                                fieldKey="conversation_message_edit"
                                entityRefs={conversationId ? [{ kind: 'conversation', id: conversationId, label: displayName }] : []}
                                value={editContent}
                                onChange={setEditContent}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEdit(msg.id);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                autoFocus
                                fullWidth
                                sx={isOwn ? {
                                  '& .MuiInputBase-input': { color: 'primary.contrastText' },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                                } : {}}
                              />
                              <Stack direction="row" spacing={1}>
                                <Button size="small" variant="contained" onClick={() => handleEdit(msg.id)}>
                                  Save
                                </Button>
                                <Button size="small" onClick={() => setEditingId(null)}>
                                  Cancel
                                </Button>
                              </Stack>
                            </Stack>
                          ) : (
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {msg.content}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                      {isOwn && !isEditing && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                              aria-label="Edit message"
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteTarget(msg.id)} aria-label="Delete message">
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Box>

      {/* Message input */}
      <Card sx={{ p: 2, flexShrink: 0 }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <AgentEnabledMultilineField
            fullWidth
            size="small"
            placeholder="Type a message…"
            multiline
            maxRows={4}
            surfaceId={conversationId ?? 'conversation-compose'}
            fieldKey="conversation_message_compose"
            entityRefs={conversationId ? [{ kind: 'conversation', id: conversationId, label: displayName }] : []}
            value={newMessage}
            onChange={setNewMessage}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            aria-label="Send message"
          >
            {sending ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Stack>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this message? This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConversationDetailPage;
