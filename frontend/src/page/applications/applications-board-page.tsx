import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField, useTheme, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Skeleton, Alert, Fade, Menu, MenuItem,
  useMediaQuery,
} from '@mui/material';
import {
  Delete as DeleteIcon, Refresh as RefreshIcon,
  ArrowForward as ArrowIcon,
  WorkOutline as WorkIcon, Assignment as AssignmentIcon,
  LocationOn as LocationIcon, AttachMoney as SalaryIcon,
  Warning as WarningIcon, Schedule as ScheduleIcon,
  Block as RejectIcon, Undo as WithdrawIcon,
  Description as DocIcon, DragIndicator as DragIcon, SwapHoriz as MoveIcon,
} from '@mui/icons-material';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import type { ApplicationRead } from '../../service/applications';
import { getStatusColors } from '../../theme/status-colors';
import { PageTitle } from '../../component/common/text';
import {
  useApplications, useStageColumns, COLUMN_EMPTY_HINTS, relativeDate, nextStage,
  applicationDocumentCount,
  type Column, type Outcome,
} from './use-applications';

/* ------------------------------------------------------------------ */
/*  ApplicationCard                                                    */
/* ------------------------------------------------------------------ */

type BoardStatus = Exclude<ApplicationRead['status'], null | undefined>;

const BOARD_EMPTY_HINTS: Record<string, string> = {
  registered: 'Registered applications stay here until you are ready to work them in the pipeline.',
  ...COLUMN_EMPTY_HINTS,
  rejected: 'Drop here or use Move to mark an application as rejected.',
  withdrawn: 'Drop here or use Move to mark an application as withdrawn.',
};

function boardStatusKey(app: ApplicationRead): BoardStatus {
  return ((app.outcome ?? app.stage ?? app.status ?? 'applied') as string).toLowerCase() as BoardStatus;
}

function laneId(status: BoardStatus): string {
  return `lane:${status}`;
}

function statusFromLaneId(id: string | null | undefined): BoardStatus | null {
  if (!id || !id.startsWith('lane:')) return null;
  return id.slice('lane:'.length) as BoardStatus;
}

