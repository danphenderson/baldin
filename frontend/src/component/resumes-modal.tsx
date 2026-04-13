// frontend/src/common/component/resumes-modal.tsx

import React, { useState, useEffect } from 'react';
import { TextField, Button } from '@mui/material';
import { DocumentRead, DocumentCreate, DocumentUpdate } from '../service/documents';
import {
  SurfaceDialog as Dialog,
  SurfaceDialogActions as DialogActions,
  SurfaceDialogContent as DialogContent,
  SurfaceDialogTitle as DialogTitle,
} from '../design-system';

interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (resume: DocumentCreate | DocumentUpdate) => void;
  initialData?: DocumentRead;
}

const ResumeModal: React.FC<ResumeModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultResumeData: Record<string, string> = {
    kind: 'resume',
    title: '',
    content: '',
  };

  const [resumeData, setResumeData] = useState<Record<string, string>>(defaultResumeData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setResumeData({
        title: initialData.title || '',
      });
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
    onSave(isEdited
      ? { title: resumeData.title } as DocumentUpdate
      : { kind: 'resume', title: resumeData.title, content: resumeData.content } as DocumentCreate,
    );
    onClose();
    setResumeData(defaultResumeData);
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
              value={resumeData[key] ?? ''}
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
