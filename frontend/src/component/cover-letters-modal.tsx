// frontend/src/common/component/cover-letters-modal.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { CoverLetterRead, CoverLetterCreate, CoverLetterUpdate } from '../service/cover-letters';  // Adjust import path as necessary

interface CoverLetterModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (coverLetter: CoverLetterCreate | CoverLetterUpdate) => void;
  initialData?: CoverLetterRead;
}

const CoverLetterModal: React.FC<CoverLetterModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultCoverLetterData: CoverLetterCreate = {
    // Assuming these are the fields in CoverLetterCreate, adjust as per actual schema
    name: "",
    content: "",
    content_type: "template"
  };

  const [coverLetterData, setCoverLetterData] = useState<CoverLetterCreate | CoverLetterUpdate>(defaultCoverLetterData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Assuming CoverLetterRead and CoverLetterUpdate have similar fields
      const updateData: CoverLetterUpdate = {
        name: initialData.name || defaultCoverLetterData.name,
        content: initialData.content || defaultCoverLetterData.content,
        content_type: initialData.content_type || defaultCoverLetterData.content_type
      };
      setCoverLetterData(updateData);
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
    onSave(coverLetterData);
    onClose();
    setCoverLetterData(defaultCoverLetterData);  // Reset form state
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
              value={coverLetterData[key as keyof (CoverLetterCreate | CoverLetterUpdate)]}
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