interface AppCardProps {
  app: ApplicationRead;
  column: Column;
  onView: (app: ApplicationRead) => void;
  onAdvance: (app: ApplicationRead) => void;
  onClose: (app: ApplicationRead, outcome: Outcome) => void;
  onDelete: (app: ApplicationRead) => void;
  onMove: (app: ApplicationRead, targetStatus: BoardStatus) => void;
  onReminderSave: (app: ApplicationRead, reminder: Pick<ApplicationRead, 'next_step' | 'next_step_due'>) => Promise<ApplicationRead>;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const ApplicationCard: React.FC<AppCardProps> = ({
  app,
  column,
  onView,
  onAdvance,
  onClose,
  onDelete,
  onMove,
  onReminderSave,
  dragHandleProps,
  isDragging = false,
}) => {
  const theme = useTheme();
  const { columns: stageColumns, allStatusColumns } = useStageColumns();
  const lead = app.lead;
  const companyName = lead?.companies?.[0]?.name;
  const currentStatus = boardStatusKey(app);
  const isRegistered = column.key === 'registered';
  const isClosedStatus = currentStatus === 'rejected' || currentStatus === 'withdrawn';
  const canAdvance = nextStage(column.key) !== null;
  const isOverdue = !!(app.next_step_due && new Date(app.next_step_due) < new Date());
  const hasReminder = Boolean(app.next_step || app.next_step_due);
  const documentCount = applicationDocumentCount(app);
  const moveTargets = allStatusColumns.filter((option) => option.key !== currentStatus) as Column[];
  const [editingReminder, setEditingReminder] = useState(false);
  const [draftNextStep, setDraftNextStep] = useState(app.next_step ?? '');
  const [draftNextStepDue, setDraftNextStepDue] = useState(app.next_step_due ? app.next_step_due.slice(0, 10) : '');
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const [moveAnchorEl, setMoveAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!editingReminder) {
      setDraftNextStep(app.next_step ?? '');
      setDraftNextStepDue(app.next_step_due ? app.next_step_due.slice(0, 10) : '');
      setReminderError('');
    }
  }, [app.next_step, app.next_step_due, editingReminder]);

  const currentNextStep = app.next_step ?? '';
  const currentNextStepDue = app.next_step_due ? app.next_step_due.slice(0, 10) : '';
  const trimmedNextStep = draftNextStep.trim();
  const reminderDueLabel = app.next_step_due ? new Date(app.next_step_due).toLocaleDateString() : null;
  const reminderDirty = trimmedNextStep !== currentNextStep || draftNextStepDue !== currentNextStepDue;

  const openMoveMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMoveAnchorEl(event.currentTarget);
  };

  const selectMoveTarget = (targetStatus: BoardStatus) => (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMoveAnchorEl(null);
    onMove(app, targetStatus);
  };

  const startEditingReminder = (event: React.MouseEvent) => {
    event.stopPropagation();
    setReminderError('');
    setEditingReminder(true);
  };

  const cancelEditingReminder = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDraftNextStep(app.next_step ?? '');
    setDraftNextStepDue(app.next_step_due ? app.next_step_due.slice(0, 10) : '');
    setReminderError('');
    setEditingReminder(false);
  };

  const saveReminder = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!reminderDirty) {
      setEditingReminder(false);
      return;
    }

    setSavingReminder(true);
    setReminderError('');
    try {
      await onReminderSave(app, {
        next_step: trimmedNextStep || null,
        next_step_due: draftNextStepDue ? `${draftNextStepDue}T00:00:00` : null,
      });
      setEditingReminder(false);
    } catch (error: unknown) {
      setReminderError(error instanceof Error ? error.message : 'Failed to update reminder');
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <Card
      onClick={() => onView(app)}
      sx={{
        cursor: 'pointer',
        opacity: isDragging ? 0.6 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 6px 20px ${alpha(column.color, 0.18)}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${lead?.title || 'application'} details`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(app); } }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="body2" fontWeight={700} noWrap sx={{ mb: 0.25 }}>
          {lead?.title || 'Untitled Position'}
        </Typography>

        {companyName && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.75 }}>
            {companyName}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {lead?.location && (
            <Chip
              icon={<LocationIcon sx={{ fontSize: '0.75rem !important' }} />}
              label={lead.location}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 22, '& .MuiChip-icon': { ml: 0.5, mr: -0.25 } }}
            />
          )}
          {lead?.salary && (
            <Chip
              icon={<SalaryIcon sx={{ fontSize: '0.75rem !important' }} />}
              label={lead.salary}
              size="small"
              variant="outlined"
              color="success"
              sx={{ fontSize: '0.65rem', height: 22, '& .MuiChip-icon': { ml: 0.5, mr: -0.25 } }}
            />
          )}
          <Chip
            icon={<DocIcon sx={{ fontSize: '0.75rem !important' }} />}
            label={`${documentCount} doc${documentCount === 1 ? '' : 's'}`}
            size="small"
            variant={documentCount > 0 ? 'filled' : 'outlined'}
            sx={{
              fontSize: '0.65rem',
              height: 22,
              bgcolor: documentCount > 0 ? alpha(theme.palette.primary.main, 0.12) : undefined,
              color: documentCount > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
              '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
            }}
          />
        </Stack>

        <Box sx={{ mb: 0.75 }}>
          {editingReminder ? (
            <Box
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04),
              }}
            >
              <Stack spacing={1}>
                <TextField
                  label="Reminder next step"
                  size="small"
                  value={draftNextStep}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setDraftNextStep(event.target.value)}
                />
                <TextField
                  label="Reminder due date"
                  type="date"
                  size="small"
                  value={draftNextStepDue}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setDraftNextStepDue(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                {reminderError && <Alert severity="error">{reminderError}</Alert>}
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={cancelEditingReminder} disabled={savingReminder}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={saveReminder} disabled={savingReminder}>
                    {savingReminder ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ) : (
            <>
              {isOverdue && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.75,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                  }}
                >
                  <WarningIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />
                  <Typography variant="caption" fontWeight={600} color="warning.main" noWrap sx={{ fontSize: '0.7rem' }}>
                    Overdue{app.next_step ? ` · ${app.next_step}` : ''}
                  </Typography>
                </Box>
              )}
              {!isOverdue && hasReminder && (
                <Stack spacing={0.25} sx={{ mb: 0.75 }}>
                  {(app.next_step || app.next_step_due) && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <ScheduleIcon sx={{ fontSize: '0.7rem', color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
                        {app.next_step || 'Reminder scheduled'}
                      </Typography>
                    </Stack>
                  )}
                  {reminderDueLabel && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', ml: 2.3 }}>
                      Due {reminderDueLabel}
                    </Typography>
                  )}
                </Stack>
              )}
              <Box onClick={(event) => event.stopPropagation()} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={startEditingReminder}
                  aria-label={`${hasReminder ? 'Edit' : 'Add'} reminder for ${lead?.title || 'application'}`}
                  sx={{ px: 0, minWidth: 0, fontSize: '0.72rem', textTransform: 'none' }}
                >
                  {hasReminder ? 'Edit reminder' : 'Add reminder'}
                </Button>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
            {relativeDate(app.created_at)}
          </Typography>

          <Stack
            className="card-actions"
            direction="row"
            spacing={0}
            alignItems="center"
          >
            <Tooltip title="Move to another lane">
              <IconButton
                size="small"
                aria-label={`Move ${lead?.title || 'application'} to another lane`}
                onClick={openMoveMenu}
                sx={{ p: 0.5 }}
              >
                <MoveIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
            {dragHandleProps && (
              <Tooltip title="Drag to another lane">
                <Box
                  component="span"
                  onClick={(event) => event.stopPropagation()}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.5,
                    color: theme.palette.text.secondary,
                    cursor: 'grab',
                    touchAction: 'none',
                    borderRadius: 1,
                    '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) },
                  }}
                  {...dragHandleProps}
                >
                  <DragIcon sx={{ fontSize: '0.95rem' }} />
                </Box>
              </Tooltip>
            )}
            {isRegistered && canAdvance ? (
              <Tooltip title="Move to Applied and start tracking">
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowIcon sx={{ fontSize: '0.75rem !important' }} />}
                  onClick={(e) => { e.stopPropagation(); onAdvance(app); }}
                  aria-label="Add to pipeline"
                  sx={{
                    fontSize: '0.7rem',
                    px: 1,
                    py: 0.25,
                    minHeight: 0,
                    lineHeight: 1.5,
                    borderRadius: 1.5,
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': { borderColor: theme.palette.primary.dark, bgcolor: alpha(theme.palette.primary.main, 0.07) },
                  }}
                >
                  Add to Pipeline
                </Button>
              </Tooltip>
            ) : !isClosedStatus && canAdvance ? (
              <Tooltip title={`Move to ${stageColumns[stageColumns.findIndex((c) => c.key === column.key) + 1]?.label}`}>
                <IconButton
                  size="small"
                  color="primary"
                  aria-label="Advance application"
                  onClick={(e) => { e.stopPropagation(); onAdvance(app); }}
                  sx={{ p: 0.5 }}
                >
                  <ArrowIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              </Tooltip>
            ) : null}
            {!isClosedStatus && (
              <>
                <Tooltip title="Reject">
                  <IconButton
                    size="small"
                    aria-label="Reject application"
                    onClick={(e) => { e.stopPropagation(); onClose(app, 'rejected'); }}
                    sx={{
                      p: 0.5,
                      color: theme.palette.text.secondary,
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                      '.MuiCard-root:hover &, .MuiCard-root:focus-within &': { opacity: 1 },
                      '&:focus': { opacity: 1 },
                    }}
                  >
                    <RejectIcon sx={{ fontSize: '0.875rem' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Withdraw">
                  <IconButton
                    size="small"
                    aria-label="Withdraw application"
                    onClick={(e) => { e.stopPropagation(); onClose(app, 'withdrawn'); }}
                    sx={{
                      p: 0.5,
                      color: theme.palette.text.secondary,
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                      '.MuiCard-root:hover &, .MuiCard-root:focus-within &': { opacity: 1 },
                      '&:focus': { opacity: 1 },
                    }}
                  >
                    <WithdrawIcon sx={{ fontSize: '0.875rem' }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Delete">
              <IconButton
                size="small"
                aria-label="Delete application"
                onClick={(e) => { e.stopPropagation(); onDelete(app); }}
                sx={{
                  p: 0.5,
                  color: theme.palette.text.secondary,
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  '.MuiCard-root:hover &, .MuiCard-root:focus-within &': { opacity: 1 },
                  '&:focus': { opacity: 1 },
                }}
              >
                <DeleteIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        <Menu
          anchorEl={moveAnchorEl}
          open={Boolean(moveAnchorEl)}
          onClose={() => setMoveAnchorEl(null)}
          onClick={(event) => event.stopPropagation()}
        >
          {moveTargets.map((target) => (
            <MenuItem
              key={target.key}
              onClick={selectMoveTarget(target.key as BoardStatus)}
            >
              {target.label}
            </MenuItem>
          ))}
        </Menu>
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Delete confirmation                                                */
/* ------------------------------------------------------------------ */

interface DeleteConfirmProps {
  open: boolean;
  app: ApplicationRead | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmProps> = ({ open, app, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
      <WarningIcon color="error" /> Delete Application
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        Remove <strong>{app?.lead?.title || 'this application'}</strong>
        {app?.lead?.companies?.[0]?.name ? ` at ${app.lead.companies[0].name}` : ''}? This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="contained" color="error" onClick={onConfirm}>Delete</Button>
    </DialogActions>
  </Dialog>
);

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

const EmptyState: React.FC = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.15)})`,
        }}
      >
        <AssignmentIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
      </Box>
      <PageTitle gutterBottom>
        No applications yet
      </PageTitle>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 2 }}>
        When you apply to leads, they&apos;ll appear here as a pipeline board so you can track every stage of your job search.
      </Typography>
      <Button variant="outlined" href="/leads" startIcon={<WorkIcon />}>
        Browse Leads
      </Button>
    </Box>
  );
};

