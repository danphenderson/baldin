import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  CleaningServicesOutlined as PurgeIcon,
  DeleteOutline as DeleteIcon,
  PeopleOutline as UsersIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  StorageOutlined as DatabaseIcon,
  TableChartOutlined as TableIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  ConfirmDialog,
  EmptyState,
  MetricStrip,
  StatusChip,
  SurfaceCard as Card,
  SurfaceCardContent as CardContent,
  monoFontFamily,
} from '../design-system';
import {
  DB_MANAGEMENT_PURGE_DOMAINS,
  deleteUser,
  getDbManagementStatus,
  getDbManagementTable,
  getDbManagementTables,
  getDbManagementUsers,
  isDbManagementServiceError,
  previewUserCleanup,
  purgeUserData,
  type DbManagementPurgeDomain,
  type DbManagementStatusRead,
  type DbManagementTableDetailRead,
  type DbManagementTableSummaryRead,
  type DbManagementUserSummaryRead,
  type DbManagementUsersPage,
  type UserDataOperationPreview,
} from '../service/db-management';

const DEFAULT_USER_PAGE_SIZE = 10;

const EMPTY_USERS_PAGE: DbManagementUsersPage = {
  items: [],
  total: 0,
  page: 1,
  page_size: DEFAULT_USER_PAGE_SIZE,
};

type UserFilterValue = 'all' | 'superuser' | 'non_superuser';
type ActiveFilterValue = 'all' | 'active' | 'inactive';
type FeedbackSeverity = 'warning' | 'error';

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : 'API request failed'
);

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatDomainLabel = (domain: DbManagementPurgeDomain): string => (
  domain.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
);

const getDeleteBlockReasonMessage = (
  reason: UserDataOperationPreview['delete_block_reason'],
): string => {
  switch (reason) {
    case 'self_delete':
      return 'This account matches your current superuser session, so it cannot be deleted.';
    case 'last_remaining_superuser':
      return 'This is the last remaining superuser account, so it cannot be deleted.';
    default:
      return 'Delete is blocked by a database safeguard.';
  }
};

const getPurgeBlockReasonMessage = (
  reason: UserDataOperationPreview['purge_block_reason'],
): string => {
  switch (reason) {
    case 'self_delete':
      return 'A full purge is blocked for your own superuser account. Select specific cleanup domains instead.';
    case 'last_remaining_superuser':
      return 'A full purge is blocked for the last remaining superuser. Select specific cleanup domains instead.';
    default:
      return 'Purge is blocked by a database safeguard.';
  }
};

const totalDeletedRecords = (preview: UserDataOperationPreview | null): number => (
  Object.values(preview?.deleted_records ?? {}).reduce((sum, count) => sum + count, 0)
);

const DbManagementPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const { notify } = useNotification();

  const [status, setStatus] = useState<DbManagementStatusRead | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [tables, setTables] = useState<DbManagementTableSummaryRead[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [tableDetail, setTableDetail] = useState<DbManagementTableDetailRead | null>(null);
  const [tableDetailLoading, setTableDetailLoading] = useState(false);
  const [tableDetailError, setTableDetailError] = useState<string | null>(null);

  const [userSearchDraft, setUserSearchDraft] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [superuserFilter, setSuperuserFilter] = useState<UserFilterValue>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [userPage, setUserPage] = useState(0);
  const [userRowsPerPage, setUserRowsPerPage] = useState(DEFAULT_USER_PAGE_SIZE);
  const [users, setUsers] = useState<DbManagementUsersPage>(EMPTY_USERS_PAGE);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<DbManagementUserSummaryRead | null>(null);

  const [selectedDomains, setSelectedDomains] = useState<DbManagementPurgeDomain[]>([]);
  const [preview, setPreview] = useState<UserDataOperationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ severity: FeedbackSeverity; message: string } | null>(null);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  usePageToolbarHeader('DB Management', 'Superuser database operations');

  const filteredTables = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) => table.table_name.toLowerCase().includes(query));
  }, [tableSearch, tables]);

  const deletedRecordEntries = useMemo(() => (
    Object.entries(preview?.deleted_records ?? {})
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
  ), [preview]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      setStatus(await getDbManagementStatus(token));
    } catch (error: unknown) {
      setStatusError(getErrorMessage(error));
    } finally {
      setStatusLoading(false);
    }
  }, [token]);

  const loadTables = useCallback(async () => {
    if (!token) return;
    setTablesLoading(true);
    setTablesError(null);
    try {
      setTables(await getDbManagementTables(token));
    } catch (error: unknown) {
      setTablesError(getErrorMessage(error));
    } finally {
      setTablesLoading(false);
    }
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const nextPage = await getDbManagementUsers(token, {
        q: userSearch.trim() || undefined,
        is_superuser: superuserFilter === 'all' ? undefined : superuserFilter === 'superuser',
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
        page: userPage + 1,
        page_size: userRowsPerPage,
        request_count: true,
      });
      setUsers(nextPage);
    } catch (error: unknown) {
      setUsersError(getErrorMessage(error));
      setUsers(EMPTY_USERS_PAGE);
    } finally {
      setUsersLoading(false);
    }
  }, [activeFilter, superuserFilter, token, userPage, userRowsPerPage, userSearch]);

  const loadTableDetail = useCallback(async (tableName: string) => {
    if (!token) return;
    setSelectedTableName(tableName);
    setTableDetailLoading(true);
    setTableDetailError(null);
    try {
      setTableDetail(await getDbManagementTable(token, tableName));
    } catch (error: unknown) {
      setTableDetail(null);
      setTableDetailError(getErrorMessage(error));
    } finally {
      setTableDetailLoading(false);
    }
  }, [token]);

  const loadPreview = useCallback(async (user: DbManagementUserSummaryRead, domains: DbManagementPurgeDomain[]) => {
    if (!token) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      setPreview(await previewUserCleanup(
        token,
        user.user_id,
        domains.length > 0 ? domains : undefined,
      ));
    } catch (error: unknown) {
      setPreview(null);
      setPreviewError(getErrorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedUser) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    setActionFeedback(null);
    void loadPreview(selectedUser, selectedDomains);
  }, [loadPreview, selectedDomains, selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;
    const updatedUser = users.items.find((user) => user.user_id === selectedUser.user_id);
    if (updatedUser) {
      setSelectedUser(updatedUser);
    }
  }, [selectedUser, users.items]);

  const handleUserSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserPage(0);
    setUserSearch(userSearchDraft);
  };

  const handleSuperuserFilterChange = (event: SelectChangeEvent<UserFilterValue>) => {
    setUserPage(0);
    setSuperuserFilter(event.target.value as UserFilterValue);
  };

  const handleActiveFilterChange = (event: SelectChangeEvent<ActiveFilterValue>) => {
    setUserPage(0);
    setActiveFilter(event.target.value as ActiveFilterValue);
  };

  const handleSelectUser = (user: DbManagementUserSummaryRead) => {
    setSelectedUser(user);
    setSelectedDomains([]);
    setActionFeedback(null);
  };

  const handleDomainToggle = (domain: DbManagementPurgeDomain, checked: boolean) => {
    setSelectedDomains((current) => {
      if (checked) {
        return current.includes(domain) ? current : [...current, domain];
      }
      return current.filter((currentDomain) => currentDomain !== domain);
    });
  };

  const handleRefreshAll = async () => {
    await Promise.all([loadStatus(), loadTables(), loadUsers()]);
    if (selectedUser) {
      await loadPreview(selectedUser, selectedDomains);
    }
  };

  const handleConfirmPurge = async () => {
    if (!token || !selectedUser) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await purgeUserData(token, selectedUser.user_id, selectedDomains.length > 0 ? selectedDomains : undefined);
      setPurgeDialogOpen(false);
      notify(`Purged data for ${selectedUser.email}`);
      await loadUsers();
      await loadPreview(selectedUser, selectedDomains);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      const severity = isDbManagementServiceError(error) && error.status === 409 ? 'warning' : 'error';
      setActionFeedback({ severity, message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !selectedUser) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await deleteUser(token, selectedUser.user_id);
      const deletedEmail = selectedUser.email;
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      setSelectedDomains([]);
      setPreview(null);
      notify(`Deleted ${deletedEmail}`);
      await loadUsers();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      const severity = isDbManagementServiceError(error) && error.status === 409 ? 'warning' : 'error';
      setActionFeedback({ severity, message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>DB Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Inspect schema state and run guarded user cleanup operations.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { void handleRefreshAll(); }}
            disabled={statusLoading || tablesLoading || usersLoading || actionLoading}
          >
            Refresh
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DatabaseIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Overview</Typography>
              </Box>
              {statusError && (
                <Alert
                  severity="error"
                  action={(
                    <Button color="inherit" size="small" onClick={() => { void loadStatus(); }}>
                      Retry
                    </Button>
                  )}
                >
                  {statusError}
                </Alert>
              )}
              {statusLoading ? (
                <Stack spacing={1}>
                  <Skeleton variant="rounded" height={86} />
                  <Skeleton variant="rounded" height={42} />
                </Stack>
              ) : status ? (
                <>
                  <MetricStrip
                    variant="card"
                    items={[
                      { label: 'Current revision', value: status.current_revision ?? 'Unknown' },
                      { label: 'Head revision', value: status.head_revision ?? 'Unknown' },
                      { label: 'At head', value: status.is_at_head ? 'Yes' : 'No', color: status.is_at_head ? theme.palette.success.main : theme.palette.warning.main },
                      { label: 'Public tables', value: status.public_table_count, icon: <TableIcon fontSize="small" /> },
                    ]}
                  />
                  {!status.is_at_head && (
                    <Alert severity="warning">
                      Database schema is behind the repo head. Migrations may need attention before destructive admin work.
                    </Alert>
                  )}
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Tables</Typography>
              </Box>

              <TextField
                label="Search tables"
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                size="small"
                sx={{ maxWidth: 360 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              {tablesError && (
                <Alert
                  severity="error"
                  action={(
                    <Button color="inherit" size="small" onClick={() => { void loadTables(); }}>
                      Retry
                    </Button>
                  )}
                >
                  {tablesError}
                </Alert>
              )}

              {tablesLoading ? (
                <Stack spacing={1}>
                  <Skeleton variant="rounded" height={220} />
                </Stack>
              ) : filteredTables.length === 0 ? (
                <EmptyState
                  icon={<TableIcon />}
                  title="No matching tables"
                  description="Adjust the table search or refresh schema metadata."
                  layout="section"
                  compact
                />
              ) : (
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)' } }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Table</TableCell>
                          <TableCell align="right">Columns</TableCell>
                          <TableCell align="right">Rows</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredTables.map((table) => {
                          const selected = table.table_name === selectedTableName;
                          return (
                            <TableRow
                              key={table.table_name}
                              hover
                              selected={selected}
                              onClick={() => { void loadTableDetail(table.table_name); }}
                              sx={{
                                cursor: 'pointer',
                                '&.Mui-selected': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                },
                              }}
                            >
                              <TableCell sx={{ fontFamily: monoFontFamily }}>{table.table_name}</TableCell>
                              <TableCell align="right">{table.column_count}</TableCell>
                              <TableCell align="right">{table.row_count.toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Card sx={{ minHeight: 320 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={700}>Table Detail</Typography>
                        {tableDetailError && (
                          <Alert severity="error">{tableDetailError}</Alert>
                        )}
                        {tableDetailLoading ? (
                          <Skeleton variant="rounded" height={220} />
                        ) : tableDetail ? (
                          <>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body1" fontWeight={700} sx={{ fontFamily: monoFontFamily }}>
                                {tableDetail.table_name}
                              </Typography>
                              <StatusChip label={`${tableDetail.row_count.toLocaleString()} rows`} color="info" />
                            </Stack>
                            <Divider />
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Type</TableCell>
                                  <TableCell>Nullable</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {tableDetail.columns?.map((column) => (
                                  <TableRow key={column.name}>
                                    <TableCell sx={{ fontFamily: monoFontFamily }}>{column.name}</TableCell>
                                    <TableCell>{column.data_type}</TableCell>
                                    <TableCell>{column.is_nullable ? 'Yes' : 'No'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </>
                        ) : (
                          <EmptyState
                            icon={<TableIcon />}
                            title="Select a table"
                            description="Choose a table to inspect its columns and row count."
                            layout="section"
                            compact
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <UsersIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Users</Typography>
              </Box>

              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.3fr) minmax(360px, 0.7fr)' } }}>
                <Stack spacing={2}>
                  <Box component="form" onSubmit={handleUserSearchSubmit} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <TextField
                      label="Search users"
                      value={userSearchDraft}
                      onChange={(event) => setUserSearchDraft(event.target.value)}
                      size="small"
                      sx={{ minWidth: 260, flex: '1 1 260px' }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={superuserFilter}
                        label="Role"
                        onChange={handleSuperuserFilterChange}
                      >
                        <MenuItem value="all">All users</MenuItem>
                        <MenuItem value="superuser">Superusers</MenuItem>
                        <MenuItem value="non_superuser">Non-superusers</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={activeFilter}
                        label="Status"
                        onChange={handleActiveFilterChange}
                      >
                        <MenuItem value="all">All statuses</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                    <Button type="submit" variant="contained">Search</Button>
                  </Box>

                  {usersError && (
                    <Alert
                      severity="error"
                      action={(
                        <Button color="inherit" size="small" onClick={() => { void loadUsers(); }}>
                          Retry
                        </Button>
                      )}
                    >
                      {usersError}
                    </Alert>
                  )}

                  {usersLoading ? (
                    <Skeleton variant="rounded" height={360} />
                  ) : users.items.length === 0 ? (
                    <EmptyState
                      icon={<UsersIcon />}
                      title="No matching users"
                      description="Try a broader query or clear the current admin filters."
                      layout="section"
                      compact
                    />
                  ) : (
                    <>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>User</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Discoverability</TableCell>
                              <TableCell>Created</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {users.items.map((user) => {
                              const selected = user.user_id === selectedUser?.user_id;
                              return (
                                <TableRow
                                  key={user.user_id}
                                  hover
                                  selected={selected}
                                  onClick={() => handleSelectUser(user)}
                                  sx={{
                                    cursor: 'pointer',
                                    '&.Mui-selected': {
                                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                  }}
                                >
                                  <TableCell>
                                    <Stack spacing={0.5}>
                                      <Typography variant="body2" fontWeight={700}>{user.display_name}</Typography>
                                      <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell>
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                                      <StatusChip label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? 'success' : 'default'} />
                                      {user.is_superuser && <StatusChip label="Superuser" color="warning" />}
                                    </Stack>
                                  </TableCell>
                                  <TableCell>{user.is_discoverable ? 'Visible' : 'Hidden'}</TableCell>
                                  <TableCell>{formatDateTime(user.created_at)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        component="div"
                        count={users.total}
                        page={userPage}
                        onPageChange={(_event, nextPage) => setUserPage(nextPage)}
                        rowsPerPage={userRowsPerPage}
                        onRowsPerPageChange={(event) => {
                          setUserRowsPerPage(Number(event.target.value));
                          setUserPage(0);
                        }}
                        rowsPerPageOptions={[10, 20, 50]}
                      />
                    </>
                  )}
                </Stack>

                <Card sx={{ minHeight: 420 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="subtitle1" fontWeight={700}>Cleanup Preview</Typography>
                      {!selectedUser ? (
                        <EmptyState
                          icon={<UsersIcon />}
                          title="Select a user"
                          description="Choose a user to preview cleanup counts, blocked safeguards, and destructive actions."
                          layout="section"
                          compact
                        />
                      ) : (
                        <>
                          <Stack spacing={1}>
                            <Typography variant="body1" fontWeight={700}>{selectedUser.display_name}</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <StatusChip label={selectedUser.is_active ? 'Active' : 'Inactive'} color={selectedUser.is_active ? 'success' : 'default'} />
                              {selectedUser.is_superuser && <StatusChip label="Superuser" color="warning" />}
                              <StatusChip label={selectedUser.is_discoverable ? 'Discoverable' : 'Hidden'} color={selectedUser.is_discoverable ? 'info' : 'default'} />
                            </Stack>
                          </Stack>

                          <Divider />

                          <Stack spacing={1}>
                            <Typography variant="body2" fontWeight={700}>Cleanup domains</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Leave all unchecked to preview the full purge scope.
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                              {DB_MANAGEMENT_PURGE_DOMAINS.map((domain) => (
                                <FormControlLabel
                                  key={domain}
                                  control={(
                                    <Checkbox
                                      checked={selectedDomains.includes(domain)}
                                      onChange={(event) => handleDomainToggle(domain, event.target.checked)}
                                    />
                                  )}
                                  label={formatDomainLabel(domain)}
                                />
                              ))}
                            </Box>
                          </Stack>

                          {previewLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                              <CircularProgress size={28} />
                            </Box>
                          ) : previewError ? (
                            <Alert
                              severity="error"
                              action={(
                                <Button color="inherit" size="small" onClick={() => { void loadPreview(selectedUser, selectedDomains); }}>
                                  Retry
                                </Button>
                              )}
                            >
                              {previewError}
                            </Alert>
                          ) : preview ? (
                            <>
                              <MetricStrip
                                variant="card"
                                items={[
                                  { label: 'Domains', value: preview.domains?.length ?? 0 },
                                  { label: 'Profile fields', value: preview.cleared_profile_fields ?? 0 },
                                  { label: 'Deleted records', value: totalDeletedRecords(preview) },
                                  { label: 'Delete allowed', value: preview.delete_allowed ? 'Yes' : 'No', color: preview.delete_allowed ? theme.palette.success.main : theme.palette.warning.main },
                                ]}
                              />

                              {!preview.delete_allowed && preview.delete_block_reason && (
                                <Alert severity="warning">
                                  {getDeleteBlockReasonMessage(preview.delete_block_reason)}
                                </Alert>
                              )}

                              {!preview.purge_allowed && preview.purge_block_reason && (
                                <Alert severity="warning">
                                  {getPurgeBlockReasonMessage(preview.purge_block_reason)}
                                </Alert>
                              )}

                              {actionFeedback && (
                                <Alert severity={actionFeedback.severity}>
                                  {actionFeedback.message}
                                </Alert>
                              )}

                              <Stack spacing={1}>
                                <Typography variant="body2" fontWeight={700}>Deleted record counts</Typography>
                                {deletedRecordEntries.length === 0 ? (
                                  <Typography variant="body2" color="text.secondary">
                                    No related records would be removed for the current scope.
                                  </Typography>
                                ) : (
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Collection</TableCell>
                                        <TableCell align="right">Records</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {deletedRecordEntries.map(([key, count]) => (
                                        <TableRow key={key}>
                                          <TableCell>{key}</TableCell>
                                          <TableCell align="right">{count.toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </Stack>

                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <Button
                                  variant="contained"
                                  color="warning"
                                  startIcon={<PurgeIcon />}
                                  disabled={actionLoading || !preview.purge_allowed}
                                  onClick={() => setPurgeDialogOpen(true)}
                                >
                                  Purge Data
                                </Button>
                                <Button
                                  variant="contained"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  disabled={actionLoading || !preview.delete_allowed}
                                  onClick={() => setDeleteDialogOpen(true)}
                                >
                                  Delete User
                                </Button>
                              </Stack>
                            </>
                          ) : null}
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <ConfirmDialog
        open={purgeDialogOpen}
        title="Purge user data?"
        confirmLabel="Purge data"
        loading={actionLoading}
        onCancel={() => setPurgeDialogOpen(false)}
        onConfirm={() => { void handleConfirmPurge(); }}
        message={(
          <Stack spacing={1}>
            <Typography variant="body2">
              This clears data for <strong>{selectedUser?.email}</strong> without deleting the user row.
            </Typography>
            <Typography variant="body2">
              Scope: {selectedDomains.length > 0 ? selectedDomains.map(formatDomainLabel).join(', ') : 'All cleanup domains'}
            </Typography>
            <Typography variant="body2">
              Estimated deleted records: {totalDeletedRecords(preview)}
            </Typography>
          </Stack>
        )}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete user account?"
        confirmLabel="Delete user"
        loading={actionLoading}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => { void handleConfirmDelete(); }}
        message={(
          <Stack spacing={1}>
            <Typography variant="body2">
              This permanently removes <strong>{selectedUser?.email}</strong> and all owned data included in the preview.
            </Typography>
            <Typography variant="body2">
              Estimated deleted records: {totalDeletedRecords(preview)}
            </Typography>
          </Stack>
        )}
      />
    </Box>
  );
};

export default DbManagementPage;
