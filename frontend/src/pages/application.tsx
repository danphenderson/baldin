import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { UserContext } from '../context/user-context';
import { getApplications, createApplication, updateApplication, deleteApplication, ApplicationRead, ApplicationCreate, ApplicationUpdate } from '../services/application';

const ApplicationPage: React.FC = () => {
    const { token } = useContext(UserContext);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [applications, setApplications] = useState<ApplicationRead[]>([]);
    const [currentApplication, setCurrentApplication] = useState<ApplicationRead | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [isNew, setIsNew] = useState(true);

    const fetchApplications = async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const apps = await getApplications(token);
        setApplications(apps);
      } catch (error) {
        if (error instanceof Error) {
          setError(`Failed to fetch application: ${error.message || error}`);
          console.error(error); // Log error for debugging
        }
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      if (token && !applications.length)
        fetchApplications();
    }, [token, applications]);

    const handleOpenDialog = (app: ApplicationRead | null) => {
      setCurrentApplication(app);
      setOpenDialog(true);
      setIsNew(!app);
    };

    const handleCloseDialog = () => {
      setOpenDialog(false);
      setCurrentApplication(null);
    };

    const handleSave = async () => {
      if (!token) {
        setError('Authorization token is missing');
        return;
      }
      try {
        if (currentApplication) {
          const savedApplication = isNew
            ? await createApplication(token, currentApplication as ApplicationCreate)
            : await updateApplication(token, currentApplication.id.toString(), currentApplication as ApplicationUpdate);
          setApplications([...applications.filter(a => a.id !== savedApplication.id), savedApplication]);
        }
        handleCloseDialog();
      } catch (error) {
        if (error instanceof Error) {
          setError(`Failed to save application: ${error.message || error}`);
          console.error(error); // Log error for debugging
        }
      }
    };

    const handleDelete = async (id: number) => {
        if (!token) {
            setError('Authorization token is missing');
            return;
        }
        try {
          await deleteApplication(token, id.toString());
          setApplications(applications.filter(a => a.id !== id.toString()));
        } catch (error) {
          if (error instanceof Error) {
            setError(`Failed to delete application: ${error.message || error}`);
            console.error(error); // Log error for debugging
          }
        }
    };

    // Define columns for DataGrid
    const columns: GridColDef[] = [
        //{ field: 'id', headerName: 'ID', width: 70 },
        { field: 'lead_title', headerName: 'Lead', width: 150 },
        { field: 'lead_company', headerName: 'Company', width: 150 },
        { field: 'lead_location', headerName: 'Location', width: 150 },
        { field: 'lead_salary', headerName: 'Salary', width: 150 },
        { field: 'lead_industies', headerName: 'Industry', width: 150 },

        // ... other fields
        { field: 'actions', headerName: 'Generate', width: 300, renderCell: (params) => (
          <>
            <Button onClick={() => handleOpenDialog(params.row)}>Resume</Button>
            <Button onClick={() => handleDelete(params.row.id)}>Cover Letter</Button>
          </>
        )},
    ];

    return (
        <Box>
            <Button onClick={() => handleOpenDialog(null)}>Add New Application</Button>
            <DataGrid rows={applications} columns={columns} />

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>{isNew ? 'Add New Application' : 'Edit Application'}</DialogTitle>
                <DialogContent>
                    {/* Create form fields based on ApplicationRead structure */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave}>{isNew ? 'Add' : 'Save'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ApplicationPage;