interface DraggableApplicationCardProps {
  app: ApplicationRead;
  column: Column;
  onView: (app: ApplicationRead) => void;
  onAdvance: (app: ApplicationRead) => void;
  onClose: (app: ApplicationRead, outcome: Outcome) => void;
  onDelete: (app: ApplicationRead) => void;
  onMove: (app: ApplicationRead, targetStatus: BoardStatus) => void;
  onReminderSave: (app: ApplicationRead, reminder: Pick<ApplicationRead, 'next_step' | 'next_step_due'>) => Promise<ApplicationRead>;
}

const DraggableApplicationCard: React.FC<DraggableApplicationCardProps> = ({
  app,
  column,
  onView,
  onAdvance,
  onClose,
  onDelete,
  onMove,
  onReminderSave,
}) => {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition: 'transform 0.2s ease',
        zIndex: isDragging ? 2 : 'auto',
      }}
    >
      <ApplicationCard
        app={app}
        column={column}
        onView={onView}
        onAdvance={onAdvance}
        onClose={onClose}
        onDelete={onDelete}
        onMove={onMove}
        onReminderSave={onReminderSave}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </Box>
  );
};

interface BoardLaneProps {
  column: Column;
  apps: ApplicationRead[];
  isNarrow: boolean;
  onView: (app: ApplicationRead) => void;
  onAdvance: (app: ApplicationRead) => void;
  onClose: (app: ApplicationRead, outcome: Outcome) => void;
  onDelete: (app: ApplicationRead) => void;
  onMove: (app: ApplicationRead, targetStatus: BoardStatus) => void;
  onReminderSave: (app: ApplicationRead, reminder: Pick<ApplicationRead, 'next_step' | 'next_step_due'>) => Promise<ApplicationRead>;
}

