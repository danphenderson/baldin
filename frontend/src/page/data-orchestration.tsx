import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getOrchestrations, OrchestrationEventRead } from '../service/data-orchestration';
import { loadLeadDatabase, erichLeadDataLake } from '../service/leads';

const actions = [
  { text: 'Load Lead Database', action: loadLeadDatabase},
  { text: 'Enrich Lead Datalake', action: erichLeadDataLake},
];

const DataOrchestrationPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<OrchestrationEventRead[]>([]);

  useEffect(() => {
        const fetchData = async () => {
            try {
                const orchestrationData = await getOrchestrations();
                setPipelines(orchestrationData);
            } catch (error) {
                console.error('Failed to fetch orchestration data:', error);
                // Handle errors appropriately (e.g., show a notification to the user)
            }
        };
        fetchData();
    }, []);

    // Define columns for DataGrid
    const columns: GridColDef[] = [
        { field: 'job_name', headerName: 'Status', width: 200 },
        { field: 'status', headerName: 'Status', width: 100 },
        // TODO: Need to unplick the source and destination URIs
        // { field: "source_uri", headerName: "Source URI", width: 200 },
        // { field: "destination_uri", headerName: "Destination URI", width: 200 },
        { field: 'created_at', headerName: 'Created At', width: 220 },
        { field: 'updated_at', headerName: 'Updated At', width: 220 },
        { field: 'error_message', headerName: 'Error Message', width: 100 },
        // Add actions like edit, delete here if needed
    ];

    return (
        <Box sx={{ height: 400, width: '100%', p: 2 }}>
          <List>
            {actions.map((item, index) => (
              <ListItem button key={index} onClick={async () => await item.action()}>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          <Typography variant='h4'>Orchestration Events</Typography>
            <DataGrid
                rows={pipelines}
                columns={columns}
            />

        </Box>
    );
};

export default DataOrchestrationPage;
