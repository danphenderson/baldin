import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Skeleton, Alert, Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Hub as PipelineIcon, PlayArrow as RunIcon, Delete as DeleteIcon,
  Add as AddIcon, Refresh as RefreshIcon, CheckCircle as SuccessIcon,
  Error as ErrorIcon, HourglassEmpty as PendingIcon, Loop as RunningIcon,
  Visibility as ViewIcon, Edit as EditIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  type OrchestrationEventRead,
  type OrchestrationEventStatus,
  type OrchestrationPipelineRead,
  getOrchestrationPipelines, createOrchestrationPipeline, deleteOrchestrationPipeline,
  getOrchestrationPipeline, getOrchestrationEvents, createOrchestrationEvent,
  updateOrchestrationPipeline, updateOrchestrationEvent,
} from '../service/data-orchestration';

type PipelineFormState = {
  name: string;
  description: string;
  definition: string;
};

type TriggerEventFormState = {
  message: string;
  payload: string;
  pipeline_id: string;
};

type EditPipelineFormState = {
  id: string;
  name: string;
  description: string;
  definition: string;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'API request failed';
};

const statusConfig: Record<OrchestrationEventStatus, { icon: React.ReactNode; color: string }> = {
  success: { icon: <SuccessIcon fontSize="small" />, color: '#10b981' },
  failure: { icon: <ErrorIcon fontSize="small" />, color: '#f43f5e' },
  pending: { icon: <PendingIcon fontSize="small" />, color: '#f59e0b' },
  running: { icon: <RunningIcon fontSize="small" />, color: '#06b6d4' },
};

const PipelinesPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const [pipelines, setPipelines] = useState<OrchestrationPipelineRead[]>([]);
  const [events, setEvents] = useState<OrchestrationEventRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<OrchestrationPipelineRead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPipeline, setNewPipeline] = useState<PipelineFormState>({ name: '', description: '', definition: '{}' });
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [triggerForm, setTriggerForm] = useState<TriggerEventFormState>({ message: '', payload: '{}', pipeline_id: '' });
  const [editPipeOpen, setEditPipeOpen] = useState(false);
  const [editPipeForm, setEditPipeForm] = useState<EditPipelineFormState | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pipes, evts] = await Promise.all([getOrchestrationPipelines(token), getOrchestrationEvents(token)]);
      setPipelines(pipes || []);
      setEvents(evts || []);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!token) return;
    try {
      await createOrchestrationPipeline(token, {
        ...newPipeline,
        definition: JSON.parse(newPipeline.definition),
      });
      setCreateOpen(false);
      setNewPipeline({ name: '', description: '', definition: '{}' });
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try { await deleteOrchestrationPipeline(token, id); refresh(); }
    catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleTrigger = async () => {
    if (!token) return;
    try {
      await createOrchestrationEvent(token, {
        ...triggerForm,
        payload: JSON.parse(triggerForm.payload) as Record<string, unknown>,
        status: 'pending',
      });
      setTriggerOpen(false);
      setTriggerForm({ message: '', payload: '{}', pipeline_id: '' });
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const viewPipeline = async (pipeline: OrchestrationPipelineRead) => {
    if (!token) return;
    try {
      const detail = await getOrchestrationPipeline(token, pipeline.id);
      setSelectedPipeline(detail);
      setDetailOpen(true);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleUpdatePipeline = async () => {
    if (!token || !editPipeForm?.id) return;
    try {
      await updateOrchestrationPipeline(token, editPipeForm.id, {
        name: editPipeForm.name,
        description: editPipeForm.description,
        definition: typeof editPipeForm.definition === 'string' ? JSON.parse(editPipeForm.definition) : editPipeForm.definition,
      });
      setEditPipeOpen(false);
      setEditPipeForm(null);
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleUpdateEventStatus = async (eventId: string, newStatus: OrchestrationEventStatus) => {
    if (!token) return;
    try {
      await updateOrchestrationEvent(token, eventId, { status: newStatus });
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Pipelines</Typography>
          <Typography variant="body2" color="text.secondary">
            {pipelines.length} pipelines &middot; {events.length} events
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh"><IconButton onClick={refresh} sx={{ border: `1px solid ${theme.palette.divider}` }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<RunIcon />} onClick={() => setTriggerOpen(true)}>Trigger Event</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New Pipeline</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={2}>
          {[1,2,3].map(i => <Grid item xs={12} md={4} key={i}><Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {/* Pipelines */}
          <Grid item xs={12} md={5}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>PIPELINES</Typography>
            {pipelines.length === 0 ? (
              <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
                <PipelineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">No pipelines yet</Typography>
              </CardContent></Card>
            ) : (
              <Stack spacing={2}>
                {pipelines.map((pipe) => (
                  <Card key={pipe.id} sx={{ cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.3) } }}
                    onClick={() => viewPipeline(pipe)}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>{pipe.name}</Typography>
                          {pipe.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{pipe.description}</Typography>}
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="View"><IconButton size="small"><ViewIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={(e) => {
                              e.stopPropagation();
                              setEditPipeForm({
                                id: pipe.id,
                                name: pipe.name ?? '',
                                description: pipe.description ?? '',
                                definition: JSON.stringify(pipe.definition ?? {}, null, 2),
                              });
                              setEditPipeOpen(true);
                            }}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Trigger">
                            <IconButton size="small" color="primary" onClick={(e) => {
                              e.stopPropagation();
                              setTriggerForm({ ...triggerForm, pipeline_id: pipe.id });
                              setTriggerOpen(true);
                            }}><RunIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(pipe.id); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Recent Events */}
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>RECENT EVENTS</Typography>
            {events.length === 0 ? (
              <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No events yet</Typography>
              </CardContent></Card>
            ) : (
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    {events.slice(0, 20).map((evt) => {
                      const statusKey = evt.status ?? 'pending';
                      const status = statusConfig[statusKey];
                      return (
                        <Box key={evt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                          <Box sx={{ color: status.color }}>{status.icon}</Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={500} noWrap>{evt.message || 'Event'}</Typography>
                            <Typography variant="caption" color="text.secondary">{evt.pipeline_id ? `Pipeline: ${evt.pipeline_id.substring(0, 8)}...` : ''}</Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            {(['success', 'failure', 'pending', 'running'] as const).filter(s => s !== evt.status).map((s) => (
                              <Tooltip key={s} title={`Mark ${s}`}>
                                <IconButton size="small" sx={{ color: statusConfig[s].color }} onClick={() => handleUpdateEventStatus(evt.id, s)}>
                                  {statusConfig[s].icon}
                                </IconButton>
                              </Tooltip>
                            ))}
                          </Stack>
                          <Chip label={evt.status} size="small" sx={{ backgroundColor: alpha(status.color, 0.15), color: status.color, fontSize: '0.7rem' }} />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Create Pipeline Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Create Pipeline</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Name" value={newPipeline.name} onChange={e => setNewPipeline(p => ({ ...p, name: e.target.value }))} />
            <TextField fullWidth label="Description" value={newPipeline.description} onChange={e => setNewPipeline(p => ({ ...p, description: e.target.value }))} />
            <TextField fullWidth label="Definition (JSON)" multiline rows={4} value={newPipeline.definition} onChange={e => setNewPipeline(p => ({ ...p, definition: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Trigger Event Dialog */}
      <Dialog open={triggerOpen} onClose={() => setTriggerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Trigger Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Message" value={triggerForm.message} onChange={e => setTriggerForm(p => ({ ...p, message: e.target.value }))} />
            <TextField fullWidth label="Pipeline ID" value={triggerForm.pipeline_id} onChange={e => setTriggerForm(p => ({ ...p, pipeline_id: e.target.value }))} />
            <TextField fullWidth label="Payload (JSON)" multiline rows={4} value={triggerForm.payload} onChange={e => setTriggerForm(p => ({ ...p, payload: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setTriggerOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<RunIcon />} onClick={handleTrigger}>Trigger</Button>
        </DialogActions>
      </Dialog>

      {/* Pipeline Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>{selectedPipeline?.name || 'Pipeline'}</DialogTitle>
        <DialogContent>
          {selectedPipeline && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">{selectedPipeline.description}</Typography>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">DEFINITION</Typography>
              <Box sx={{ p: 2, borderRadius: 2, background: alpha(theme.palette.text.primary, 0.04), fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'auto', maxHeight: 200 }}>
                {JSON.stringify(selectedPipeline.definition, null, 2)}
              </Box>
              {selectedPipeline.events?.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">EVENTS ({selectedPipeline.events.length})</Typography>
                  <Stack spacing={1}>
                    {selectedPipeline.events.map((evt) => {
                      const statusKey = evt.status ?? 'pending';
                      const status = statusConfig[statusKey];
                      return (
                        <Box key={evt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
                          <Box sx={{ color: status.color }}>{status.icon}</Box>
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>{evt.message}</Typography>
                          <Chip label={evt.status} size="small" sx={{ backgroundColor: alpha(status.color, 0.15), color: status.color }} />
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Pipeline Dialog */}
      <Dialog open={editPipeOpen} onClose={() => setEditPipeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Edit Pipeline</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Name" value={editPipeForm?.name || ''} onChange={e => setEditPipeForm((p) => p ? ({ ...p, name: e.target.value }) : p)} />
            <TextField fullWidth label="Description" value={editPipeForm?.description || ''} onChange={e => setEditPipeForm((p) => p ? ({ ...p, description: e.target.value }) : p)} />
            <TextField fullWidth label="Definition (JSON)" multiline rows={4} value={editPipeForm?.definition || '{}'} onChange={e => setEditPipeForm((p) => p ? ({ ...p, definition: e.target.value }) : p)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditPipeOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdatePipeline}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelinesPage;