const BoardLane: React.FC<BoardLaneProps> = ({
  column,
  apps,
  isNarrow,
  onView,
  onAdvance,
  onClose,
  onDelete,
  onMove,
  onReminderSave,
}) => {
  const theme = useTheme();
  const { isOver, setNodeRef } = useDroppable({ id: laneId(column.key as BoardStatus) });

  return (
    <Box
      sx={{
        minWidth: isNarrow ? 280 : 240,
        maxWidth: 320,
        flexShrink: 0,
        flexGrow: column.key === 'registered' ? 0 : 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          px: 1,
          py: 1,
        }}
      >
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: column.color, flexShrink: 0 }} />
        <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {column.label}
        </Typography>
        <Chip
          label={apps.length}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: alpha(column.color, 0.12),
            color: column.color,
          }}
        />
      </Box>

      <Stack
        ref={setNodeRef}
        spacing={1.5}
        sx={{
          p: 1,
          borderRadius: 3,
          minHeight: 220,
          background: alpha(column.color, isOver ? 0.1 : (theme.palette.mode === 'dark' ? 0.03 : 0.025)),
          border: `1px solid ${alpha(column.color, isOver ? 0.32 : (theme.palette.mode === 'dark' ? 0.1 : 0.12))}`,
          boxShadow: isOver ? `0 0 0 2px ${alpha(column.color, 0.14)}` : 'none',
          transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {apps.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, minHeight: 120 }}>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6, fontStyle: 'italic', textAlign: 'center', px: 2 }}>
              {BOARD_EMPTY_HINTS[column.key] || 'No applications'}
            </Typography>
          </Box>
        ) : (
          apps.map((app) => (
            <DraggableApplicationCard
              key={app.id}
              app={app}
              column={column}
              onView={onView}
              onAdvance={onAdvance}
              onClose={onClose}
              onDelete={onDelete}
              onMove={onMove}
              onReminderSave={onReminderSave}
            />
          ))
        )}
      </Stack>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Board page                                                         */
