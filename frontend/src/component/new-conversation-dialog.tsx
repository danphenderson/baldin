import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  SurfaceDialog as Dialog,
  SurfaceDialogActions as DialogActions,
  SurfaceDialogContent as DialogContent,
  SurfaceDialogTitle as DialogTitle,
} from '../design-system';
import { UserContext } from '../context/user-context';
import { getAllConnections, type ConnectionRead } from '../service/connections';
import { createConversation } from '../service/messages';
import { avatarUrl } from '../service/users';

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
  /** Pre-select a recipient by user ID (for "Message" buttons). */
  initialRecipientId?: string;
}

const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open,
  onClose,
  onCreated,
  initialRecipientId,
}) => {
  const { token, user } = useContext(UserContext);

  const [connections, setConnections] = useState<ConnectionRead[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGroup, setIsGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const currentUserId = user?.id;

  const loadConnections = useCallback(async () => {
    if (!token) return;
    setLoadingConnections(true);
    try {
      const res = await getAllConnections(token, { status: 'accepted' });
      setConnections(res ?? []);
    } catch {
      setConnections([]);
    }
    setLoadingConnections(false);
  }, [token]);

  useEffect(() => {
    if (open) {
      loadConnections();
      setError(null);
      setGroupTitle('');
      setSearch('');
      if (initialRecipientId) {
        setSelected(new Set([initialRecipientId]));
        setIsGroup(false);
      } else {
        setSelected(new Set());
      }
    }
  }, [open, loadConnections, initialRecipientId]);

  const connectedUsers = connections.map((c) => {
    const other =
      c.requester.user_id === currentUserId ? c.addressee : c.requester;
    return other;
  });

  const filteredUsers = search.trim()
    ? connectedUsers.filter((u) =>
        u.display_name.toLowerCase().includes(search.toLowerCase().trim()),
      )
    : connectedUsers;

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        if (!isGroup) {
          next.clear();
        }
        next.add(userId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isGroup && selected.size > 1) {
      const first = Array.from(selected)[0];
      setSelected(new Set(first ? [first] : []));
    }
  }, [isGroup, selected]);

  const handleCreate = async () => {
    if (!token || selected.size === 0) return;
    setCreating(true);
    setError(null);
    try {
      const conv = await createConversation(token, {
        participant_user_ids: Array.from(selected),
        type: isGroup ? 'group' : 'direct',
        title: isGroup ? groupTitle.trim() || null : null,
      });
      onCreated(conv.id);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Failed to create conversation',
      );
    }
    setCreating(false);
  };

  const canCreate = selected.size > 0 && (!isGroup || selected.size >= 2);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Conversation</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Switch checked={isGroup} onChange={(_, v) => setIsGroup(v)} />
            }
            label="Group conversation"
          />

          {isGroup && (
            <TextField
              size="small"
              label="Group title (optional)"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              fullWidth
            />
          )}

          <Typography variant="subtitle2" color="text.secondary">
            Select {isGroup ? 'participants (2+)' : 'a recipient'}
          </Typography>

          <TextField
            size="small"
            placeholder="Search connections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />

          {loadingConnections ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filteredUsers.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: 2, textAlign: 'center' }}
            >
              {connectedUsers.length === 0
                ? 'No accepted connections. Connect with someone first.'
                : 'No matching connections.'}
            </Typography>
          ) : (
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {filteredUsers.map((u) => (
                <ListItem key={u.user_id} disablePadding>
                  <ListItemButton onClick={() => toggleUser(u.user_id)} dense>
                    {isGroup ? (
                      <Checkbox
                        edge="start"
                        checked={selected.has(u.user_id)}
                        tabIndex={-1}
                        disableRipple
                        sx={{ mr: 1 }}
                      />
                    ) : null}
                    <ListItemAvatar>
                      <Avatar
                        src={avatarUrl(u.user_id, u.avatar_uri)}
                        sx={{ width: 36, height: 36 }}
                      >
                        {u.display_name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={u.display_name}
                      secondary={u.headline}
                      primaryTypographyProps={{
                        fontWeight: selected.has(u.user_id) ? 700 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={creating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={creating || !canCreate}
          startIcon={
            creating ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          Start Conversation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewConversationDialog;
