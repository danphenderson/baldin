import React, { useState, useEffect, useContext } from 'react';
import { Box, CircularProgress, Typography, Stack, Button } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { UserContext } from '../context/user-context';
import { getApplications, deleteApplication, ApplicationRead } from '../services/application';

const ManagerPage: React.FC = () => {
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
            setSelectedApplication(null); // Clear selection if the deleted application was selected
          }
        } catch (error) {
          setError(`Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsLoading(false);
        }
    };

    const columns: GridColDef[] = [
      { field: 'lead_title', headerName: 'Lead', width: 150 },
      { field: 'lead_company', headerName: 'Company', width: 150 },
      { field: 'lead_location', headerName: 'Location', width: 150 },
      { field: 'lead_salary', headerName: 'Salary', width: 150 },
      { field: 'action', headerName: 'Action', width: 150, renderCell: (params) => (
          <Button color="error" onClick={() => handleDelete(params.id.toString())}>Delete</Button>
        )
      },
    ];

    return (
        <Box>
            {isLoading ? <CircularProgress /> : (
              <DataGrid
                rows={applications}
                columns={columns}
                onRowClick={(params) => setSelectedApplication(params.row as ApplicationRead)}
              />
            )}
            {error && <Typography color="error">{error}</Typography>}

            {selectedApplication && (
                <Box sx={{ mt: 4, overflowY: 'auto', maxHeight: 300, border: '1px solid #ccc', p: 2, bgcolor: 'background.paper' }}>
                    <Typography variant="h6">Application Details</Typography>
                    <Stack spacing={2}>
                        <Typography><strong>Lead:</strong> {selectedApplication.lead.title}</Typography>
                        <Typography><strong>Company:</strong> {selectedApplication.lead.company}</Typography>
                        <Typography><strong>Location:</strong> {selectedApplication.lead.location}</Typography>
                        <Typography><strong>Salary:</strong> {selectedApplication.lead.salary}</Typography>
                        {/* Display more fields as needed */}
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

export default ManagerPage;
