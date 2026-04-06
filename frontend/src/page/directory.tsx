import React, { useContext, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Pagination as MuiPagination,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getDirectoryUsers,
  type UserDirectoryRead,
} from '../service/directory';
import { createConnection } from '../service/connections';
import { avatarUrl } from '../service/users';
import EmptyState from '../component/common/empty-state';
import TierGate from '../component/tier-gate';

const PAGE_SIZE = 12;

const PLACEMENT_FILTERS = ['all', 'active', 'graduated', 'alumni'] as const;
type PlacementFilter = typeof PLACEMENT_FILTERS[number];

const DirectoryPage: React.FC = () => {
  const { token, user } = useContext(UserContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserDirectoryRead[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [placementFilter, setPlacementFilter] = useState<PlacementFilter>('all');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const [connectingId, setConnectingId] = useState<string | null>(null);

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
      const res = await getDirectoryUsers(token, { page: 1, page_size: 500 });
      setUsers(res.items ?? []);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to load directory', 'error');
    }
    setLoading(false);
  }, [token, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = deferredSearch.toLowerCase().trim();
      const matchesSearch = !q || [u.display_name, u.headline, u.city, u.state, ...(u.skills_summary ?? [])]
        .some((f) => f?.toLowerCase().includes(q));
      const matchesPlacement = placementFilter === 'all' || u.placement_status === placementFilter;
      return matchesSearch && matchesPlacement;
    });
  }, [deferredSearch, placementFilter, users]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [deferredSearch, placementFilter]);

  usePageToolbarHeader('Directory', 'Find and connect with job seekers');

  const handleConnect = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!token) return;
    setConnectingId(userId);
    try {
      await createConnection(token, { addressee_id: userId });
      notify('Connection request sent');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to send request', 'error');
    }
    setConnectingId(null);
  };

  return (
    <Box>
      {/* Search + filter */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by name, headline, skills, or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          sx={{ flexGrow: 1, maxWidth: { sm: 420 } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {PLACEMENT_FILTERS.map((f) => (
            <Chip
              key={f}
              label={f.charAt(0).toUpperCase() + f.slice(1)}
              variant={placementFilter === f ? 'filled' : 'outlined'}
              color={placementFilter === f ? 'primary' : 'default'}
              onClick={() => setPlacementFilter(f)}
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
        users.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon />}
            title="No users in the directory"
            description="When users make their profiles discoverable they will appear here."
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
          {paged.map((u) => {
            const location = [u.city, u.state, u.country].filter(Boolean).join(', ');
            const isSelf = user?.id === u.user_id;

            return (
              <Grid key={u.user_id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => navigate(`/network/directory/${u.user_id}`)}>
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar src={avatarUrl(u.user_id, u.avatar_uri)} sx={{ width: 48, height: 48 }}>
                            {u.display_name.charAt(0)}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body1" fontWeight={700} noWrap>{u.display_name}</Typography>
                            {u.headline && (
                              <Typography variant="body2" color="text.secondary" noWrap>{u.headline}</Typography>
                            )}
                          </Box>
                        </Stack>

                        {location && (
                          <Typography variant="body2" color="text.secondary">{location}</Typography>
                        )}

                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={u.placement_status}
                            size="small"
                            color={u.placement_status === 'active' ? 'success' : 'default'}
                            variant="outlined"
                          />
                          {(u.skills_summary ?? []).slice(0, 3).map((skill) => (
                            <Chip key={skill} label={skill} size="small" variant="outlined" />
                          ))}
                          {(u.skills_summary ?? []).length > 3 && (
                            <Chip label={`+${(u.skills_summary ?? []).length - 3}`} size="small" variant="outlined" />
                          )}
                        </Stack>

                        {!isSelf && (
                          <TierGate
                            requiredTier="starter"
                            fallback={
                              <Tooltip title="Upgrade to Starter to connect">
                                <span>
                                  <Chip
                                    icon={<LockIcon />}
                                    label="Connect"
                                    variant="outlined"
                                    size="small"
                                    disabled
                                    sx={{ alignSelf: 'flex-start' }}
                                  />
                                </span>
                              </Tooltip>
                            }
                          >
                            <Chip
                              icon={connectingId === u.user_id ? <CircularProgress size={14} /> : <PersonAddIcon />}
                              label="Connect"
                              color="primary"
                              variant="outlined"
                              size="small"
                              disabled={connectingId === u.user_id}
                              onClick={(e) => handleConnect(e, u.user_id)}
                              sx={{ alignSelf: 'flex-start' }}
                            />
                          </TierGate>
                        )}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
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

export default DirectoryPage;
