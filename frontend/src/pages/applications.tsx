import React, { useState, useEffect, useContext } from 'react';
import { Box, CircularProgress, Typography, Stack, Button } from '@mui/material';
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid';
import { UserContext } from '../context/user-context';
import {
  getApplications,
  deleteApplication,
  updateApplication,
  ApplicationRead,
  ApplicationUpdate
} from '../services/application';

const ApplicationsPage: React.FC = () => {
    const { token } = useContext(UserContext);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [applications, setApplications] = useState<ApplicationRead[]>([]);
    const [selectedApplication, setSelectedApplication] = useState<ApplicationRead | null>(null);

    useEffect(() => {
      if (token && applications.length === 0) fetchApplications();
    }, [token]);

    const fetchApplications = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const apps = await getApplications(token);
        setApplications(apps);
      } catch (error) {
        setError(`Failed to fetch applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    const handleDelete = async (id: string) => {
        if (!token) {
            setError('Authorization token is missing');
            return;
        }
        setIsLoading(true);
        try {
          await deleteApplication(token, id);
          setApplications(applications.filter(a => a.id !== id));
          if (selectedApplication && selectedApplication.id === id) {
            setSelectedApplication(null);
          }
        } catch (error) {
          setError(`Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsLoading(false);
        }
    };

    const handleProcessRowUpdate = async (newRow: GridRowModel) => {
      if (!token) {
          setError('Authorization token is missing');
          return newRow;
      }
      setIsLoading(true);
      try {
          // Prepare the update payload with only the fields allowed in ApplicationUpdate
          const updatedApplication: ApplicationUpdate = {
              status: newRow.status as string,
          };
          // Pass the id as a separate argument to the updateApplication function
          await updateApplication(token, newRow.id.toString(), updatedApplication);
          const updatedApplications = applications.map(app =>
              app.id === newRow.id ? { ...app, status: newRow.status } : app
          );
          setApplications(updatedApplications);
          return newRow;
      } catch (error) {
          setError(`Failed to update application: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return newRow;
      } finally {
          setIsLoading(false);
      }
    };
    const columns: GridColDef[] = [
      { field: 'lead_title', headerName: 'Lead', width: 150 },
      { field: 'lead_company', headerName: 'Company', width: 150 },
      { field: 'lead_location', headerName: 'Location', width: 150 },
      { field: 'lead_salary', headerName: 'Salary', width: 150 },
      {
        field : 'status',
        headerName: 'Status',
        width: 150,
        editable: true,
      }
    ];

    return (
        <Box>
            {isLoading ? <CircularProgress /> : (
              <DataGrid
                rows={applications}
                columns={columns}
                processRowUpdate={handleProcessRowUpdate}
                onRowClick={(params) => setSelectedApplication(params.row as ApplicationRead)}
              />
            )}
            {error && <Typography color="error">{error}</Typography>}

            {selectedApplication && (
            <Box sx={{ mt: 4, overflowY: 'auto', maxHeight: 300, border: '1px solid #ccc', p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="h6">Details</Typography>
              <Stack spacing={2}>
                <Typography><strong>Lead:</strong> {selectedApplication.lead.title}</Typography>
                <Typography><strong>Company:</strong> {selectedApplication.lead.company}</Typography>
                <Typography><strong>Location:</strong> {selectedApplication.lead.location}</Typography>
                <Typography><strong>Salary:</strong> {selectedApplication.lead.salary}</Typography>
                <Typography><strong>Status:</strong> {selectedApplication.status}</Typography>
                <Button onClick={() => alert('Create Cover Letter functionality not implemented')}>Generate Cover Letter</Button>
                <Button onClick={() => alert('Create Resume functionality not implemented')}>Generate Resume</Button>
                <Button onClick={() => handleDelete(selectedApplication.id)}>Delete</Button>
              </Stack>
            </Box>
          )}
        </Box>
    );
};

export default ApplicationsPage;
