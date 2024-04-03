import React, { useState, useEffect, useContext } from 'react';
import { DataGrid, GridColDef, GridPaginationModel  } from '@mui/x-data-grid';
import { Stack, Typography, Button, Box, Snackbar, Alert } from '@mui/material';
import LeadModal from '../component/lead-modal';
import { createApplication, ApplicationCreate } from '../services/application';
import { UserContext } from '../context/user-context';


import { LeadRead, LeadsPaginatedRead, LeadCreate, LeadUpdate, getLeads, createLead, updateLead  } from '../services/lead';


const LeadsPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadRead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = React.useState({
    page_size: 10,
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

  const handleApply = async (id: string) => {
    // For now I am just going to "register" an application using the current lead
    // In the future, clicking the Apply button should open a modal to create a new application
    // That modal should contain pregenerated application documents (resume, cover letter, etc)
    // And the user should be able to upload their own documents
    if (!token) {
      setError('Authorization token is missing, unable to create application for lead with id: ' + id);
      return;
    }
    try {
      const applicationData: ApplicationCreate = {
        lead_id: id, // Assuming 'id' is the lead_id for the application
      };
      await createApplication(token, applicationData);
    } catch (error) {
      setError('Failed to create application for lead with id: ' + id);
    }
  };


  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', width: 150 },
    { field: 'company', headerName: 'Company', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    { field: 'employment_type', headerName: 'Employment Type', width: 150 },
    { field: 'seniority_level', headerName: 'Seniority Level', width: 150 },
    { field: 'location', headerName: 'Location', width: 150 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'job_function', headerName: 'Job Function', width: 150 },
    { field: 'industries', headerName: 'Industries', width: 150 },
    // { field: 'notes', headerName: 'Notes', width: 200 },
    // { field: 'url', headerName: 'URL', width: 200 },
  ];

  return (
    <div>
    <Box sx={{ p: 2 }}>
      <DataGrid
        rows={leads}
        columns={columns}
        loading={loading}
        disableRowSelectionOnClick
        onRowClick={(params) => setSelectedLead(params.row)}
        onRowDoubleClick={(params) => handleEditLead(params.id.toString())}
        pagination
        pageSizeOptions={[10, 15, 20]}
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
      <Button variant="contained" onClick={handleAddLead} sx={{ mb: 2 }}>
        Add New Lead
      </Button>
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
          url: selectedLead.url || '', // Provide a default value of an empty string for url
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
      <Box sx={{ mt: 4, overflowY: 'auto', maxHeight: 800, border: '1px solid #ccc', p: 2, bgcolor: 'background.paper' }}>
        {selectedLead && (
            <>
            <Button onClick={() => handleEditLead(selectedLead.id)}>Edit</Button><Button onClick={() => handleApply(selectedLead.id)}>Apply</Button>
            <Stack>
              {/* Actions to perform on the selected lead */}
              {/* Display the selected lead's details */}
              <Typography><strong>{selectedLead.title}, {selectedLead.company}, {selectedLead.employment_type} </strong></Typography>
              <Typography><strong>Location:</strong> {selectedLead.location}</Typography>
              <Typography><strong>Salary:</strong> {selectedLead.salary}</Typography>
              <Typography><strong>Job Function:</strong> {selectedLead.job_function}</Typography>
              <Typography><strong>Industries:</strong> {selectedLead.industries}</Typography>
              <Typography><strong>Seniority Level:</strong> {selectedLead.seniority_level}</Typography>
              <Typography><strong>Notes:</strong> {selectedLead.notes}</Typography>
              <Typography><strong>Description:</strong>{selectedLead.description}</Typography>
              <Typography><strong>ID:</strong> {selectedLead.id}</Typography>
              <Typography><strong>URL:</strong> {selectedLead.url}</Typography>
            </Stack></>
        )}
      </Box>
    </Box>

    </div>
  );
};

export default LeadsPage;
