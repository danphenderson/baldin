import React, { useState, useEffect, useContext, useCallback } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Stack, Typography, Button, Snackbar, Alert, CircularProgress, Paper, Box } from '@mui/material';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';

import { ExtractorRead, ExtractorResponse, getExtractors } from '../service/extractor';

import ExtractRunModal from '../component/extractor-modal';
import { ExtractorCreateModal, ExampleCreateModal } from '../component/extractor-modal';
import RichJsonDisplay from '../component/common/json-modal';

type FeedbackSeverity = 'success' | 'error';

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
