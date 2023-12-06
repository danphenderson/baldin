import React, { useState, useEffect } from 'react';
import { Button, Container, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { components } from '../schema.d';
import DeleteIcon from '@mui/icons-material/Delete';
import ApplicationModal from '../component/application-modal';
// Add other imports as needed

type ApplicationRead = components['schemas']['ApplicationRead'];
type ApplicationCreate = components['schemas']['ApplicationCreate'];
type ApplicationUpdate = components['schemas']['ApplicationUpdate'];

const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [currentApplication, setCurrentApplication] = useState<ApplicationRead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch('/applications/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Include authentication headers if required
          },
        });
        if (!response.ok) {
          throw new Error('Error fetching applications');
        }
        const data = await response.json();
        setApplications(data);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      }
    };

    fetchApplications();
  }, []);
  const openModal = (application?: ApplicationRead) => {
    setCurrentApplication(application || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentApplication(null);
  };

  const handleSaveApplication = async (applicationData: ApplicationRead) => {
    const endpoint = applicationData.id ? `/applications/${applicationData.id}/` : '/applications/';
    const method = applicationData.id ? 'PATCH' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          // Include authentication headers if required
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        throw new Error('Error saving application');
      }
      const savedApplication = await response.json();

      // Update state
      if (method === 'POST') {
        setApplications([...applications, savedApplication]);
      } else {
        setApplications(applications.map(app => app.id === savedApplication.id ? savedApplication : app));
      }

      closeModal();
    } catch (error) {
      console.error('Failed to save application:', error);
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    try {
      const response = await fetch(`/applications/${applicationId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Include authentication headers if required
        },
      });

      if (!response.ok) {
        throw new Error('Error deleting application');
      }

      // Update state
      setApplications(applications.filter(app => app.id !== applicationId));
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };


    // Extract and return the required fields
    const formatApplicationData = (app: ApplicationRead | null): ApplicationCreate | ApplicationUpdate => {
      if (!app) {
        // Provide default values for a new application
        return {
          cover_letter: '',
          resume: '',
          notes: '',
          status: '',
          lead_id: '',};
      }
      // Extract and return only the fields relevant for ApplicationCreate or ApplicationUpdate
      const { cover_letter, resume, notes, status, id } = app;
      return { cover_letter, resume, notes, status, id };
    };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Job Applications</Typography>
      <Button variant="contained" color="primary" onClick={() => openModal()}>Add New Application</Button>

      {/* List of Applications */}
      <List>
        {applications.map((application) => (
          <ListItem key={application.id} divider>
            <ListItemText primary={application.id} secondary={application.status} />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="edit" onClick={() => openModal(application)}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteApplication(application.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <ApplicationModal
        open={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveApplication}
        initialData={formatApplicationData(currentApplication)}
      />
    </Container>
  );
};
export default ApplicationsPage;