/* ------------------------------------------------------------------ */

const ApplicationsBoardPage: React.FC = () => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { token } = useContext(UserContext);

  const { columns: COLUMNS, allStatusColumns: ALL_STATUS_COLUMNS } = useStageColumns();
  const sc = getStatusColors(theme);

  const { REGISTERED_COLUMN, CLOSED_COLUMNS, BOARD_SECTIONS } = useMemo(() => {
    const reg = ALL_STATUS_COLUMNS.find((c) => c.key === 'registered')!;
    const closed = ALL_STATUS_COLUMNS.filter((c) => c.key === 'rejected' || c.key === 'withdrawn');
    const sections: Array<{ key: string; title: string; description: string; columns: Column[] }> = [
      { key: 'intake', title: 'Intake', description: 'Registered applications stay separate until you deliberately enter the active pipeline.', columns: [reg] },
      { key: 'pipeline', title: 'Active Pipeline', description: 'Drag cards or use Move to keep the funnel current without opening the detail page.', columns: COLUMNS },
      { key: 'closed', title: 'Closed', description: 'Rejected and withdrawn cards remain movable so reopening still goes through the explicit backend semantics.', columns: closed },
    ];
    return { REGISTERED_COLUMN: reg, CLOSED_COLUMNS: closed, BOARD_SECTIONS: sections };
  }, [COLUMNS, ALL_STATUS_COLUMNS]);

  const {
    applications,
    loading,
    error,
    success,
    setError,
    setSuccess,
    refresh,
    handleStatusChange,
    handleAdvance,
    handleClose,
    handleDelete,
    handleReminderUpdate,
    confirmDelete,
    deleteTarget,
    setDeleteTarget,
    buckets,
    registeredApps,
    closedApps,
    overdueCount,
  } = useApplications(token);

  const activeCount = (buckets.get('applied')?.length ?? 0)
    + (buckets.get('screening')?.length ?? 0)
    + (buckets.get('interview')?.length ?? 0);
  const interviewCount = buckets.get('interview')?.length ?? 0;
  const offerCount = buckets.get('offer')?.length ?? 0;
  const closedBuckets = useMemo(() => {
    const map = new Map<string, ApplicationRead[]>([
      ['rejected', []],
      ['withdrawn', []],
    ]);

    for (const app of closedApps) {
      const status = boardStatusKey(app);
      const bucket = map.get(status);
      if (bucket) bucket.push(app);
    }

    return map;
  }, [closedApps]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  usePageToolbarHeader('Board', `${applications.length} total \u00b7 ${interviewCount} interviewing`);

  const viewApplication = (app: ApplicationRead) => {
    navigate(`/applications/${app.id}`);
  };

  const moveApplication = (app: ApplicationRead, targetStatus: BoardStatus) => {
    if (boardStatusKey(app) === targetStatus) return;
    void handleStatusChange(app.id, targetStatus);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const targetStatus = statusFromLaneId(event.over ? String(event.over.id) : null);
    if (!targetStatus) return;

    const movedApp = applications.find((app) => app.id === String(event.active.id));
    if (!movedApp || boardStatusKey(movedApp) === targetStatus) return;

    void handleStatusChange(movedApp.id, targetStatus);
  };

  const appsForLane = (laneKey: string) => {
    if (laneKey === 'registered') return registeredApps;
    if (laneKey === 'rejected' || laneKey === 'withdrawn') return closedBuckets.get(laneKey) ?? [];
    return buckets.get(laneKey) ?? [];
  };

  return (
    <Box>
      {/* Header actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Tooltip title="Refresh">
          <IconButton
            onClick={refresh}
            aria-label="Refresh applications"
            sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary stats strip */}
      {!loading && applications.length > 0 && (
        <Stack
          direction="row"
          spacing={3}
          sx={{
            mb: 3,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.04),
            border: `1px solid ${theme.palette.divider}`,
            overflowX: 'auto',
            flexWrap: 'nowrap',
          }}
        >
          {[
            { label: 'Total', value: applications.length, color: theme.palette.text.primary },
            { label: 'Registered', value: registeredApps.length, color: sc.registered },
            { label: 'Active', value: activeCount, color: sc.applied },
            { label: 'Interviewing', value: interviewCount, color: sc.interviewing },
            { label: 'Offers', value: offerCount, color: sc.offer },
            { label: 'Closed', value: closedApps.length, color: sc.rejected },
            { label: 'Overdue', value: overdueCount, color: theme.palette.warning.main },
          ].map((stat) => (
            <Box key={stat.label} sx={{ textAlign: 'center', minWidth: 64, flexShrink: 0 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: stat.color, lineHeight: 1.2 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {/* Alerts */}
      <Fade in={!!error}><Box>{error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}</Box></Fade>
      <Fade in={!!success}><Box>{success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}</Box></Fade>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {COLUMNS.map((c) => (
            <Box key={c.key} sx={{ minWidth: 240, flexGrow: 1, flexShrink: 0 }}>
              <Skeleton variant="rounded" height={32} sx={{ mb: 1.5, borderRadius: 2 }} />
              <Stack spacing={1.5}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      ) : applications.length === 0 ? (
        <EmptyState />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Stack spacing={3}>
            {BOARD_SECTIONS.map((section) => (
              <Box key={section.key}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={0.75}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  sx={{ mb: 1.5 }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {section.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
                      {section.description}
                    </Typography>
                  </Box>
                </Stack>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    pb: 2,
                    minHeight: 220,
                    ...(isNarrow && {
                      scrollSnapType: 'x mandatory',
                      '& > *': { scrollSnapAlign: 'start' },
                    }),
                  }}
                >
                  {section.columns.map((column) => (
                    <BoardLane
                      key={column.key}
                      column={column}
                      apps={appsForLane(column.key)}
                      isNarrow={isNarrow}
                      onView={viewApplication}
                      onAdvance={handleAdvance}
                      onClose={handleClose}
                      onDelete={handleDelete}
                      onMove={moveApplication}
                      onReminderSave={(application, reminder) => handleReminderUpdate(application.id, reminder)}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </DndContext>
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        app={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default ApplicationsBoardPage;
