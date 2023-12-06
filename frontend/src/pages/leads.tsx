import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridPagination } from '@mui/x-data-grid';
import { Button, Box, Snackbar, Alert } from '@mui/material';
import LeadModal from '../component/lead-modal';
import { components } from '../schema.d';

type LeadRead = components['schemas']['LeadRead'];


const Leads: React.FC = () => {
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);


  // Fetch leads from your API
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        // Replace with your API call
        const response = await fetch(`/leads/?page=${page}&size=${pageSize}`);
        const data = await response.json();
        setLeads(data);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        setError('Failed to load leads');
      }
      setLoading(false);
    };

    fetchLeads();
  }, [page, pageSize]);

  // const handleAddLead = () => {
  //   setSelectedLead(null);
  //   setModalOpen(true);
  // };

  const handleEditLead = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      setSelectedLead(lead);
      setModalOpen(true);
    } else {
      // Handle the case where the lead is not found
      console.error('Lead not found');
      setError('Lead not found');
    }
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setModalOpen(true);
  };

  const handleSaveLead = (lead: Omit<LeadRead, 'id' | 'created_at' | 'updated_at'>) => {
    // Save lead logic
    // Update state with new or edited lead
    setModalOpen(false);
    // Refresh the list or update the state with new data
  };

  const handleCloseSnackbar = () => {
    setError(null);
  };


  const columns: GridColDef[] = [
    // { field: 'title', headerName: 'Title', width: 150 },
    // { field: 'company', headerName: 'Company', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    // { field: 'location', headerName: 'Location', width: 150 },
    // { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'job_function', headerName: 'Job Function', width: 150 },
    { field: 'industries', headerName: 'Industries', width: 150 },
    { field: 'employment_type', headerName: 'Employment Type', width: 150 },
    { field: 'seniority_level', headerName: 'Seniority Level', width: 150 },
    // { field: 'notes', headerName: 'Notes', width: 200 },
    { field: 'url', headerName: 'URL', width: 200 },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      width: 150,
      renderCell: (params) => (
        <Button onClick={() => handleEditLead(params.row.id)}>Edit</Button>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      width: 150,
      renderCell: (params) => (
        <Button onClick={() => handleEditLead(params.row.id)}>Edit</Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      {/* UI Elements here */}
      <Button variant="contained" onClick={handleAddLead} sx={{ mb: 2 }}>
        Add New Lead
      </Button>
      <DataGrid
        rows={leads}
        columns={columns}
        loading={loading}
        disableRowSelectionOnClick
        onRowDoubleClick={(params) => handleEditLead(params.id.toString())}
        pagination
        rowCount={100} // Replace with total row count from server
        components={{
          Pagination: GridPagination,
        }}
      />

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveLead}
        initialData={selectedLead ? {
          title: selectedLead.title,
          company: selectedLead.company,
          description: selectedLead.description,
          location: selectedLead.location,
          salary: selectedLead.salary,
          job_function: selectedLead.job_function,
          industries: selectedLead.industries,
          employment_type: selectedLead.employment_type,
          seniority_level: selectedLead.seniority_level,
          notes: selectedLead.notes,
          url: selectedLead.url,
          // Add additional fields as required by the LeadCreate schema
        } : undefined}
      />
      {error && (
        <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default Leads;
