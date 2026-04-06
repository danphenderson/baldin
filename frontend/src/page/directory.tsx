import React, { useContext, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import {
  Avatar,
  Box,
  Button,
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
  AutoAwesome as AutoAwesomeIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getDirectoryUsers,
  type UserDirectoryRead,
} from '../service/directory';
import { createConnection } from '../service/connections';
import { avatarUrl } from '../service/users';
import EmptyState from '../component/common/empty-state';

const PAGE_SIZE = 12;

const PLACEMENT_FILTERS = ['all', 'active', 'graduated', 'alumni'] as const;
type PlacementFilter = typeof PLACEMENT_FILTERS[number];

const DirectoryPage: React.FC = () => {
  const { token, user, canAccessTier } = useContext(UserContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const superusersOnly = searchParams.get('superusers_only') === 'true';

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

  const setSuperuserView = useCallback((nextValue: boolean) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextValue) {
      nextParams.set('superusers_only', 'true');
    } else {
      nextParams.delete('superusers_only');
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getDirectoryUsers(token, {
        page: 1,
        page_size: 500,
        superusers_only: superusersOnly,
      });
      setUsers(res.items ?? []);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to load directory', 'error');
    }
    setLoading(false);
  }, [token, notify, superusersOnly]);

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

  usePageToolbarHeader(
    superusersOnly ? 'Superusers' : 'Directory',
    superusersOnly
      ? 'Browse discoverable superusers open to connection requests'
      : 'Find and connect with job seekers',
  );

  const canRequestConnection = useCallback((candidate: UserDirectoryRead) => (
    Boolean(candidate.is_superuser) || canAccessTier('starter')
  ), [canAccessTier]);

  const handleConnect = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!token) return;
    setConnectingId(userId);
    try {
      await createConnection(token, { addressee_id: userId });
      notify('Connection request sent');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to send request', 'error');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3, borderRadius: 4, border: (theme) => `1px solid ${theme.palette.warning.light}` }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ md: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<AutoAwesomeIcon fontSize="small" />}
                  label="Superuser Discovery"
                  color="warning"
                  size="small"
                />
                {superusersOnly && (
                  <Chip label="Filtered View" color="primary" variant="outlined" size="small" />
                )}
              </Stack>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 1.25 }}>
                Need a Baldin guide?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 560 }}>
                Discover superusers who stay visible by default and accept one-to-one
                connection requests from any authenticated account.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant={superusersOnly ? 'outlined' : 'contained'}
                onClick={() => setSuperuserView(true)}
              >
                Browse Superusers
              </Button>
              <Button
                variant="text"
                onClick={() => setSuperuserView(false)}
                disabled={!superusersOnly}
              >
                Show Everyone
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

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
            title={superusersOnly ? 'No discoverable superusers yet' : 'No users in the directory'}
            description={superusersOnly
              ? 'When a superuser keeps their network profile visible, they will appear here for individual requests.'
              : 'When users make their profiles discoverable they will appear here.'}
            action={superusersOnly
              ? { label: 'Show Everyone', onClick: () => setSuperuserView(false) }
              : undefined}
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
            const requestAllowed = canRequestConnection(u);

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
                          {u.is_superuser && (
                            <Chip
                              icon={<AutoAwesomeIcon fontSize="small" />}
                              label="Superuser"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
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
                          requestAllowed ? (
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
                          ) : (
                            <Tooltip title="Starter is required to connect with other members. Superusers stay available on every account.">
                              <span>
                                <Chip
                                  icon={<LockIcon />}
                                  label="Starter Required"
                                  variant="outlined"
                                  size="small"
                                  disabled
                                  sx={{ alignSelf: 'flex-start' }}
                                />
                              </span>
                            </Tooltip>
                          )
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
