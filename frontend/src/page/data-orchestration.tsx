import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getOrchestrations, OrchestrationEventRead } from '../service/data-orchestration';
import { erichLeadDataLake, loadLeadDatabase } from '../service/leads';

const actions = [
  { text: 'Erich Leads DataLake', action: erichLeadDataLake},
  { text: 'Load Leads From DataLake', action: loadLeadDatabase},
];

const DataOrchestrationPage: React.FC = () => {
  const [error, setError] = useState('');
  const [pipelines, setPipelines] = useState<OrchestrationEventRead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<OrchestrationEventRead | undefined>(undefined);


  useEffect(() => {
      fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await getOrchestrations();
            setPipelines(data);
        } catch (error) {
            setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRowClick = async (params: any) => {
        setSelectedPipeline(params.row as OrchestrationEventRead);
    };



    const columns: GridColDef[] = [
      { field: 'job_name', headerName: 'Job', width: 150 },
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
              <ListItem button key={index} onClick={async () => await item.action()}>
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
              <Typography> Job Name: {selectedPipeline.job_name}</Typography>
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
