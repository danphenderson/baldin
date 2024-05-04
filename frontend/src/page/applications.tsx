import React, { useState, useEffect, useContext } from 'react';
import { Box, CircularProgress, Typography, Stack, Button, AccordionSummary, Accordion, AccordionDetails } from '@mui/material';
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid';
import { UserContext } from '../context/user-context';
import {
  getApplications,
  deleteApplication,
  updateApplication,
  ApplicationRead,
  ApplicationUpdate,
  getApplicationCoverLetters,
  generatecoverLetter,
} from '../service/applications';
import { GridExpandMoreIcon } from '@mui/x-data-grid';
import { CoverLetterRead, CoverLetterCreate, CoverLetterUpdate, updateCoverLetter, createCoverLetter } from '../service/cover-letters';
import ErrorMessage from '../component/common/error-message';

const ApplicationsPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [applicationCoverLetters, setApplicationCoverLetters] = useState<CoverLetterRead[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRead | undefined>(undefined);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<CoverLetterRead | undefined>(undefined);

  useEffect(() => {
    if (token) {
        fetchApplications();
    }
  } , [token]);

  const fetchApplications = async () => {
    if (!token) {
      setError('Authorization token is missing');
      return;
    }
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

  const handleRowClick = async (params: GridRowModel) => {
    setSelectedApplication(params.row as ApplicationRead);
    fetchApplicationCoverLetters(params.row.id.toString());
  };


  const handleCoverLetterClick = async (params: GridRowModel) => {
    setSelectedCoverLetter(params.row as CoverLetterRead);
    fetchApplicationCoverLetters(params.row.id.toString())
  }


  const fetchApplicationCoverLetters = async (applicationId: string) => {
    if (!token) {
      setError('Authorization token is missing');
      return;
    }
    setIsLoading(true);
    try {
      const coverLetters = await getApplicationCoverLetters(token, applicationId);
      setApplicationCoverLetters(coverLetters);
    } catch (error) {
      setError(`Failed to fetch cover letters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Assuming the onSave prop in CoverLetterModal expects a parameter of type CoverLetterCreate | CoverLetterUpdate
  const handleCoverLetterSave = (coverLetterData: CoverLetterCreate | CoverLetterUpdate) => {
    if (!token || !selectedApplication) {
      setError('Authorization token or selected application is missing');
      return;
  }

  // You need to check if coverLetterData contains an id to decide if you are updating or creating a new cover letter
  const saveOrUpdate = coverLetterData ? updateCoverLetter : createCoverLetter;
    setIsLoading(true);
    saveOrUpdate(token, selectedCoverLetter?.id || '', coverLetterData)
      .then((updatedCoverLetter) => {
        const updatedCoverLetters = applicationCoverLetters.map(cl =>
          cl.id === updatedCoverLetter.id ? updatedCoverLetter : cl
        );
        setApplicationCoverLetters(updatedCoverLetters);
      })
      .catch(error => {
        setError(`Failed to save cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
    }

    const handleGenerateCoverLetter = async () => {
      if (!selectedApplication) {
          setError('Application or authorization token is missing');
          return;
      }
      setIsLoading(true);
      try {
          const template_id = selectedCoverLetter?.id || '';
          await generatecoverLetter(token || '', selectedApplication.id, template_id);
          alert('Cover letter generated successfully');
      } catch (error) {
          setError(`Failed to generate cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        setSelectedApplication(undefined);
      }
    } catch (error) {
      setError(`Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const coverLetterColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'content', headerName: 'Content', width: 200 },
    { field: 'content_type', headerName: 'Content Type', width: 200 },
    // Add other necessary columns
  ];

  const handleProcessRowUpdate = async (newRow: GridRowModel) => {
    if (!token) {
        setError('Authorization token is missing');
        return newRow;
    }
    setIsLoading(true);
    try {
        // Prepare the update payload with only the fields allowed in ApplicationUpdate
        const updatedApplication: ApplicationUpdate = {
            status: newRow.status as string,
        };
        // Pass the id as a separate argument to the updateApplication function
        await updateApplication(token, newRow.id.toString(), updatedApplication);
        const updatedApplications = applications.map(app =>
            app.id === newRow.id ? { ...app, status: newRow.status } : app
        );
        setApplications(updatedApplications);
        return newRow;
    } catch (error) {
        setError(`Failed to update application: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return newRow;
    } finally {
        setIsLoading(false);
    }
  };


  const columns: GridColDef[] = [
    { field: 'lead_title', headerName: 'Lead', width: 150 },
    { field: 'lead_company', headerName: 'Company', width: 150 },
    { field: 'lead_location', headerName: 'Location', width: 150 },
    { field: 'lead_salary', headerName: 'Salary', width: 150 },
    {
      field : 'status',
      headerName: 'Status',
      width: 150,
      editable: true,
    }
  ];

  return (
    <Box>
      {isLoading ? <CircularProgress /> : (
        <DataGrid
          rows={applications}
          columns={columns}
          onRowClick={handleRowClick}
        />
      )}
      {selectedApplication && (
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography variant="h4">Application Details</Typography>
        <Typography>ID: {selectedApplication.id}</Typography>
        <Typography>Lead Title: {selectedApplication.lead.title}</Typography>
        <Typography>Status: {selectedApplication.status}</Typography>
        <Accordion>
          <AccordionSummary expandIcon={<GridExpandMoreIcon />}>
            <Typography variant="h6" sx={{ mt: 2 }}>Cover Letters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DataGrid
              rows={applicationCoverLetters}
              columns={coverLetterColumns}
              autoHeight
              onRowClick={handleCoverLetterClick}
            />
            {selectedCoverLetter && (
                // Display cover letter contentent
                <Stack spacing={2} sx={{ mt: 2}}>
                  <Typography variant="h6" sx={{ mt: 2 }}>Cover Letter Details</Typography>
                  <Typography> <strong>Cover-Letter Type:</strong> {selectedCoverLetter.content_type}</Typography>
                  {/* TODO: This should be a nice pdf rich display view, e.g. see RichJsonDisplay common component */}
                  <Typography> <strong>Content:</strong> {selectedCoverLetter.content}</Typography>
                </Stack>
             )}

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>

              <Button
                variant="contained"
                onClick={handleGenerateCoverLetter}
              >
                Generate Cover Letter
              </Button>
              <Button
                variant="contained"
                onClick={() => setSelectedCoverLetter(undefined)}
              >
                Download PDF (Todo)
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={() => handleDelete(selectedApplication.id)}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            onClick={() => setSelectedApplication(undefined)}
          >
            Update
          </Button>
        </Stack>
      </Stack>
      )}
      {error && <ErrorMessage message={error} />}
    </Box>
  );
};

export default ApplicationsPage;
