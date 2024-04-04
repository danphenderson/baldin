import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { EducationRead, EducationCreate, EducationUpdate } from '../service/education';  // Adjust import path as necessary

interface EducationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (education: EducationCreate | EducationUpdate) => void;
  initialData?: EducationRead;
}

const EducationModal: React.FC<EducationModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultEducationData: EducationCreate = {
    // Assuming these are the fields in EducationCreate, adjust as per actual schema
    university: '',
    degree: '',
    activities: '',
    start_date: '',
    end_date: '',
    gradePoint: '',
  };

  const [educationData, setEducationData] = useState<EducationCreate | EducationUpdate>(defaultEducationData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Assuming EducationRead and EducationUpdate have similar fields
      const updateData: EducationUpdate = {
        university: initialData.university || '',
        degree: initialData.degree || '',
        activities: initialData.activities || '',
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        gradePoint: initialData.gradePoint || '',
        //notes: initialData.notes || '',
      };
      setEducationData(updateData);
      setIsEdited(true);
    } else {
      setEducationData(defaultEducationData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEducationData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(educationData);
    onClose();
    setEducationData(defaultEducationData);  // Reset form state
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">{isEdited ? 'Edit Education' : 'New Education'}</DialogTitle>
      <DialogContent>
        {Object.entries(educationData).map(([key, value]) => (
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

export default EducationModal;
