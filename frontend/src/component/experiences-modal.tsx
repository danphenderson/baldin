import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { ExperienceRead, ExperienceCreate, ExperienceUpdate } from '../services/experiences';  // Adjust import path as necessary

interface ExperiencesModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (experience: ExperienceCreate | ExperienceUpdate) => void;
  initialData?: ExperienceRead;
}

const ExperiencesModal: React.FC<ExperiencesModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultExperienceData: ExperienceCreate = {
    // Assuming these are the fields in ExperienceCreate, adjust as per actual schema
    title: '',
    company: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    projects: '',
  };

  const [experienceData, setExperienceData] = useState<ExperienceCreate | ExperienceUpdate>(defaultExperienceData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      const updateData: ExperienceUpdate = {
        // Assuming these are the fields in ExperienceUpdate, adjust as per actual schema
        title: initialData.title || '',
        company: initialData.company || '',
        location: initialData.location || '',
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        description: initialData.description || '',
        projects: initialData.projects || '',
      };
      setExperienceData(updateData);
      setIsEdited(true);
    } else {
      setExperienceData(defaultExperienceData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExperienceData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(experienceData);
    onClose();
    setExperienceData(defaultExperienceData);  // Reset form state
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">{isEdited ? 'Edit Experience' : 'New Experience'}</DialogTitle>
      <DialogContent>
        {Object.entries(experienceData).map(([key, value]) => (
          <TextField
            key={key}
            margin="dense"
            name={key}
            label={formatLabel(key)}
            type="text"
            fullWidth
            value={value}
            onChange={handleChange}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExperiencesModal;
