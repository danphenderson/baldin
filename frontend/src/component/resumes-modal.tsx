// frontend/src/common/component/resumes-modal.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { ResumeRead, ResumeCreate, ResumeUpdate } from '../service/resumes';  // Adjust import path as necessary

interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (resume: ResumeCreate | ResumeUpdate) => void;
  initialData?: ResumeRead;
}

const ResumeModal: React.FC<ResumeModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultResumeData: ResumeCreate = {
    // Assuming these are the fields in ResumeCreate, adjust as per actual schema
    name: "string",
    content: "string",
    content_type: "custom"
  };

  const [resumeData, setResumeData] = useState<ResumeCreate | ResumeUpdate>(defaultResumeData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Assuming ResumeRead and ResumeUpdate have similar fields
      const updateData: ResumeUpdate = {
        name: initialData.name || defaultResumeData.name,
        content: initialData.content || defaultResumeData.content,
        content_type: initialData.content_type || defaultResumeData.content_type
      };
      setResumeData(updateData);
      setIsEdited(true);
    } else {
      setResumeData(defaultResumeData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResumeData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(resumeData);
    onClose();
    setResumeData(defaultResumeData);  // Reset form state
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEdited ? 'Edit' : 'Create'} Resume</DialogTitle>
      <DialogContent>
        <form>
          {Object.keys(defaultResumeData).map(key => (
            <TextField
              key={key}
              name={key}
              label={formatLabel(key)}
              value={resumeData[key as keyof ResumeCreate]}
              onChange={handleChange}
              margin="normal"
              fullWidth
            />
          ))}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!Object.values(resumeData).every(Boolean)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResumeModal;
