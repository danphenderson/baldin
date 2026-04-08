import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, TextField, Box, Typography,
  Alert, List, ListItem, ListItemText, IconButton, Select, MenuItem,
  Stack, Divider, CircularProgress, alpha, useTheme, type SelectChangeEvent,
  Avatar, ListItemAvatar,
} from '@mui/material';
import { PersonAdd as PersonAddIcon, Delete as DeleteIcon, Share as ShareIcon } from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  getDocumentShares, getDocumentShareCandidates, createDocumentShare, updateDocumentShare, revokeDocumentShare,
  type DocumentShareRead, type DocumentShareCandidateRead, type DocumentShareRole,
} from '../service/documents';
import { avatarUrl } from '../service/users';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShareDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onSharesChanged?: () => void;
}

function formatPersonLabel(fullName?: string | null, email?: string | null, fallback = 'Unknown user'): string {
  return fullName?.trim() || email?.trim() || fallback;
}

function formatPersonSecondary(fullName?: string | null, email?: string | null, headline?: string | null): string | undefined {
  if (headline?.trim()) return headline;
  if (email?.trim() && email !== fullName) return email;
  return undefined;
}

function formatRoleLabel(role: DocumentShareRole): string {
  return role === 'editor' ? 'Editor' : 'Viewer';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ShareDocumentDialog: React.FC<ShareDocumentDialogProps> = ({
  open,
  documentId,
  onClose,
  onSharesChanged,
}) => {
  const theme = useTheme();
  const { token } = useContext(UserContext);

  const [shares, setShares] = useState<DocumentShareRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentShareCandidateRead[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DocumentShareCandidateRead | null>(null);
  const [newRole, setNewRole] = useState<DocumentShareRole>('viewer');
  const [sharing, setSharing] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* load current shares -------------------------------------------- */
  const refreshShares = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getDocumentShares(token, documentId);
      setShares(data ?? []);
    } catch {
      setError('Failed to load shares');
    }
    setLoading(false);
  }, [token, documentId]);

  useEffect(() => {
    if (open) {
      refreshShares();
      setError('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setNewRole('viewer');
    }
  }, [open, refreshShares]);

  /* directory search ----------------------------------------------- */
  const searchUsers = useCallback(async (query: string) => {
    if (!token || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await getDocumentShareCandidates(token, documentId, { q: query.trim(), limit: 8 });
      setSearchResults(data ?? []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, [documentId, token]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedUser(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(value), 300);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  /* create share --------------------------------------------------- */
  const handleShare = async () => {
    if (!token || !selectedUser) return;
    setSharing(true);
    setError('');
    try {
      await createDocumentShare(token, documentId, selectedUser.id, newRole);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      await refreshShares();
      onSharesChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Share failed');
    }
    setSharing(false);
  };

  /* update role ---------------------------------------------------- */
  const handleRoleChange = async (share: DocumentShareRead, role: DocumentShareRole) => {
    if (!token) return;
    try {
      await updateDocumentShare(token, documentId, share.id, role);
      await refreshShares();
      onSharesChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  /* revoke --------------------------------------------------------- */
  const handleRevoke = async (share: DocumentShareRead) => {
    if (!token) return;
    try {
      await revokeDocumentShare(token, documentId, share.id);
      await refreshShares();
      onSharesChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Revoke failed');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareIcon fontSize="small" />
        Share Document
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
        )}

        {/* ── Add share section ─────────────────────────────────── */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Add people
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth size="small"
            placeholder="Search people by name, email, or headline…"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            slotProps={{ input: { 'aria-label': 'Search users to share with' } }}
          />
          <Select
            size="small" value={newRole}
            onChange={(e: SelectChangeEvent) => setNewRole(e.target.value as 'viewer' | 'editor')}
            sx={{ minWidth: 110 }}
            aria-label="Role for new share"
          >
            <MenuItem value="viewer">Viewer</MenuItem>
            <MenuItem value="editor">Editor</MenuItem>
          </Select>
          <Button
            variant="contained" size="small"
            startIcon={<PersonAddIcon />}
            onClick={handleShare}
            disabled={!selectedUser || sharing}
            aria-label="Share document"
            sx={{ whiteSpace: 'nowrap' }}
          >
            {sharing ? 'Sharing…' : 'Share'}
          </Button>
        </Stack>

        {/* Search results dropdown */}
        {(searchResults.length > 0 || searching) && !selectedUser && (
          <Box sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1, mb: 2, maxHeight: 200, overflow: 'auto',
            background: theme.palette.background.paper,
          }}>
            {searching ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <List dense disablePadding>
                {searchResults.map(u => (
                  <ListItem
                    key={u.id}
                    component="div"
                    onClick={() => {
                      setSelectedUser(u);
                      setSearchQuery(formatPersonLabel(u.full_name, u.email, u.id));
                      setSearchResults([]);
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { background: alpha(theme.palette.primary.main, 0.06) },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={avatarUrl(u.id, u.avatar_uri)} sx={{ width: 36, height: 36 }}>
                        {formatPersonLabel(u.full_name, u.email, '?').charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={formatPersonLabel(u.full_name, u.email, u.id)}
                      secondary={formatPersonSecondary(u.full_name, u.email, u.headline)}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {selectedUser && (
          <Typography variant="caption" color="primary" sx={{ mb: 2, display: 'block' }}>
            Selected: {formatPersonLabel(selectedUser.full_name, selectedUser.email, selectedUser.id)}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* ── Current shares ────────────────────────────────────── */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          People with access
        </Typography>

        {loading ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : shares.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Not shared with anyone yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {shares.map(share => (
              <ListItem
                key={share.id}
                secondaryAction={
                  <IconButton
                    edge="end" size="small"
                    onClick={() => handleRevoke(share)}
                    aria-label="Revoke share"
                    sx={{ '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{
                  borderRadius: 1, mb: 0.5,
                  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 36, height: 36 }}>
                    {formatPersonLabel(share.shared_with_full_name, share.shared_with_email, share.shared_with_user_id).charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={formatPersonLabel(share.shared_with_full_name, share.shared_with_email, share.shared_with_user_id)}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                  secondary={
                    formatPersonSecondary(share.shared_with_full_name, share.shared_with_email, share.shared_with_headline)
                    || `Shared by ${formatPersonLabel(share.shared_by_full_name, share.shared_by_email, share.shared_by_user_id)}`
                  }
                  secondaryTypographyProps={{ variant: 'caption' }}
                  sx={{ mr: 2 }}
                />
                <Box sx={{ mr: 2, minWidth: 112, display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Shared {new Date(share.created_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Updated {new Date(share.updated_at).toLocaleDateString()}
                  </Typography>
                </Box>
                <Select
                  size="small" variant="standard"
                  value={share.role}
                  onChange={(e: SelectChangeEvent) =>
                    handleRoleChange(share, e.target.value as DocumentShareRole)
                  }
                  sx={{ minWidth: 90, mr: 1 }}
                  aria-label={`Change role for ${formatPersonLabel(share.shared_with_full_name, share.shared_with_email, share.shared_with_user_id)}`}
                >
                  <MenuItem value="viewer">{formatRoleLabel('viewer')}</MenuItem>
                  <MenuItem value="editor">{formatRoleLabel('editor')}</MenuItem>
                </Select>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDocumentDialog;
