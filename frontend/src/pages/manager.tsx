import React, { useState, useEffect, useContext } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { UserContext } from '../context/user-context';
import { getApplications, deleteApplication, ApplicationRead } from '../services/application';

const ManagerPage: React.FC = () => {
    const { token } = useContext(UserContext);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [applications, setApplications] = useState<ApplicationRead[]>([]);

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
      { field: 'status', headerName: 'Status', width: 150 },
    ];

    return (
        <Box>
            {isLoading ? <CircularProgress /> : <DataGrid rows={applications} columns={columns} />}
            {error && <Typography color="error">{error}</Typography>}
        </Box>
    );
};

export default ManagerPage;