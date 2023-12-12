import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridPaginationModel  } from '@mui/x-data-grid';
import { Button, Box, Snackbar, Alert } from '@mui/material';
import CreateLeadModal from '../component/lead-modal';


import { LeadRead, LeadsPaginatedRead, LeadCreate, LeadUpdate, getLeads, createLead, updateLead  } from '../services/lead';


const Leads: React.FC = () => {
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadRead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = React.useState({
    page_size: 5,
    page: 1,
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeads(paginationModel);

      if (!data) {
        console.error('Failed to fetch leads');
        setError('Failed to load leads');
        return;
      }
      setLeads(data.leads);
      if (data.total_count) {
        setTotalLeads(data.total_count);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      setError(typeof error === 'string' ? error : 'Failed to load leads');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [paginationModel.page, paginationModel.page_size]);

  const handlePaginationModelChange = (model: GridPaginationModel) => {
    setPaginationModel({
      page_size: model.pageSize,
      page: model.page + 1, // GridPaginationModel's page index starts at 0, so add 1 for your API
    });
  };

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

  const handleSaveLead = async (leadData: LeadCreate | LeadUpdate) => {
    setModalOpen(false);
    setLoading(true);

    try {
      const savedLead = selectedLead?.id
        ? await updateLead(selectedLead.id, leadData as LeadUpdate)
        : await createLead(leadData as LeadCreate);

      if (savedLead) {
        await fetchLeads();  // Refresh the leads list
      } else {
        throw new Error('Failed to save lead');
      }
    } catch (error) {
      setError('Error saving lead');
    }
    setLoading(false);
  };

  const handleCloseSnackbar = () => {
    setError(null);
  };


  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', width: 150 },
    { field: 'company', headerName: 'Company', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    // { field: 'location', headerName: 'Location', width: 150 },
    // { field: 'salary', headerName: 'Salary', width: 130 },
    // { field: 'job_function', headerName: 'Job Function', width: 150 },
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
  ];

  return (
    <div>
    <Box sx={{ p: 2 }}>
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
        pageSizeOptions={[5, 10]}
        rowCount={totalLeads}
        paginationMode="server"
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: paginationModel.page_size,
              page: paginationModel.page  // default value will be used if not passed */
            },
          },
        }}
        onPaginationModelChange={handlePaginationModelChange}
      />
      <CreateLeadModal
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
    </div>
  );
};

export default Leads;
