import React, { useState, useEffect } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { getApplications, createApplication, updateApplication, deleteApplication, ApplicationRead, ApplicationCreate, ApplicationUpdate } from '../services/application';

const ApplicationPage: React.FC = () => {
    const [applications, setApplications] = useState<ApplicationRead[]>([]);
    const [currentApplication, setCurrentApplication] = useState<ApplicationRead | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [isNew, setIsNew] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            const apps = await getApplications();
            setApplications(apps);
        };
        fetchApplications();
    }, []);

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
        if (currentApplication) {
            const savedApplication = isNew
                ? await createApplication(currentApplication as ApplicationCreate)
                : await updateApplication(currentApplication.id.toString(), currentApplication as ApplicationUpdate);
            setApplications([...applications.filter(a => a.id !== savedApplication.id), savedApplication]);
        }
        handleCloseDialog();
    };

    const handleDelete = async (id: number) => {
        await deleteApplication(id.toString());
        setApplications(applications.filter(a => a.id !== id.toString()));
    };

    // Define columns for DataGrid
    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 150 },
        // ... other fields
        { field: 'actions', headerName: 'Actions', width: 150, renderCell: (params) => (
            <>
                <Button onClick={() => handleOpenDialog(params.row)}>Edit</Button>
                <Button onClick={() => handleDelete(params.row.id)}>Delete</Button>
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
