import React, { useState, useEffect, useContext, useCallback } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Stack, Typography, Button, Snackbar, Alert, CircularProgress, Paper, Box, Switch, FormControlLabel, Collapse, IconButton, Tooltip, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';

import { ExtractorRead, ExtractorResponse, getExtractors, updateExtractor, ExtractorVersionRead, getExtractorVersions } from '../service/extractor';

import ExtractRunModal from '../component/extractor-modal';
import { ExtractorCreateModal, ExampleCreateModal } from '../component/extractor-modal';
import RichJsonDisplay from '../component/common/json-modal';

type FeedbackSeverity = 'success' | 'error';

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

// ---------------------------------------------------------------------------
// Version History sub-component
// ---------------------------------------------------------------------------

const VersionHistoryPanel: React.FC<{ extractorId: string; token: string | null }> = ({ extractorId, token }) => {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ExtractorVersionRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !fetched && token) {
      setLoading(true);
      try {
        const data = await getExtractorVersions(token, extractorId);
        setVersions(data);
        setFetched(true);
      } catch {
        // silently fail — empty list is fine
      } finally {
        setLoading(false);
      }
    }
  };

  // Reset when extractor changes
  useEffect(() => {
    setOpen(false);
    setVersions([]);
    setFetched(false);
  }, [extractorId]);

  return (
    <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
      <Box
        onClick={toggle}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <HistoryIcon fontSize="small" color="action" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Version History</Typography>
        <IconButton size="small" sx={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
          ) : versions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No version history yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {versions.map((v) => (
                <Box
                  key={v.id}
                  sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.5,
                    p: 1.5, borderRadius: '4px', border: '1px solid', borderColor: 'divider',
                  }}
                >
                  <Chip label={`v${v.version_number}`} size="small" color="primary" variant="outlined" />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {v.instruction ? v.instruction.slice(0, 100) + (v.instruction.length > 100 ? '…' : '') : '(no instruction)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {v.version_hash.slice(0, 8)} · {formatRelativeTime(v.created_at)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ExtractorPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [extractorCreateModalOpen, setCreateExtractorOpen] = useState(false);
  const [extractors, setExtractors] = useState<ExtractorRead[]>([]);
  const [selectedExtractor, setSelectedExtractor] = useState<ExtractorRead | null>(null);
  const [extractRunnerOpen, setExtractRunnerOpen] = useState(false);
  const [createExtractorExampleOpen, setCreateExtractorExampleOpen] = useState(false);
  const [runResult, setRunResult] = useState<ExtractorResponse | null>(null);

  // Unified feedback snackbar
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackSeverity, setFeedbackSeverity] = useState<FeedbackSeverity>('success');

  const showFeedback = (message: string, severity: FeedbackSeverity) => {
    setFeedbackMessage(message);
    setFeedbackSeverity(severity);
  };

  usePageToolbarHeader('Extractors', `${extractors.length} configured`);

  const fetchExtractors = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      const data = await getExtractors(token);

      if (!data) {
        showFeedback('Failed to load extractors', 'error');
        return;
      }
      setExtractors(data);
    } catch (err) {
      showFeedback(typeof err === 'string' ? err : 'Failed to load extractors', 'error');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchExtractors();
  }, [fetchExtractors]);

  // --- Create extractor completion ---
  const handleCreateSuccess = useCallback((created: ExtractorRead) => {
    setCreateExtractorOpen(false);
    setExtractors((prev) => [...prev, created]);
    setSelectedExtractor(created);
    showFeedback(`Extractor "${created.name}" created`, 'success');
  }, []);

  const handleCreateError = useCallback((message: string) => {
    showFeedback(message, 'error');
  }, []);

  // --- Run extractor completion ---
  const handleRunSuccess = useCallback((result: ExtractorResponse) => {
    setExtractRunnerOpen(false);
    setRunResult(result);
    showFeedback(
      result.content_too_long
        ? 'Extraction completed (content was truncated)'
        : 'Extraction completed',
      'success',
    );
  }, []);

  const handleRunError = useCallback((message: string) => {
    showFeedback(message, 'error');
  }, []);

  // --- Create example completion ---
  const handleExampleCreateSuccess = useCallback(() => {
    setCreateExtractorExampleOpen(false);
    fetchExtractors();
    showFeedback('Example added', 'success');
  }, [fetchExtractors]);

  const handleExampleCreateError = useCallback((message: string) => {
    showFeedback(message, 'error');
  }, []);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { field: 'instruction', headerName: 'Instruction', width: 300 },
  ];

  return (
    <Stack spacing={3}>
      {loading ? (
        <>
          <CircularProgress />
          <Typography variant="body1">Loading extractors...</Typography>
        </>
      ) : (
        <Stack spacing={2}>
          <Button variant="contained" color="primary" onClick={() => setCreateExtractorOpen(true)}>Create Extractor</Button>
          <ExtractorCreateModal
            open={extractorCreateModalOpen}
            onClose={() => setCreateExtractorOpen(false)}
            onSave={handleCreateSuccess}
            onError={handleCreateError}
          />
          <DataGrid
            rows={extractors}
            columns={columns}
            onRowClick={(params) => {
              setSelectedExtractor(params.row as ExtractorRead);
              setRunResult(null);
            }}
            autoHeight
            checkboxSelection
          />
          {selectedExtractor && (
            <Stack spacing={2}>

              {/* Run Extractor */}
              <Stack spacing={2}>
                <Button variant="contained" color="primary" onClick={() => setExtractRunnerOpen(true)}>Run Extractor</Button>
                <ExtractRunModal
                  open={extractRunnerOpen}
                  onClose={() => setExtractRunnerOpen(false)}
                  extractorId={selectedExtractor.id}
                  onSave={handleRunSuccess}
                  onError={handleRunError}
                />
              </Stack>

              {/* Run Result */}
              {runResult && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="h6">Run Result</Typography>
                    {runResult.content_too_long && (
                      <Alert severity="warning" variant="outlined">Content was too long and may have been truncated.</Alert>
                    )}
                    {runResult.data && runResult.data.length > 0 ? (
                      <RichJsonDisplay jsonString={JSON.stringify(runResult.data, null, 2)} />
                    ) : (
                      <Typography variant="body2" color="text.secondary">No data returned.</Typography>
                    )}
                    <Box>
                      <Button size="small" onClick={() => setRunResult(null)}>Dismiss</Button>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {/* Selected Extractor Details */}
              <Typography variant="h5">Extractor Details</Typography>
              <Typography variant="body1">ID: {selectedExtractor.id}</Typography>
              <Typography variant="body1">Name: {selectedExtractor.name}</Typography>
              <Typography variant="body1">Description: {selectedExtractor.description}</Typography>
              <Typography variant="body1">Instruction: {selectedExtractor.instruction}</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedExtractor.requires_approval ?? false}
                    onChange={async (e) => {
                      if (!token) return;
                      try {
                        const updated = await updateExtractor(token, selectedExtractor.id, { requires_approval: e.target.checked });
                        setSelectedExtractor(updated);
                        setExtractors((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
                        showFeedback(`Human review ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
                      } catch (err) {
                        showFeedback(err instanceof Error ? err.message : 'Failed to update', 'error');
                      }
                    }}
                  />
                }
                label="Require human review"
              />

              {/* Display Examples */}
              <Stack spacing={2}>
                <Typography variant="h6">Examples</Typography>
                <RichJsonDisplay jsonString={JSON.stringify(selectedExtractor.extractor_examples)} />
              </Stack>

              {/* Create Example */}
              <Stack spacing={2}>
                <Button variant="contained" color="primary" onClick={() => setCreateExtractorExampleOpen(true)}>Create Example</Button>
                <ExampleCreateModal
                  open={createExtractorExampleOpen}
                  extractorId={selectedExtractor.id}
                  onClose={() => setCreateExtractorExampleOpen(false)}
                  onSave={handleExampleCreateSuccess}
                  onError={handleExampleCreateError}
                />
              </Stack>

              {/* Display Json Schema */}
              <Stack spacing={2}>
                <Typography variant="h6">Json Schema</Typography>
                <RichJsonDisplay jsonString={JSON.stringify(selectedExtractor.json_schema)} />
              </Stack>

              {/* Version History */}
              <VersionHistoryPanel extractorId={selectedExtractor.id} token={token} />
            </Stack>
          )}
        </Stack>
      )}

      <Snackbar open={!!feedbackMessage} autoHideDuration={6000} onClose={() => setFeedbackMessage(null)}>
        <Alert severity={feedbackSeverity} onClose={() => setFeedbackMessage(null)}>{feedbackMessage}</Alert>
      </Snackbar>
    </Stack>
  );
};

export default ExtractorPage;
