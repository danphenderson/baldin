import React, { useState, useEffect, useContext, useCallback } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Stack, Typography, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';

import { ExtractorRead, getExtractors } from '../service/extractor';

import ExtractRunModal from '../component/extractor-modal';
import { ExtractorCreateModal, ExampleCreateModal } from '../component/extractor-modal';
import RichJsonDisplay from '../component/common/json-modal';

const ExtractorPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractorCreateModalOpen, setCreateExtractorOpen] = useState(false);
  const [extractors, setExtractors] = useState<ExtractorRead[]>([]);
  const [selectedExtractor, setSelectedExtractor] = useState<ExtractorRead | null>(null);
  const [extractRunnerOpen, setExtractRunnerOpen] = useState(false);
  const [createExtractorExampleOpen, setCreateExtractorExampleOpen] = useState(false);

  usePageToolbarHeader('Extractors', `${extractors.length} configured`);

  const fetchExtractors = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }
      const data = await getExtractors(token);

      if (!data) {
        console.error('Failed to fetch extractors');
        setError('Failed to load extractors');
        return;
      }
      setExtractors(data);
    } catch (err) {
      console.error('Failed to fetch extractors:', err);
      setError(typeof err === 'string' ? err : 'Failed to load extractors');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchExtractors();
  }, [fetchExtractors]);

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
          {extractorCreateModalOpen && (
            <ExtractorCreateModal
              open={extractorCreateModalOpen}
              onClose={() => setCreateExtractorOpen(false)}
              onSave={() => fetchExtractors()}
            />
          )}
          <DataGrid
            rows={extractors}
            columns={columns}
            onRowClick={(params) => setSelectedExtractor(params.row as ExtractorRead)}
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
                  onSave={() => console.log('Run extractor')}
                />
              </Stack>

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
                  onSave={() => {
                    fetchExtractors();
                    setCreateExtractorExampleOpen(false);
                  }}
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

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </Stack>
  );
};

export default ExtractorPage;
