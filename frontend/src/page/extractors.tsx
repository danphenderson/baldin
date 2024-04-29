import React, { useState, useEffect, useContext } from 'react';
import { DataGrid, GridColDef  } from '@mui/x-data-grid';
import { Stack, Typography, Button, Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { UserContext } from '../context/user-context';

import { ExtractorRead, getExtractors } from '../service/extractor';

// Importing in another component
import ExtractRunModal from '../component/extractor-modal';
import { ExtractorCreateModal } from '../component/extractor-modal';

const ExtractorPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createExtractorExampleOpen, setCreateExtractorExampleOpen] = useState(false);
  const [extractors, setExtractors] = useState<ExtractorRead[]>([]);
  const [selectedExtractor, setSelectedExtractor] = useState<ExtractorRead | null>(null);
  const [extractRunnerOpen, setExtractRunnerOpen] = useState(false);
  const [extractorCreateModalOpen, setCreateExtractorOpen] = useState(false);

  const fetchExtractors = async () => {
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
    } catch (error) {
      console.error('Failed to fetch extractors:', error);
      setError(typeof error === 'string' ? error : 'Failed to load extractors');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExtractors();
  }, []);

  const columns: GridColDef[] = [
    { field: 'Extractor', headerName: 'Name', width: 200 },
    { field: 'description', headerName: 'Description', width: 300 },
    { field: 'instruction', headerName: 'Instruction', width: 300 },
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Extractors</Typography>
      {loading ? (
        <>
          <CircularProgress/>
          <Typography variant="body1">Loading extractors...</Typography>
        </>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" color="primary" onClick={() => setCreateExtractorOpen(true)}>Create Extractor</Button>
          {extractorCreateModalOpen && (
            <ExtractorCreateModal
              open={extractorCreateModalOpen}
              onClose={() => setCreateExtractorOpen(false)}
              onSave={() => fetchExtractors()}
            />
          )}
          <Typography variant="body1">Select an extractor to view details</Typography>
          <DataGrid
            rows={extractors}
            columns={columns}
            onRowClick={(params) => setSelectedExtractor(params.row as ExtractorRead)}
            autoHeight
            checkboxSelection
          />
          {/* TODO: rows are selectable, but do not allow edits in the table */}
          {selectedExtractor && (
            <Stack spacing={2}>
              <Typography variant="h5">Selected Extractor</Typography>
              <Typography variant="body1">ID: {selectedExtractor.id}</Typography>
              <Typography variant="body1">Name: {selectedExtractor.name}</Typography>
              <Typography variant="body1">Description: {selectedExtractor.description}</Typography>
              <Typography variant="body1">Instruction: {selectedExtractor.instruction}</Typography>
              <Typography variant="body1">Examples: {selectedExtractor.extractor_examples?.toString()}</Typography>
              <Typography variant="body1">Target Schema: {JSON.stringify(selectedExtractor.json_schema)}</Typography>
              <Button variant="contained" color="primary" onClick={() => setExtractRunnerOpen(true)}>Run Extractor</Button>
              <ExtractRunModal
                open={extractRunnerOpen}
                onClose={() => setExtractRunnerOpen(false)}
                extractorId={selectedExtractor.id}
                onSave={() => console.log('Run extractor')}
              /> // TODO: Update backend to have this run as a background task
            </Stack>
          )}

        </Stack>
      )}
      {error && (
        <Snackbar open autoHideDuration={6000}>
          <Alert severity="error">{error}</Alert>
        </Snackbar>
      )}
    </Stack>
  );
}

export default ExtractorPage;
