import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  useNavigate } from 'react-router-dom';
import { timeAgo as relativeDate,
  timeAgoShort,
  statusLabel } from '../util/format';
import {
  Box,
  Typography,
  Button,
  IconButton,
  useTheme,
  alpha,
  Stack,
  TextField,
  ButtonBase,
  Checkbox,
  Tooltip,
  Popover,
  Menu,
  MenuItem,
  Collapse,
  Link,
  } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  SwapHoriz as StatusChangeIcon,
  MailOutline as MailIcon,
  Description as DescriptionIcon,
  NoteAdd as NoteAddIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Close as DismissIcon,
  Assignment as AppIcon,
  WorkOutline as LeadsIcon,
  PlaylistAdd as ActionIcon,
  ChatBubbleOutline as MessageIcon,
  PeopleAlt as ConnectionsIcon,
  Person as PersonIcon,
  CalendarToday as TodayIcon,
  WarningAmber as OverdueIcon,
  Refresh as RefreshIcon,
  EditOutlined as EditIcon,
  RefreshOutlined as RefreshOutlinedIcon,
  PersonOutline as PersonOutlineIcon,
  PeopleOutline as PeopleOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocationOn as LocationIcon,
  DragIndicator as DragIndicatorIcon,
  } from '@mui/icons-material';
import { DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent } from '@dnd-kit/core';
import { SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import { getLeads,
  type LeadRead } from '../service/leads';
import {
  getActionItems,
  updateActionItem,
  reorderActionItems,
  type ActionItemRead,
  type ActionItemDetailRead,
  type ActionItemCreate,
  } from '../service/action-items';
import {
  getActivityFeed,
  getCommandCenterSummary,
  type ActivityFeedItem,
  type CommandCenterSummary,
  } from '../service/activity-feed';
import CreateActionItemDialog from '../component/create-action-item-dialog';
import {
  SectionCard,
  SectionHeader,
  MetricStrip,
  InlineFeedback,
  EmptyState as DSEmptyState,
  LoadingState,
  CardShell,
  getStatusColors,
  progressGradient,
  StatusChip as Chip,
  softBrandGradient,
} from '../design-system';
import { radiusTokens, toRadiusPx } from '../design-system/tokens/radius';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const KIND_LABELS: Record<string, string> = {
  follow_up: 'Follow-up',
  prepare_document: 'Prepare Doc',
  send_message: 'Message',
  review_lead: 'Review Lead',
  schedule_interview: 'Interview',
  custom: 'Custom',
};

const FEED_ICONS: Record<string, React.ReactElement> = {
  status_change: <StatusChangeIcon fontSize="small" />,
  message: <MailIcon fontSize="small" />,
  document_update: <DescriptionIcon fontSize="small" />,
  connection: <PersonAddIcon fontSize="small" />,
  action_completed: <CheckCircleIcon fontSize="small" />,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isOverdue(item: ActionItemDetailRead): boolean {
  return Boolean(
    item.due_at &&
    new Date(item.due_at) < new Date() &&
    item.status !== 'completed' &&
    item.status !== 'dismissed',
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function linkedEntityLabel(item: ActionItemDetailRead): { text: string; path: string } | null {
  if (item.application_id) {
    const label = item.application?.lead?.title || 'Application';
    return { text: `App: ${label}`, path: `/applications/${item.application_id}` };
  }
  if (item.lead_id) {
    const label = item.lead?.title || 'Lead';
    return { text: `Lead: ${label}`, path: `/leads?leadId=${item.lead_id}` };
  }
  if (item.document_id) {
    const label = item.document?.title || 'Document';
    return { text: `Doc: ${label}`, path: `/workspace/${item.document_id}` };
  }
  if (item.conversation_id) {
    return { text: 'Chat: Conversation', path: `/network/messages/${item.conversation_id}` };
  }
  return null;
}

/* ---- Priority cycling helper ---- */
const PRIORITY_CYCLE: Array<ActionItemDetailRead['priority']> = ['low', 'medium', 'high', 'urgent'];

function nextPriority(current: ActionItemDetailRead['priority']): ActionItemDetailRead['priority'] {
  const idx = PRIORITY_CYCLE.indexOf(current);
  return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
}

/* ---- Time-of-day greeting ---- */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLongDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function feedEntityPath(item: ActivityFeedItem): string | null {
  const t = item.entity_type;
  const id = item.entity_id;
  if (t === 'application') return `/applications/${id}`;
  if (t === 'conversation') return `/network/messages/${id}`;
  if (t === 'document') return `/workspace/${id}`;
  if (t === 'connection') return '/network/connections';
  if (t === 'action_item') return '/';
  return null;
}

type SummaryStageVelocity = CommandCenterSummary['avg_days_per_stage'][number];
type SummaryFunnelStage = CommandCenterSummary['offer_conversion_funnel'][number];

function formatMetricNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace(/\.0$/, '');
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'n/a';
  return `${formatMetricNumber(value)}%`;
}

function formatDays(value: number): string {
  return `${formatMetricNumber(value)} day${value === 1 ? '' : 's'}`;
}

function getDueDateActionLabel(item: ActionItemDetailRead): string {
  return item.due_at
    ? `Change due date for "${item.title}"`
    : `Set due date for "${item.title}"`;
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getDashboardFocusCopy(summary: CommandCenterSummary | null, pendingCount: number): string {
  if (!summary) {
    return 'Pull your next actions, active applications, and recent movement into one place.';
  }

  if (summary.application_count === 0 && summary.lead_count === 0) {
    return 'Start by adding your first lead, shaping your profile, or creating a document so this dashboard has momentum to track.';
  }

  const focusParts = [
    pluralize(summary.active_application_count, 'active application'),
    pluralize(pendingCount, 'open action item'),
    pluralize(summary.unapplied_lead_count, 'unapplied lead'),
  ];

  if (summary.overdue_action_items > 0) {
    return `${focusParts.join(', ')}. ${pluralize(summary.overdue_action_items, 'overdue follow-up')} needs attention first.`;
  }

  if (summary.action_items_due_today > 0) {
    return `${focusParts.join(', ')}. ${pluralize(summary.action_items_due_today, 'item')} is due today.`;
  }

  return `${focusParts.join(', ')}. Everything is current, so this is a good window to push the pipeline forward.`;
}

function getActionSectionCopy(actionFilter: string, count: number): string {
  if (actionFilter === 'overdue') {
    return count > 0
      ? 'Start with overdue work so follow-ups and deadlines do not slip.'
      : 'Nothing is overdue right now.';
  }
  if (actionFilter === 'pending') {
    return count > 0
      ? 'Queued work that still needs a first pass.'
      : 'No pending action items are waiting right now.';
  }
  if (actionFilter === 'in_progress') {
    return count > 0
      ? 'Work already underway that is still open.'
      : 'No action items are currently marked in progress.';
  }

  return count > 0
    ? 'Your working queue, ordered by urgency and due date.'
    : 'No open action items right now.';
}

/* ------------------------------------------------------------------ */
/*  Sortable action-item row (DnD)                                     */
/* ------------------------------------------------------------------ */

interface SortableActionItemProps {
  item: ActionItemDetailRead;
  overdue: boolean;
  linked: { text: string; path: string } | null;
  priorityColor: string;
  onComplete: (item: ActionItemDetailRead) => void;
  onDismiss: (item: ActionItemDetailRead) => void;
  onEdit: (item: ActionItemDetailRead) => void;
  onCyclePriority: (item: ActionItemDetailRead) => void;
  onDueDateOpen: (e: React.MouseEvent<HTMLElement>, item: ActionItemDetailRead) => void;
  onStatusContextMenu: (e: React.MouseEvent<HTMLElement>, item: ActionItemDetailRead) => void;
  onNavigate: (path: string) => void;
}

function SortableActionItem({ item, overdue, linked, priorityColor, onComplete, onDismiss, onEdit, onCyclePriority, onDueDateOpen, onStatusContextMenu, onNavigate }: SortableActionItemProps) {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.25,
        px: 1,
        borderRadius: toRadiusPx(radiusTokens.sm),
        borderLeft: `3px solid ${priorityColor}`,
        mb: 0.5,
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
      }}
    >
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', flexShrink: 0, color: 'text.disabled' }}>
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <Tooltip title={`Priority: ${item.priority} (click to cycle)`}>
        <ButtonBase
          onClick={() => onCyclePriority(item)}
          sx={{
            width: 6, minHeight: 32, borderRadius: toRadiusPx(radiusTokens.xs),
            bgcolor: priorityColor, flexShrink: 0,
            '&:hover': { opacity: 0.7 },
          }}
          aria-label={`Cycle priority from ${item.priority}`}
        />
      </Tooltip>
      <Checkbox
        size="small"
        checked={item.status === 'completed'}
        onChange={() => onComplete(item)}
        onContextMenu={(e) => onStatusContextMenu(e, item)}
        sx={{ p: 0.5 }}
        aria-label={`Mark "${item.title}" ${item.status === 'completed' ? 'pending' : 'complete'}`}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            textDecoration: item.status === 'completed' ? 'line-through' : 'none',
            opacity: item.status === 'completed' ? 0.5 : 1,
          }}
          noWrap
        >
          {item.title}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label={KIND_LABELS[item.kind] ?? item.kind}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
          <ButtonBase
            onClick={(e) => onDueDateOpen(e, item)}
            aria-label={getDueDateActionLabel(item)}
            sx={{
              color: overdue ? 'error.main' : 'text.secondary',
              fontWeight: overdue ? 600 : 400,
              borderRadius: toRadiusPx(radiusTokens.xs),
              px: 0.25,
              '&:hover': { textDecoration: 'underline' },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <Typography component="span" variant="caption">
            {item.due_at
              ? `${overdue ? 'Overdue · ' : ''}${formatDate(item.due_at)}`
              : 'Set date'}
            </Typography>
          </ButtonBase>
          {linked && (
            <Chip
              label={linked.text}
              size="small"
              variant="outlined"
              color="info"
              clickable
              onClick={() => onNavigate(linked.path)}
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          )}
        </Stack>
      </Box>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(item)} aria-label={`Edit "${item.title}"`}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Dismiss">
        <IconButton size="small" onClick={() => onDismiss(item)} aria-label={`Dismiss "${item.title}"`}>
          <DismissIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const sc = getStatusColors(theme);
  const navigate = useNavigate();
  const { token, user } = useContext(UserContext);
  const greeting = `${getGreeting()}${user?.first_name ? `, ${user.first_name}` : ''}`;

  /* ---- state ---- */
  const [summary, setSummary] = useState<CommandCenterSummary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItemDetailRead[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ActionItemDetailRead | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [leadsCollapsed, setLeadsCollapsed] = useState(() =>
    localStorage.getItem('cc-leads-collapsed') === 'true',
  );
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [, setTick] = useState(0); // force re-render to update "X ago"

  /* ---- inline editing state ---- */
  const [dueDateAnchor, setDueDateAnchor] = useState<HTMLElement | null>(null);
  const [dueDateItem, setDueDateItem] = useState<ActionItemDetailRead | null>(null);
  const [dueDateValue, setDueDateValue] = useState('');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(null);
  const [statusMenuItem, setStatusMenuItem] = useState<ActionItemDetailRead | null>(null);

  const showOperationError = useCallback((message: string) => {
    setOperationError(message);
  }, []);

  /* ---- page header ---- */
  usePageToolbarHeader(greeting);

  /* ---- data fetch ---- */
  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, feedRes, actionRes, leadsRes] = await Promise.all([
        getCommandCenterSummary(token),
        getActivityFeed(token, { page: 1, page_size: 20 }),
        getActionItems(token, { page_size: 50 }),
        getLeads(token, { page: 1, page_size: 5 }),
      ]);
      setSummary(summaryRes);
      setFeed(feedRes.items);
      setFeedTotal(feedRes.total);
      setFeedPage(1);
      setActionItems(actionRes as ActionItemDetailRead[]);
      setLeads(leadsRes.items);
      setLastRefresh(Date.now());
    } catch (e) {
      console.error(e);
      setError('Unable to load dashboard data. Please try again.');
    }
    setLoading(false);
  }, [token]);

  /* ---- lightweight poll (summary + action items only) ---- */
  const lightRefresh = useCallback(async () => {
    if (!token) return;
    try {
      const [summaryRes, actionRes] = await Promise.all([
        getCommandCenterSummary(token),
        getActionItems(token, { page_size: 50 }),
      ]);
      setSummary(summaryRes);
      setActionItems(actionRes as ActionItemDetailRead[]);
      setLastRefresh(Date.now());
      setOperationError(null);
    } catch (e) {
      console.error(e);
      showOperationError('Dashboard refresh failed. Showing your last loaded data.');
    }
  }, [showOperationError, token]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- 60s auto-refresh polling with visibility pause ---- */
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => { lightRefresh(); }, 60_000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [lightRefresh]);

  /* ---- tick to keep "last refreshed" display current ---- */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  /* ---- load more feed ---- */
  const loadMoreFeed = useCallback(async () => {
    if (!token) return;
    const nextPage = feedPage + 1;
    try {
      const feedRes = await getActivityFeed(token, { page: nextPage, page_size: 20 });
      setFeed((prev) => [...prev, ...feedRes.items]);
      setFeedPage(nextPage);
      setFeedTotal(feedRes.total);
      setOperationError(null);
    } catch (e) {
      console.error(e);
      showOperationError('Could not load more activity right now. Please try again.');
    }
  }, [feedPage, showOperationError, token]);

  /* ---- action-item mutations ---- */
  const handleComplete = useCallback(async (item: ActionItemDetailRead) => {
    if (!token) return;
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await updateActionItem(token, item.id, { status: newStatus });
      setActionItems((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
      setSuccessMsg(newStatus === 'completed' ? 'Marked complete' : 'Marked pending');
      setOperationError(null);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (e) {
      console.error(e);
      showOperationError(`Could not update "${item.title}". No changes were applied.`);
    }
  }, [showOperationError, token]);

  const handleDismiss = useCallback(async (item: ActionItemDetailRead) => {
    if (!token) return;
    try {
      const updated = await updateActionItem(token, item.id, { status: 'dismissed' });
      setActionItems((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
      setOperationError(null);
    } catch (e) {
      console.error(e);
      showOperationError(`Could not dismiss "${item.title}". It is still in your list.`);
    }
  }, [showOperationError, token]);

  /* ---- inline priority cycling ---- */
  const handleCyclePriority = useCallback(async (item: ActionItemDetailRead) => {
    if (!token) return;
    const next = nextPriority(item.priority);
    // Optimistic update
    setActionItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, priority: next } : a)));
    try {
      await updateActionItem(token, item.id, { priority: next });
      setOperationError(null);
    } catch (e) {
      // Revert on failure
      setActionItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, priority: item.priority } : a)));
      console.error(e);
      showOperationError(`Could not update priority for "${item.title}". Restored the previous priority.`);
    }
  }, [showOperationError, token]);

  /* ---- inline due-date ---- */
  const handleDueDateOpen = useCallback((event: React.MouseEvent<HTMLElement>, item: ActionItemDetailRead) => {
    setDueDateAnchor(event.currentTarget);
    setDueDateItem(item);
    setDueDateValue(item.due_at ? item.due_at.slice(0, 10) : '');
  }, []);

  const handleDueDateSave = useCallback(async (newDate: string | null) => {
    if (!token || !dueDateItem) return;
    const due_at = newDate ? `${newDate}T00:00:00` : null;
    try {
      const updated = await updateActionItem(token, dueDateItem.id, { due_at });
      setActionItems((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
      setOperationError(null);
      setDueDateAnchor(null);
      setDueDateItem(null);
    } catch (e) {
      console.error(e);
      showOperationError(`Could not save the due date for "${dueDateItem.title}". Please try again.`);
    }
  }, [dueDateItem, showOperationError, token]);

  /* ---- inline status context menu ---- */
  const handleStatusContextMenu = useCallback((event: React.MouseEvent<HTMLElement>, item: ActionItemDetailRead) => {
    event.preventDefault();
    setStatusMenuAnchor(event.currentTarget);
    setStatusMenuItem(item);
  }, []);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!token || !statusMenuItem) return;
    try {
      const updated = await updateActionItem(token, statusMenuItem.id, { status: status as ActionItemDetailRead['status'] });
      setActionItems((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
      setSuccessMsg(`Status changed to ${status}`);
      setOperationError(null);
      setTimeout(() => setSuccessMsg(null), 2500);
      setStatusMenuAnchor(null);
      setStatusMenuItem(null);
    } catch (e) {
      console.error(e);
      showOperationError(`Could not change status for "${statusMenuItem.title}". Please try again.`);
    }
  }, [showOperationError, statusMenuItem, token]);

  /* ---- action item created ---- */
  const handleActionCreated = useCallback((item: ActionItemRead) => {
    setActionItems((prev) => [item as ActionItemDetailRead, ...prev]);
    setSuccessMsg('Action item created');
    setOperationError(null);
    setTimeout(() => setSuccessMsg(null), 2500);
  }, []);

  /* ---- action item updated (from edit dialog) ---- */
  const handleActionUpdated = useCallback((item: ActionItemRead) => {
    setActionItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, ...item } : a)));
    setEditItem(null);
    setSuccessMsg('Action item updated');
    setOperationError(null);
    setTimeout(() => setSuccessMsg(null), 2500);
    lightRefresh();
  }, [lightRefresh]);

  /* ---- DnD reorder ---- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  /* ---- persist leads collapsed state ---- */
  const toggleLeadsCollapsed = useCallback(() => {
    setLeadsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('cc-leads-collapsed', String(next));
      return next;
    });
  }, []);

  /* ---- derived data ---- */
  const filteredActions = useMemo(() => {
    const now = new Date();
    let items = actionItems;

    if (actionFilter === 'pending') {
      items = items.filter((a) => a.status === 'pending');
    } else if (actionFilter === 'in_progress') {
      items = items.filter((a) => a.status === 'in_progress');
    } else if (actionFilter === 'overdue') {
      items = items.filter((a) => isOverdue(a));
    } else {
      // 'all': exclude completed + dismissed for cleaner view
      items = items.filter((a) => a.status !== 'completed' && a.status !== 'dismissed');
    }

    return [...items].sort((a, b) => {
      const hasCustomOrder = items.some((i) => (i.sort_order ?? 0) !== 0);
      if (hasCustomOrder) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      // due_at ASC nulls last
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return 0;
    });
  }, [actionItems, actionFilter]);

  const pendingCount = useMemo(
    () => actionItems.filter((a) => a.status === 'pending' || a.status === 'in_progress').length,
    [actionItems],
  );
  const dashboardFocusCopy = useMemo(
    () => getDashboardFocusCopy(summary, pendingCount),
    [summary, pendingCount],
  );
  const actionSectionCopy = useMemo(
    () => getActionSectionCopy(actionFilter, filteredActions.length),
    [actionFilter, filteredActions.length],
  );
  const stageVelocity = summary?.avg_days_per_stage ?? [];
  const offerConversionFunnel = summary?.offer_conversion_funnel ?? [];
  const appliedFunnelStage = offerConversionFunnel.find((entry) => entry.stage === 'applied');
  const offerFunnelStage = offerConversionFunnel.find((entry) => entry.stage === 'offer');
  const appliedBaseline = appliedFunnelStage?.reached_count ?? 0;
  const offerYield = offerFunnelStage?.conversion_from_applied ?? null;
  const slowestStage = stageVelocity.reduce<SummaryStageVelocity | null>(
    (currentSlowest, entry) => (
      currentSlowest === null || entry.avg_days > currentSlowest.avg_days
        ? entry
        : currentSlowest
    ),
    null,
  );
  const maxVelocityDays = stageVelocity.reduce(
    (currentMax, entry) => Math.max(currentMax, entry.avg_days),
    0,
  );
  const analyticsReady = stageVelocity.length > 0 || appliedBaseline > 0;

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredActions.findIndex((i) => i.id === active.id);
    const newIndex = filteredActions.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredActions, oldIndex, newIndex);
    const previousActionItems = actionItems;
    setActionItems((prev) => {
      const newItems = [...prev];
      reordered.forEach((item, idx) => {
        const i = newItems.findIndex((a) => a.id === item.id);
        if (i !== -1) newItems[i] = { ...newItems[i], sort_order: idx };
      });
      return newItems;
    });

    try {
      await reorderActionItems(token!, reordered.map((i) => i.id));
      setOperationError(null);
    } catch (e) {
      console.error(e);
      setActionItems(previousActionItems);
      showOperationError('Could not reorder action items. Restored the previous order.');
    }
  }, [actionItems, filteredActions, showOperationError, token]);

  /* ---- filter chips ---- */
  const FILTER_CHIPS: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'overdue', label: 'Overdue' },
  ];

  /* ---- loading skeleton ---- */
  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto' }} aria-busy="true" aria-label="Loading dashboard">
        <LoadingState kind="section" count={3} itemHeight={200} />
      </Box>
    );
  }

  /* ---- error state ---- */
  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4 }} role="alert">
        <DSEmptyState
          icon={<RefreshIcon />}
          title="Something went wrong"
          description={error}
          primaryAction={{
            label: 'Retry',
            onClick: refresh,
            icon: <RefreshIcon />,
            buttonProps: { variant: 'contained' },
          }}
        />
      </Box>
    );
  }

  /* ---- main render ---- */
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

      {/* ── Success toast ── */}
      {operationError && (
        <Box sx={{ mb: 2 }}>
          <InlineFeedback tone="error" onClose={() => setOperationError(null)}>
            {operationError}
          </InlineFeedback>
        </Box>
      )}
      {successMsg && (
        <Box sx={{ mb: 2 }}>
          <InlineFeedback tone="success" onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </InlineFeedback>
        </Box>
      )}

      {/* ── Onboarding quick-start (no apps AND no leads) ── */}
      {summary && summary.application_count === 0 && summary.lead_count === 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Welcome to Baldin</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your job search dashboard. Start by importing a lead, building your profile, or browsing the community.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CardShell interactive onClick={() => navigate('/leads')} density="compact">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LeadsIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Manage Leads</Typography>
                    <Typography variant="caption" color="text.secondary">Import or review opportunities</Typography>
                  </Box>
                </Box>
              </CardShell>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CardShell interactive onClick={() => navigate('/me')} density="compact">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PersonOutlineIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Complete Your Profile</Typography>
                    <Typography variant="caption" color="text.secondary">Add your details</Typography>
                  </Box>
                </Box>
              </CardShell>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CardShell interactive onClick={() => navigate('/network/discover')} density="compact">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PeopleOutlineIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Discover People</Typography>
                    <Typography variant="caption" color="text.secondary">Browse your network</Typography>
                  </Box>
                </Box>
              </CardShell>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CardShell interactive onClick={() => navigate('/workspace/new')} density="compact">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <NoteAddIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Create a Document</Typography>
                    <Typography variant="caption" color="text.secondary">Write a resume or cover letter</Typography>
                  </Box>
                </Box>
              </CardShell>
            </Grid>
          </Grid>
        </Box>
      )}

      <CardShell
        density="compact"
        surface="raised"
        contentSx={{
          mb: 3,
          background: softBrandGradient(theme),
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                Today at a glance
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 750, mt: 0.25 }}>
                {greeting}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
                {dashboardFocusCopy}
              </Typography>
            </Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Add Action
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LeadsIcon />}
                onClick={() => navigate('/leads')}
              >
                Review Leads
              </Button>
              <Tooltip title="Refresh now">
                <IconButton size="small" onClick={() => { lightRefresh(); }} aria-label="Refresh dashboard">
                  <RefreshOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="caption" color="text.secondary">
              {formatLongDate()}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Last refreshed {timeAgoShort(lastRefresh)}
            </Typography>
          </Stack>
        </Stack>
      </CardShell>

      <Grid container spacing={2.5}>
        {/* ═══════════════ Left column ═══════════════ */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2.5}>
            {/* ── Action Items Panel ── */}
            <SectionCard
              header={
                <SectionHeader
                  icon={<ActionIcon />}
                  title="Action Items"
                  count={pendingCount}
                  supportingText={actionSectionCopy}
                  size="compact"
                />
              }
            >

                {/* Filter chips */}
                <Stack direction="row" spacing={0.75} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.75 }}>
                  {FILTER_CHIPS.map((chip) => (
                    <Chip
                      key={chip.key}
                      label={chip.label}
                      size="small"
                      variant={actionFilter === chip.key ? 'filled' : 'outlined'}
                      color={actionFilter === chip.key ? 'primary' : 'default'}
                      onClick={() => setActionFilter(chip.key)}
                      sx={{ cursor: 'pointer', fontWeight: actionFilter === chip.key ? 600 : 400 }}
                    />
                  ))}
                </Stack>

                {/* Action items list */}
                {filteredActions.length === 0 ? (
                  <DSEmptyState
                    icon={<CheckCircleIcon />}
                    title="All clear"
                    description="No action items match this filter. Action items help you track follow-ups, deadlines, and next steps for your applications."
                    primaryAction={{
                      label: 'Add an action item',
                      onClick: () => setCreateDialogOpen(true),
                      icon: <AddIcon />,
                    }}
                    layout="section"
                    compact
                  />
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={filteredActions.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <Stack spacing={0}>
                        {filteredActions.map((item) => {
                          const overdue = isOverdue(item);
                          const linked = linkedEntityLabel(item);
                          const priorityColor = sc[item.priority as keyof typeof sc] ?? sc.low;

                          return (
                            <SortableActionItem
                              key={item.id}
                              item={item}
                              overdue={overdue}
                              linked={linked}
                              priorityColor={priorityColor}
                              onComplete={handleComplete}
                              onDismiss={handleDismiss}
                              onEdit={(i) => { setEditItem(i); setCreateDialogOpen(true); }}
                              onCyclePriority={handleCyclePriority}
                              onDueDateOpen={handleDueDateOpen}
                              onStatusContextMenu={handleStatusContextMenu}
                              onNavigate={navigate}
                            />
                          );
                        })}
                      </Stack>
                    </SortableContext>
                  </DndContext>
                )}
            </SectionCard>

            {/* ── Application Pipeline Strip ── */}
            {summary && (
              <SectionCard
                header={
                  <SectionHeader
                    title="Application Pipeline"
                    size="compact"
                  />
                }
                density="compact"
              >
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(summary.status_breakdown).map(([status, count]) => {
                      const color = sc[status as keyof typeof sc] ?? theme.palette.text.secondary;
                      return (
                        <Chip
                          key={status}
                          label={`${statusLabel(status)} ${count}`}
                          size="small"
                          clickable
                          onClick={() => navigate(`/applications?stage=${status}`)}
                          sx={{
                            fontWeight: 600,
                            bgcolor: alpha(color, 0.1),
                            color,
                            border: `1px solid ${alpha(color, 0.2)}`,
                            '&:hover': { bgcolor: alpha(color, 0.18) },
                          }}
                        />
                      );
                    })}
                  </Stack>
              </SectionCard>
            )}

            {summary && (
              <SectionCard
                header={
                  <SectionHeader
                    title="Pipeline Analytics"
                    supportingText="Stage dwell time comes from recorded application status-history spans. Offer conversion carries each application forward to the deepest pipeline stage it reached so the funnel stays monotonic even when a step was skipped in the UI."
                    size="compact"
                  />
                }
              >

                  {analyticsReady ? (
                    <>
                      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          label={`Offer yield ${formatPercent(offerYield)}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: alpha(sc.offer, 0.12),
                            color: sc.offer,
                          }}
                        />
                        <Chip
                          label={`Offers reached ${offerFunnelStage?.reached_count ?? 0}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                          }}
                        />
                        {slowestStage && (
                          <Chip
                            label={`Slowest stage ${statusLabel(slowestStage.stage)} · ${formatDays(slowestStage.avg_days)}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(sc.pending, 0.12),
                              color: sc.pending,
                            }}
                          />
                        )}
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: toRadiusPx(radiusTokens.lg),
                              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.05),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                              height: '100%',
                            }}
                          >
                            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                              Stage Velocity
                            </Typography>
                            <Stack spacing={1.75} sx={{ mt: 1.5 }}>
                              {stageVelocity.map((entry) => {
                                const color = sc[entry.stage as keyof typeof sc] ?? theme.palette.primary.main;
                                const width = maxVelocityDays > 0
                                  ? Math.max(14, (entry.avg_days / maxVelocityDays) * 100)
                                  : 14;

                                return (
                                  <Box key={`velocity-${entry.stage}`}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {statusLabel(entry.stage)}
                                      </Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 800, color }}>
                                        {formatDays(entry.avg_days)}
                                      </Typography>
                                    </Stack>
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        height: 10,
                                        borderRadius: '999px',
                                        bgcolor: alpha(color, 0.12),
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: `${width}%`,
                                          height: '100%',
                                          borderRadius: '999px',
                                          background: progressGradient(color),
                                        }}
                                      />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                      {entry.sample_size} recorded span{entry.sample_size === 1 ? '' : 's'}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Box>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: toRadiusPx(radiusTokens.lg),
                              bgcolor: alpha(sc.offer, theme.palette.mode === 'dark' ? 0.1 : 0.04),
                              border: `1px solid ${alpha(sc.offer, 0.14)}`,
                              height: '100%',
                            }}
                          >
                            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                              Offer Conversion
                            </Typography>
                            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                              {offerConversionFunnel.map((entry, index) => {
                                const color = sc[entry.stage as keyof typeof sc] ?? sc.offer;
                                const width = appliedBaseline > 0
                                  ? 38 + ((entry.reached_count / appliedBaseline) * 62)
                                  : 38;
                                const previousStage = index > 0 ? offerConversionFunnel[index - 1] : null;

                                return (
                                  <Box key={`funnel-${entry.stage}`}>
                                    <Box
                                      sx={{
                                        width: `${width}%`,
                                        maxWidth: '100%',
                                        mx: 'auto',
                                        borderRadius: toRadiusPx(radiusTokens.md),
                                        px: 1.5,
                                        py: 1.1,
                                        bgcolor: alpha(color, 0.14),
                                        border: `1px solid ${alpha(color, 0.22)}`,
                                      }}
                                    >
                                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color }}>
                                          {statusLabel(entry.stage)}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                          {entry.reached_count}
                                        </Typography>
                                      </Stack>
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}
                                    >
                                      {previousStage === null
                                        ? 'Baseline for the active pipeline'
                                        : `${formatPercent(entry.conversion_from_previous)} from ${statusLabel(previousStage.stage)} · ${formatPercent(entry.conversion_from_applied)} from Applied`}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Box>
                        </Grid>
                      </Grid>
                    </>
                  ) : (
                    <Box
                      sx={{
                        borderRadius: toRadiusPx(radiusTokens.lg),
                        border: `1px dashed ${alpha(theme.palette.text.primary, 0.14)}`,
                        px: 2,
                        py: 3,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Analytics unlock as pipeline history accumulates
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Once applications move through Applied, Screening, Interview, and Offer, this panel will surface bottlenecks and yield automatically.
                      </Typography>
                    </Box>
                  )}
              </SectionCard>
            )}

            {/* ── Recent Leads ── */}
            <SectionCard
              header={
                <SectionHeader
                  icon={<LeadsIcon />}
                  title="Recent Leads"
                  count={leads.length}
                  supportingText="Fresh opportunities and imports worth a second look."
                  size="compact"
                  action={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Link
                        component="button"
                        variant="caption"
                        underline="hover"
                        onClick={() => navigate('/leads')}
                        sx={{ fontWeight: 600 }}
                      >
                        View all &rarr;
                      </Link>
                      <IconButton size="small" onClick={toggleLeadsCollapsed} aria-label={leadsCollapsed ? 'Expand leads' : 'Collapse leads'}>
                        {leadsCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                      </IconButton>
                    </Stack>
                  }
                />
              }
              density="compact"
            >
                <Collapse in={!leadsCollapsed}>
                  {leads.length === 0 ? (
                    <DSEmptyState
                      icon={<LeadsIcon />}
                      title="No leads yet"
                      description="Import a lead or save a role to start building your pipeline."
                      primaryAction={{
                        label: 'Import leads',
                        onClick: () => navigate('/leads'),
                        icon: <LeadsIcon />,
                      }}
                      layout="section"
                      compact
                    />
                  ) : (
                    <Stack spacing={0}>
                      {leads.map((lead) => (
                        <Box
                          key={lead.id}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1, py: 1, px: 0.5,
                            borderRadius: toRadiusPx(radiusTokens.xs),
                            cursor: 'pointer',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                          }}
                          onClick={() => {
                            if (lead.url) {
                              window.open(lead.url, '_blank', 'noopener');
                            }
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {lead.title || 'Untitled Lead'}
                            </Typography>
                            {lead.companies && lead.companies.length > 0 && (
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {lead.companies[0].name}
                              </Typography>
                            )}
                          </Box>
                          {lead.location && (
                            <Chip
                              icon={<LocationIcon sx={{ fontSize: 14 }} />}
                              label={lead.location}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: 20, flexShrink: 0, maxWidth: 120 }}
                            />
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Collapse>
            </SectionCard>
          </Stack>
        </Grid>

        {/* ═══════════════ Right column ═══════════════ */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2.5}>
            {/* ── Metrics Summary ── */}
            {summary && (
              <SectionCard
                header={
                  <SectionHeader
                    title="Overview"
                    supportingText="A compact read on your search health and what needs attention next."
                    size="compact"
                  />
                }
                density="compact"
              >
                <MetricStrip
                  variant="inline"
                  items={[
                    {
                      label: 'Active Apps',
                      value: summary.active_application_count,
                      icon: <AppIcon fontSize="small" />,
                      color: theme.palette.secondary.main,
                      onClick: () => navigate('/applications'),
                    },
                    {
                      label: 'Overdue',
                      value: summary.overdue_action_items,
                      icon: <OverdueIcon fontSize="small" />,
                      color: sc.urgent,
                    },
                    {
                      label: 'Due Today',
                      value: summary.action_items_due_today,
                      icon: <TodayIcon fontSize="small" />,
                      color: sc.pending,
                    },
                  ]}
                />
                <Box sx={{ mt: 1.5 }}>
                  <MetricStrip
                    variant="inline"
                    items={[
                      {
                        label: 'Messages',
                        value: summary.unread_messages,
                        icon: <MessageIcon fontSize="small" />,
                        color: sc.interviewing,
                        onClick: () => navigate('/network/messages'),
                      },
                      {
                        label: 'Connections',
                        value: summary.pending_connections,
                        icon: <ConnectionsIcon fontSize="small" />,
                        color: sc.screening,
                        onClick: () => navigate('/network/connections'),
                      },
                      {
                        label: 'Profile',
                        value: `${summary.profile_completion}%`,
                        icon: <PersonIcon fontSize="small" />,
                        color: theme.palette.success.main,
                        onClick: () => navigate('/me'),
                      },
                    ]}
                  />
                </Box>
              </SectionCard>
            )}

            {/* ── Activity Feed ── */}
            <SectionCard
              header={
                  <SectionHeader
                    title="Recent Activity"
                    supportingText="Signals from the last 7 days across applications, documents, and your network."
                    size="compact"
                  />
              }
            >

                {feed.length === 0 ? (
                  <DSEmptyState
                    icon={<ActionIcon />}
                    title="No recent activity"
                    description="Your recent activity across leads, applications, and documents will appear here."
                    primaryAction={{
                      label: 'Review applications',
                      onClick: () => navigate('/applications'),
                      icon: <AppIcon />,
                    }}
                    layout="section"
                    compact
                  />
                ) : (
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <Stack spacing={0}>
                      {feed.map((item, idx) => {
                        const icon = FEED_ICONS[item.type] ?? <ActionIcon fontSize="small" />;
                        const path = feedEntityPath(item);
                        return (
                          <Box
                            key={`${item.entity_id}-${idx}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1.5,
                              py: 1.25,
                              ...(idx < feed.length - 1 && {
                                borderBottom: `1px solid ${theme.palette.divider}`,
                              }),
                              ...(path && {
                                cursor: 'pointer',
                                borderRadius: toRadiusPx(radiusTokens.xs),
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                              }),
                            }}
                            onClick={path ? () => navigate(path) : undefined}
                            role={path ? 'button' : undefined}
                            tabIndex={path ? 0 : undefined}
                            onKeyDown={path ? (e) => { if (e.key === 'Enter') navigate(path); } : undefined}
                          >
                            <Box
                              sx={{
                                width: 28, height: 28, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: theme.palette.primary.main,
                                flexShrink: 0, mt: 0.25,
                              }}
                            >
                              {icon}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }} noWrap>
                                {item.title}
                              </Typography>
                              {item.detail && (
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {item.detail}
                                </Typography>
                              )}
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ flexShrink: 0, whiteSpace: 'nowrap', mt: 0.25 }}
                            >
                              {relativeDate(item.timestamp)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>

                    {feed.length < feedTotal && (
                      <Button
                        size="small"
                        fullWidth
                        onClick={loadMoreFeed}
                        sx={{ mt: 1.5, textTransform: 'none' }}
                      >
                        Load more
                      </Button>
                    )}
                  </Box>
                )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      {/* ── Create / Edit Action Item Dialog ── */}
      <CreateActionItemDialog
        open={createDialogOpen}
        onClose={() => { setCreateDialogOpen(false); setEditItem(null); }}
        onCreated={handleActionCreated}
        editItem={editItem ?? undefined}
        onUpdated={handleActionUpdated}
      />

      {/* ── Inline due-date popover ── */}
      <Popover
        open={Boolean(dueDateAnchor)}
        anchorEl={dueDateAnchor}
        onClose={() => { setDueDateAnchor(null); setDueDateItem(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200 }}>
          <TextField
            type="date"
            size="small"
            label="Due date"
            value={dueDateValue}
            onChange={(e) => setDueDateValue(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => handleDueDateSave(null)}>Clear</Button>
            <Button size="small" variant="contained" onClick={() => handleDueDateSave(dueDateValue || null)} disabled={!dueDateValue}>
              Save
            </Button>
          </Stack>
        </Box>
      </Popover>

      {/* ── Inline status context menu ── */}
      <Menu
        open={Boolean(statusMenuAnchor)}
        anchorEl={statusMenuAnchor}
        onClose={() => { setStatusMenuAnchor(null); setStatusMenuItem(null); }}
      >
        {['pending', 'in_progress', 'completed', 'dismissed'].map((s) => (
          <MenuItem
            key={s}
            selected={statusMenuItem?.status === s}
            onClick={() => handleStatusChange(s)}
          >
            {statusLabel(s.replace('_', ' '))}
          </MenuItem>
        ))}
      </Menu>

    </Box>
  );
};

export default DashboardPage;
