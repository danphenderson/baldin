// frontend/src/common/component/cover-letters-modal.tsx

import React, { useState, useEffect } from 'react';
import { TextField, Button } from '@mui/material';
import { DocumentRead, DocumentCreate, DocumentUpdate } from '../service/documents';
import {
  SurfaceDialog as Dialog,
  SurfaceDialogActions as DialogActions,
  SurfaceDialogContent as DialogContent,
  SurfaceDialogTitle as DialogTitle,
} from '../design-system';

interface CoverLetterModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (coverLetter: DocumentCreate | DocumentUpdate) => void;
  initialData?: DocumentRead;
}

const CoverLetterModal: React.FC<CoverLetterModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultCoverLetterData: Record<string, string> = {
    kind: 'cover_letter',
    title: '',
    content: '',
  };

  const [coverLetterData, setCoverLetterData] = useState<Record<string, string>>(defaultCoverLetterData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCoverLetterData({
        title: initialData.title || '',
      });
      setIsEdited(true);
    } else {
      setCoverLetterData(defaultCoverLetterData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCoverLetterData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(isEdited
      ? { title: coverLetterData.title } as DocumentUpdate
      : { kind: 'cover_letter', title: coverLetterData.title, content: coverLetterData.content } as DocumentCreate,
    );
    onClose();
    setCoverLetterData(defaultCoverLetterData);
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEdited ? 'Edit' : 'Create'} Cover Letter</DialogTitle>
      <DialogContent>
        <form>
          {Object.keys(defaultCoverLetterData).map((key) => (
            <TextField
              key={key}
              name={key}
              label={formatLabel(key)}
              value={coverLetterData[key] ?? ''}
              onChange={handleChange}
              margin="normal"
              fullWidth
            />
          ))}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CoverLetterModal;
