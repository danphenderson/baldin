import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box } from '@mui/material';
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid';

// Define a type for pipeline data
type Pipeline = {
    id: number;
    name: string;
    status: 'Pass' | 'Fail' | 'InProgress';
    jobSearchRef: string;
};

const EtlPage: React.FC = () => {
    const [pipelines, setPipelines] = useState<Pipeline[]>([
        { id: 1, name: 'Pipeline 1', status: 'Pass', jobSearchRef: 'Job1' },
        // ... other pipelines
    ]);

    const [openDialog, setOpenDialog] = useState(false);
    const [currentPipeline, setCurrentPipeline] = useState<Pipeline | null>(null);

    const handleOpenDialog = (pipeline: Pipeline | null) => {
        setCurrentPipeline(pipeline);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCurrentPipeline(null);
    };

    // Define columns for DataGrid
    const columns: GridColDef[] = [
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'status', headerName: 'Status', width: 110 },
        { field: 'jobSearchRef', headerName: 'Job Search Reference', width: 200 },
        // Add actions like edit, delete here if needed
    ];

    return (
        <Box sx={{ height: 400, width: '100%', p: 2 }}>
            <DataGrid
                rows={pipelines}
                columns={columns}
                onRowClick={(params: GridRowModel) => handleOpenDialog(params as Pipeline)}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>{currentPipeline ? 'Edit Pipeline' : 'Add New Pipeline'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Name"
                        fullWidth
                        margin="dense"
                        value={currentPipeline?.name || ''}
                        onChange={(e) => setCurrentPipeline({ ...currentPipeline, name: e.target.value } as Pipeline)}
                    />
                    {/* Include other fields with similar structure */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={() => {/* Handle save logic */}}>
                        {currentPipeline ? 'Save Changes' : 'Add Pipeline'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EtlPage;
