import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { UserContext } from '../context/user-context';
import { getApplications, createApplication, updateApplication, deleteApplication, ApplicationRead, ApplicationCreate, ApplicationUpdate } from '../services/application';
import ApplicationCreateModal from '../component/application-modal'; // Adjust the import path as necessary

const ManagerPage: React.FC = () => {
    const { token } = useContext(UserContext);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [applications, setApplications] = useState<ApplicationRead[]>([]);
    const [currentApplication, setCurrentApplication] = useState<ApplicationCreate | ApplicationUpdate | null>(null);
    const [openModal, setOpenModal] = useState(false);
    const [isNew, setIsNew] = useState(true);

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

    const handleOpenModal = (app: ApplicationRead | null) => {
      setCurrentApplication(app);
      setOpenModal(true);
      setIsNew(!app);
    };

    const handleCloseModal = () => {
      setOpenModal(false);
      setCurrentApplication(null);
    };

    const handleSave = async (application: ApplicationCreate | ApplicationUpdate) => {
      if (!token) {
        setError('Missing required fields');
        return;
      }
      setIsLoading(true);
      try {
        const savedApplication = isNew
          ? await createApplication(token, application as ApplicationCreate)
          : await updateApplication(token, application.id, application as ApplicationUpdate);
        setApplications([...applications.filter(a => a.id !== savedApplication.id), savedApplication]);
        handleCloseModal();
      } catch (error) {
        setError(`Failed to save application: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            <Button onClick={() => handleOpenModal(null)}>Add New Application</Button>
            {isLoading ? <CircularProgress /> : <DataGrid rows={applications} columns={columns} />}
            {error && <Typography color="error">{error}</Typography>}
            <ApplicationCreateModal
              open={openModal}
              onClose={handleCloseModal}
              onSave={handleSave}
              initialData={currentApplication as ApplicationCreate | undefined} // Cast to ApplicationCreate for simplicity; adjust as needed for your types
            />
        </Box>
    );
};

export default ManagerPage;
