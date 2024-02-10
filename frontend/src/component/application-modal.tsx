import React, { useState, useEffect } from 'react';
import { components } from '../schema.d';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';

type ApplicationCreate = components['schemas']['ApplicationCreate'];
type ApplicationUpdate = components['schemas']['ApplicationUpdate'];
type ApplicationRead = components['schemas']['ApplicationRead'];

interface ApplicationCreateProps {
  open: boolean;
  onClose: () => void;
  onSave: (application: ApplicationCreate) => void;
  initialData?: ApplicationCreate;
}

const ApplicationCreateModal: React.FC<ApplicationCreateProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultApplicationData: ApplicationCreate = {
    lead_id: '',
  };

  const [applicationData, setApplicationData] = useState<ApplicationCreate>(defaultApplicationData);

  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setApplicationData(initialData as ApplicationCreate);
      setIsEdited(true);
    } else {
      setApplicationData(defaultApplicationData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApplicationData({ ...applicationData, [name]: value });
  };

  const handleSave = () => {
    onSave(applicationData);
    onClose();
    setApplicationData(defaultApplicationData);
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">{isEdited ? 'Edit Application' : 'New Application'}</DialogTitle>
      <DialogContent>
        {Object.keys(applicationData).map(key => (
          <TextField
            key={key}
            margin="normal"
            id={key}
            name={key}
            label={formatLabel(key)}
            type={key === 'url' ? 'url' : 'text'}
            fullWidth
            value={applicationData[key as keyof ApplicationCreate]}
            onChange={handleChange}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary"> Save </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ApplicationCreateModal;
