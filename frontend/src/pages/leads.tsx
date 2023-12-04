import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Paper } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

interface JobLead {
    id: string;
    created_at: string;
    updated_at: string;
    title: string;
    company: string;
    description: string;
    location: string;
    salary: string;
    job_function: string;
    industries: string;
    employment_type: string;
    seniority_level: string;
    url: string;
  }

  interface JobSearchRequest {
    keywords: string;
    platform: string;
    location: string;
  }


const LeadsPage: React.FC = () => {
    const [jobLeads, setJobLeads] = useState<JobLead[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [jobSearch, setJobSearch] = useState<JobSearchRequest>({ keywords: '', platform: '', location: '' });

    const handleOpenDialog = () => setOpenDialog(true);
    const handleCloseDialog = () => setOpenDialog(false);

    const executeSearch = async () => {
        // Logic to execute search and trigger ETL pipeline
        handleCloseDialog();
        // Fetch and set job leads here
    };

    const columns: GridColDef[] = [
        { field: 'title', headerName: 'Title', width: 200 },
        { field: 'company', headerName: 'Company', width: 150 },
        // ... other columns based on JobLead properties
    ];

    return (
        <Box sx={{ p: 2 }}>
            <Button variant="contained" onClick={handleOpenDialog}>
                Create Job Search
            </Button>

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>Create a Job Search</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Keywords"
                        fullWidth
                        margin="dense"
                        value={jobSearch.keywords}
                        onChange={(e) => setJobSearch({ ...jobSearch, keywords: e.target.value })}
                    />
                    <TextField
                        label="Platform"
                        fullWidth
                        margin="dense"
                        value={jobSearch.platform}
                        onChange={(e) => setJobSearch({ ...jobSearch, platform: e.target.value })}
                    />
                    <TextField
                        label="Location"
                        fullWidth
                        margin="dense"
                        value={jobSearch.location}
                        onChange={(e) => setJobSearch({ ...jobSearch, location: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={executeSearch}>Search</Button>
                </DialogActions>
            </Dialog>

            <Box sx={{ height: 400, width: '100%', mt: 2 }}>
                <DataGrid
                    rows={jobLeads}
                    columns={columns}
                />
            </Box>
        </Box>
    );
};

export default LeadsPage;
