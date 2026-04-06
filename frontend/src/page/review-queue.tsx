import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Toolbar,
  Typography,
  Snackbar,
  Collapse,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import EmptyState from '../component/common/empty-state';
import RichJsonDisplay from '../component/common/json-modal';
import {
  type ReviewItem,
  getReviewItems,
  approveReviewItem,
  rejectReviewItem,
  batchReviewItems,
} from '../service/review';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  crawler_run: 'Crawler Run',
  extraction_event: 'Extraction',
  lead: 'Lead',
};

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

type FeedbackSeverity = 'success' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReviewQueuePage: React.FC = () => {
  const { token } = useContext(UserContext);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Snackbar feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackSeverity, setFeedbackSeverity] = useState<FeedbackSeverity>('success');

  const showFeedback = (message: string, severity: FeedbackSeverity) => {
    setFeedbackMessage(message);
    setFeedbackSeverity(severity);
  };

  usePageToolbarHeader('Review Queue', `${items.length} pending`);

  // Counts per type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.item_type] = (counts[item.item_type] || 0) + 1;
    }
    return counts;
  }, [items]);

  const fetchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getReviewItems(token, filter || undefined);
      setItems(data);
      setSelected(new Set());
    } catch (e: unknown) {
      showFeedback(e instanceof Error ? e.message : 'Failed to load review items', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (item: ReviewItem) => {
    if (!token) return;
    try {
      await approveReviewItem(token, item.item_type, item.item_id);
      showFeedback(`${TYPE_LABELS[item.item_type] || 'Item'} approved`, 'success');
      fetchItems();
    } catch (e: unknown) {
      showFeedback(e instanceof Error ? e.message : 'Approve failed', 'error');
    }
  };

  const handleReject = async (item: ReviewItem) => {
    if (!token) return;
    try {
      await rejectReviewItem(token, item.item_type, item.item_id);
      showFeedback(`${TYPE_LABELS[item.item_type] || 'Item'} rejected`, 'success');
      fetchItems();
    } catch (e: unknown) {
      showFeedback(e instanceof Error ? e.message : 'Reject failed', 'error');
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (!token || selected.size === 0) return;
    setBatchLoading(true);
    const batchItems = items
      .filter((item) => selected.has(item.item_id))
      .map((item) => ({
        item_type: item.item_type,
        item_id: item.item_id,
        action,
      }));
    try {
      const result = await batchReviewItems(token, batchItems);
      if (result.errors.length > 0) {
        showFeedback(`Batch completed with errors: ${result.errors.join('; ')}`, 'error');
      } else {
        showFeedback(`${result.processed} item${result.processed !== 1 ? 's' : ''} ${action}d`, 'success');
      }
      fetchItems();
    } catch (e: unknown) {
      showFeedback(e instanceof Error ? e.message : 'Batch action failed', 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.item_id)));
    }
  };

  const filterLabel = (type: string, label: string) => {
    const count = typeCounts[type];
    return count ? `${label} (${count})` : label;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by type</InputLabel>
          <Select
            value={filter}
            label="Filter by type"
            onChange={(e) => setFilter(e.target.value)}
          >
            <MenuItem value="">All ({items.length})</MenuItem>
            <MenuItem value="crawler_run">{filterLabel('crawler_run', 'Crawler Runs')}</MenuItem>
            <MenuItem value="extraction_event">{filterLabel('extraction_event', 'Extractions')}</MenuItem>
            <MenuItem value="lead">{filterLabel('lead', 'Leads')}</MenuItem>
          </Select>
        </FormControl>

        {selected.size > 0 && (
          <Toolbar disableGutters sx={{ gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {selected.size} selected
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={batchLoading}
              startIcon={batchLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
              onClick={() => handleBatchAction('approve')}
            >
              Approve Selected
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={batchLoading}
              startIcon={batchLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
              onClick={() => handleBatchAction('reject')}
            >
              Reject Selected
            </Button>
          </Toolbar>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<RateReviewIcon />}
          title="No items pending review"
          description="All automation outputs have been reviewed."
        />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.size > 0 && selected.size < items.length}
                    checked={selected.size === items.length}
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Summary</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <React.Fragment key={item.item_id}>
                  <TableRow hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(item.item_id)}
                        onChange={() => toggleSelect(item.item_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={TYPE_LABELS[item.item_type] || item.item_type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {item.detail && (
                          <IconButton
                            size="small"
                            onClick={() => setExpandedId(expandedId === item.item_id ? null : item.item_id)}
                            sx={{
                              transform: expandedId === item.item_id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }}
                          >
                            <ExpandMoreIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {item.summary || '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={new Date(item.created_at).toLocaleString()}>
                        <span>{formatRelativeTime(item.created_at)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Approve">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApprove(item)}
                        >
                          <CheckCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleReject(item)}
                        >
                          <CancelOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  {item.detail && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, borderBottom: expandedId === item.item_id ? undefined : 'none' }}>
                        <Collapse in={expandedId === item.item_id} unmountOnExit>
                          <Box sx={{ py: 1.5, px: 2 }}>
                            <RichJsonDisplay jsonString={JSON.stringify(item.detail, null, 2)} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={!!feedbackMessage}
        autoHideDuration={4000}
        onClose={() => setFeedbackMessage(null)}
      >
        <Alert
          severity={feedbackSeverity}
          onClose={() => setFeedbackMessage(null)}
        >
          {feedbackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReviewQueuePage;
