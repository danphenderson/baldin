import React, { useContext, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Pagination as MuiPagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Chat as ChatIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import {
  getConversations,
  type ConversationRead,
} from '../../service/messages';
import { avatarUrl } from '../../service/users';
import EmptyState from '../../component/common/empty-state';
import NewConversationDialog from '../../component/new-conversation-dialog';
import { useNotification } from '../../context/notification-context';

const PAGE_SIZE = 20;

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const ConversationsPage: React.FC = () => {
  const { token, user } = useContext(UserContext);
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [dialogOpen, setDialogOpen] = useState(false);

  const { notify } = useNotification();

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getConversations(token, { page, page_size: PAGE_SIZE });
      setConversations(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to load conversations', 'error');
    }
    setLoading(false);
  }, [token, page, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  const currentUserId = user?.id;

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    if (!q) return conversations;
    return conversations.filter((c) => {
      if (c.title?.toLowerCase().includes(q)) return true;
      return (c.participants ?? []).some(
        (p) => p.user_id !== currentUserId && p.display_name.toLowerCase().includes(q),
      );
    });
  }, [deferredSearch, conversations, currentUserId]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => { setPage(1); }, [deferredSearch]);

  usePageToolbarHeader('Messages', 'Direct and group conversations');

  const getConversationDisplayName = (c: ConversationRead): string => {
    if (c.title) return c.title;
    const others = (c.participants ?? []).filter((p) => p.user_id !== currentUserId);
    if (others.length === 0) return 'Conversation';
    return others.map((p) => p.display_name).join(', ');
  };

  const handleCreated = (conversationId: string) => {
    setDialogOpen(false);
    navigate(`/network/messages/${conversationId}`);
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          placeholder="Search conversations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          New Message
        </Button>
      </Stack>

      {loading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} sx={{ height: 80 }}>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" height={22} />
                  <Skeleton variant="text" width="60%" height={16} sx={{ mt: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : filtered.length === 0 ? (
        conversations.length === 0 ? (
          <EmptyState
            icon={<ChatIcon />}
            title="No conversations yet"
            description="Start a conversation from a connection's profile or Discover."
            action={{ label: 'New Message', onClick: () => setDialogOpen(true), icon: <AddIcon /> }}
          />
        ) : (
          <EmptyState
            icon={<SearchIcon />}
            title="No results match your filters"
            description="Try adjusting your search or clearing filters."
          />
        )
      ) : (
        <Stack spacing={1}>
          {filtered.map((conversation) => {
            const displayName = getConversationDisplayName(conversation);
            const others = (conversation.participants ?? []).filter((p) => p.user_id !== currentUserId);
            const lastMsg = conversation.last_message;
            const unread = conversation.unread_count ?? 0;

            return (
              <Card key={conversation.id} sx={{ position: 'relative' }}>
                <CardActionArea onClick={() => navigate(`/network/messages/${conversation.id}`)}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Badge
                        badgeContent={unread}
                        color="primary"
                        invisible={unread === 0}
                        overlap="circular"
                      >
                        {others.length === 1 ? (
                          <Avatar src={avatarUrl(others[0].user_id, others[0].avatar_uri)} sx={{ width: 48, height: 48 }}>
                            {others[0].display_name.charAt(0)}
                          </Avatar>
                        ) : (
                          <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 36, height: 36, fontSize: 14 } }}>
                            {others.map((p) => (
                              <Avatar key={p.user_id} src={avatarUrl(p.user_id, p.avatar_uri)}>
                                {p.display_name.charAt(0)}
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        )}
                      </Badge>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                          <Typography
                            variant="body1"
                            fontWeight={unread > 0 ? 700 : 500}
                            noWrap
                            sx={{ flex: 1, minWidth: 0 }}
                          >
                            {displayName}
                          </Typography>
                          {lastMsg && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                              {formatTimestamp(lastMsg.created_at)}
                            </Typography>
                          )}
                        </Stack>
                        {lastMsg && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            fontWeight={unread > 0 ? 600 : 400}
                          >
                            {lastMsg.author.user_id === currentUserId ? 'You: ' : `${lastMsg.author.display_name}: `}
                            {lastMsg.content}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}

      {!loading && pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <MuiPagination
            count={pageCount}
            page={page}
            onChange={(_, v) => setPage(v)}
            shape="rounded"
            sx={{ '& .MuiPaginationItem-root': { fontWeight: 600 } }}
          />
        </Box>
      )}

      <NewConversationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
};

export default ConversationsPage;
