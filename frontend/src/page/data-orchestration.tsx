import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getOrchestrationEvents, OrchestrationEventRead } from '../service/data-orchestration';
import { erichLeadDataLake, loadLeadDatabase } from '../service/leads';
import { useContext } from 'react';
import { UserContext } from '../context/user-context';



const DataOrchestrationPage: React.FC = () => {

  const { token } = useContext(UserContext);
  const [error, setError] = useState('');
  const [pipelines, setPipelines] = useState<OrchestrationEventRead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<OrchestrationEventRead | undefined>(undefined);
  const actions = [
    { text: 'Erich Leads DataLake', action: (event: React.MouseEvent<HTMLDivElement>) => erichLeadDataLake() },
    { text: 'Load Leads From DataLake', action: (event: React.MouseEvent<HTMLDivElement>) => loadLeadDatabase(token || '', event) },
  ];
  useEffect(() => {
    if (token) {
        fetchState();
    }
  } , [token]);

  const fetchState = async () => {
    if (!token) {
      setError('Authorization token is missing');
      return;
    }
    setIsLoading(true);
    try {
      const pipelines = await getOrchestrationEvents(token);
      setPipelines(pipelines);
    } catch (error) {
      setError(`Failed to fetch pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = async (params: any) => {
    setSelectedPipeline(params.row as OrchestrationEventRead);
  };


  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Job', width: 150 },
    { field: 'status', headerName: 'Status', width: 100 },
    {
      field: "source_uri",
      headerName: "Source URI",
      width: 350,
      valueGetter: (params) => params.row.source_uri.name,
    },
    {
      field: "destination_uri",
      headerName: "Destination URI",
      width: 350,
      valueGetter: (params) => params.row.destination_uri.name,
    },
    // Add actions like edit, delete here if needed
  ];

  return (
      <Box>
        <List>
          {actions.map((item, index) => (
            <ListItem button key={index} onClick={async (event) => await item.action(event)}>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        {isLoading ? <CircularProgress/> : (
          <DataGrid
            rows={pipelines}
            columns={columns}
            onRowClick={handleRowClick}
            autoHeight
          />
        )}
        {selectedPipeline && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="h4">Pipeline Details</Typography>
            <Typography> Job Name: {selectedPipeline.name}</Typography>
            <Typography> Status: {selectedPipeline.status}</Typography>
            <Typography> Source URI: {selectedPipeline.source_uri?.name}</Typography>
            <Typography> Destination URI: {selectedPipeline.destination_uri?.name}</Typography>
          </Stack>
        )}
        {error && <Typography color="error">{error}</Typography>}
      </Box>
  );
};

export default DataOrchestrationPage;
