import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getOrchestrationEvents, OrchestrationEventRead } from '../service/data-orchestration';
import { seedLeads } from '../service/leads';
import { useContext } from 'react';
import { UserContext } from '../context/user-context';
import MessageAlert from '../component/common/alert';
import RichJsonDisplay from '../component/common/json-modal';
import { seedUsers } from '../service/users';
import { seedCertificates } from '../service/certificates';
import { seedEducations } from '../service/education';
import { seedExperiences } from '../service/experiences';
import { seedContacts } from '../service/contacts';
import { seedSkills } from '../service/skills';


const DataOrchestrationPage: React.FC = () => {

  const { token } = useContext(UserContext);
  const [error, setError] = useState('');
  const [pipelines, setPipelines] = useState<OrchestrationEventRead[]>([]);
  const [loading, setIsLoading] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<OrchestrationEventRead | undefined>(undefined);

  const actions = [
    { text: 'Seed Leads', action: () => seedLeads(token || '')},
    { text: 'Seed Users', action: () => seedUsers(token || '')},
    { text: 'Seed Certificates', action: () => seedCertificates(token || '')},
    { text: 'Seed Educations', action: () => seedEducations(token || '')},
    { text: 'Seed Experience', action: () => seedExperiences(token || '')},
    { text: 'Seed Contacts', action: () => seedContacts(token || '')},
    { text: 'Seed Skills', action: () => seedSkills(token || '')},
    { text: 'Refresh', action: () => fetchState()},
    { text: 'Seed All', action: () => {
      seedLeads(token || '');
      seedUsers(token || '');
      seedCertificates(token || '');
      seedEducations(token || '');
      seedExperiences(token || '');
      seedContacts(token || '');
      seedSkills(token || '');
      fetchState();
    }},
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
    {
      field: 'status',
      headerName: 'Status',
      width: 100
    },
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
    { field: 'payload',
      headerName: 'Payload',
      width: 100,
      valueGetter: (params) => JSON.stringify(params.row.payload),
    },
    {
      field: 'message',
      headerName: 'Message',
      width: 300
    },
    // Add actions like edit, delete here if needed
  ];

  return (
    <Stack spacing={8}>
      {/* Page Title */}
      <Typography variant="h4">Data Orchestration</Typography>
        <Stack spacing={2}>
          {actions.map((item, index) => (
            <Button key={index} variant="contained" color="primary" onClick={item.action}>{item.text}</Button>
          ))}
        </Stack>
        {loading ? <MessageAlert severity='info' message='Loading Page'/> : (
          <DataGrid
            rows={pipelines}
            columns={columns}
            onRowClick={handleRowClick}
            autoHeight
          />
        )}
        {selectedPipeline && (
          <Stack spacing={2}>
            <Typography variant="h6">Pipeline Details</Typography>
            <Typography> <strong>Status:</strong> {selectedPipeline.status}</Typography>
            <Typography> <strong>Source URI:</strong> {selectedPipeline.source_uri?.name}</Typography>
            <Typography> <strong>Destination URI</strong> {selectedPipeline.destination_uri?.name}</Typography>
            <Typography>
              <strong>Payload</strong>
            </Typography>
            {selectedPipeline?.payload ? <RichJsonDisplay jsonString={JSON.stringify(selectedPipeline.payload, null, 2)}/> : 'No payload'}
            <Typography> Message: {selectedPipeline?.message}</Typography>
          </Stack>
        )}
      {error && <Typography color="error">{error}</Typography>}
    </Stack>
  );
};

export default DataOrchestrationPage;
