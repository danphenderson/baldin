import React, { useContext, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Pagination as MuiPagination,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AutoAwesome as AutoAwesomeIcon,
  Check as AcceptIcon,
  Close as DeclineIcon,
  Delete as RemoveIcon,
  Lock as LockIcon,
  Mail as MessageIcon,
  Search as SearchIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getConnections,
  acceptConnection,
  declineConnection,
  deleteConnection,
  type ConnectionRead,
} from '../service/connections';
import { avatarUrl } from '../service/users';
import { createConversation } from '../service/messages';
import EmptyState from '../component/common/empty-state';

const PAGE_SIZE = 12;

type StatusFilter = 'all' | 'pending_received' | 'pending_sent' | 'accepted';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_received', label: 'Pending' },
  { value: 'pending_sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
];

const statusChipColor = (status: string): 'warning' | 'success' | 'default' | 'error' => {
  switch (status) {
    case 'pending': return 'warning';
    case 'accepted': return 'success';
    case 'declined': return 'error';
    default: return 'default';
  }
};

const ConnectionsPage: React.FC = () => {
  const { token, user, canAccessTier } = useContext(UserContext);
  const navigate = useNavigate();

  const [connections, setConnections] = useState<ConnectionRead[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const [actingId, setActingId] = useState<string | null>(null);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const notify = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getConnections(token, { page: 1, page_size: 500 });
      setConnections(res.items ?? []);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to load connections', 'error');
    }
    setLoading(false);
  }, [token, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  const currentUserId = user?.id;

  const filtered = useMemo(() => {
    return connections.filter((c) => {
      const otherUser = c.requester.user_id === currentUserId ? c.addressee : c.requester;
      const q = deferredSearch.toLowerCase().trim();
      const matchesSearch = !q || [otherUser.display_name, otherUser.headline, otherUser.city]
        .some((f) => f?.toLowerCase().includes(q));

      let matchesFilter = true;
      if (statusFilter === 'accepted') {
        matchesFilter = c.status === 'accepted';
      } else if (statusFilter === 'pending_received') {
        matchesFilter = c.status === 'pending' && c.addressee.user_id === currentUserId;
      } else if (statusFilter === 'pending_sent') {
        matchesFilter = c.status === 'pending' && c.requester.user_id === currentUserId;
      }

      return matchesSearch && matchesFilter;
    });
  }, [deferredSearch, statusFilter, connections, currentUserId]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pendingReceivedCount = useMemo(
    () => connections.filter((c) => c.status === 'pending' && c.addressee.user_id === currentUserId).length,
    [connections, currentUserId],
  );
  const acceptedCount = useMemo(
    () => connections.filter((c) => c.status === 'accepted').length,
    [connections],
  );

  useEffect(() => { setPage(1); }, [deferredSearch, statusFilter]);

  usePageToolbarHeader('Connections', `${acceptedCount} connected · ${pendingReceivedCount} pending`);

  const handleAccept = async (id: string) => {
    if (!token) return;
    setActingId(id);
    try {
      const updated = await acceptConnection(token, id);
      setConnections((prev) => prev.map((c) => (c.id === id ? updated : c)));
      notify('Connection accepted');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to accept', 'error');
    }
    setActingId(null);
  };

  const handleDecline = async (id: string) => {
    if (!token) return;
    setActingId(id);
    try {
      const updated = await declineConnection(token, id);
      setConnections((prev) => prev.map((c) => (c.id === id ? updated : c)));
      notify('Connection declined');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to decline', 'error');
    }
    setActingId(null);
  };

  const handleRemove = async (id: string) => {
    if (!token) return;
    setActingId(id);
    try {
      await deleteConnection(token, id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      notify('Connection removed');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to remove', 'error');
    }
    setActingId(null);
  };

  const handleMessage = async (otherUserId: string) => {
    if (!token) return;
    setActingId(otherUserId);
    try {
      const conv = await createConversation(token, {
        participant_user_ids: [otherUserId],
        type: 'direct',
      });
      navigate(`/network/messages/${conv.id}`);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to open conversation', 'error');
    }
    setActingId(null);
  };

  return (
    <Box>
      {/* Search + filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          placeholder="Search connections…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              variant={statusFilter === f.value ? 'filled' : 'outlined'}
              color={statusFilter === f.value ? 'primary' : 'default'}
              onClick={() => setStatusFilter(f.value)}
            />
          ))}
        </Stack>
      </Stack>

      {/* Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : paged.length === 0 ? (
        connections.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon />}
            title="No connections yet"
            description="Visit the Directory to find other job seekers or browse the dedicated superuser view."
            action={{
              label: 'Browse Superusers',
              onClick: () => navigate('/network/directory?superusers_only=true'),
              icon: <AutoAwesomeIcon />,
            }}
          />
        ) : (
          <EmptyState
            icon={<SearchIcon />}
            title="No matches"
            description="Try adjusting your search or filter criteria."
          />
        )
      ) : (
        <Grid container spacing={2}>
          {paged.map((connection) => {
            const otherUser = connection.requester.user_id === currentUserId
              ? connection.addressee
              : connection.requester;
            const location = [otherUser.city, otherUser.state, otherUser.country].filter(Boolean).join(', ');
            const isPendingReceived = connection.status === 'pending' && connection.addressee.user_id === currentUserId;
            const isPendingSent = connection.status === 'pending' && connection.requester.user_id === currentUserId;
            const isAccepted = connection.status === 'accepted';
            const acting = actingId === connection.id;
            const canMessage = canAccessTier('starter');

            return (
              <Grid key={connection.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    border: otherUser.is_superuser ? (theme) => `1px solid ${theme.palette.warning.light}` : undefined,
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={avatarUrl(otherUser.user_id, otherUser.avatar_uri)} sx={{ width: 48, height: 48 }}>
                          {otherUser.display_name.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body1" fontWeight={700} noWrap>{otherUser.display_name}</Typography>
                            {otherUser.is_superuser && (
                              <Chip
                                icon={<AutoAwesomeIcon fontSize="small" />}
                                label="Superuser"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                          {otherUser.headline && (
                            <Typography variant="body2" color="text.secondary" noWrap>{otherUser.headline}</Typography>
                          )}
                        </Box>
                        <Chip
                          label={connection.status}
                          size="small"
                          color={statusChipColor(connection.status)}
                          variant="outlined"
                        />
                      </Stack>

                      {location && (
                        <Typography variant="body2" color="text.secondary">{location}</Typography>
                      )}

                      {connection.message && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }} noWrap>
                          &ldquo;{connection.message}&rdquo;
                        </Typography>
                      )}

                      {/* Actions */}
                      <Stack direction="row" spacing={1}>
                        {isPendingReceived && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={acting ? <CircularProgress size={14} color="inherit" /> : <AcceptIcon />}
                              disabled={acting}
                              onClick={() => handleAccept(connection.id)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={acting ? <CircularProgress size={14} color="inherit" /> : <DeclineIcon />}
                              disabled={acting}
                              onClick={() => handleDecline(connection.id)}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                        {isPendingSent && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={acting ? <CircularProgress size={14} color="inherit" /> : <RemoveIcon />}
                            disabled={acting}
                            onClick={() => handleRemove(connection.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        {isAccepted && (
                          <>
                            {canMessage ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={acting ? <CircularProgress size={14} color="inherit" /> : <MessageIcon />}
                                disabled={acting}
                                onClick={() => handleMessage(otherUser.user_id)}
                              >
                                Message
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<LockIcon />}
                                onClick={() => navigate('/settings/subscription')}
                              >
                                Unlock Messages
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={acting ? <CircularProgress size={14} color="inherit" /> : <RemoveIcon />}
                              disabled={acting}
                              onClick={() => handleRemove(connection.id)}
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Pagination */}
      {!loading && pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <MuiPagination
            count={pageCount}
            page={safePage}
            onChange={(_, v) => setPage(v)}
            shape="rounded"
            sx={{ '& .MuiPaginationItem-root': { fontWeight: 600 } }}
          />
        </Box>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConnectionsPage;
