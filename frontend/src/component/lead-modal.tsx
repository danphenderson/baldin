import React, { useState, useEffect } from 'react';
import { components } from '../schema.d';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';

type LeadCreate = components['schemas']['LeadCreate'];

interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (lead: LeadCreate) => void;
  initialData?: LeadCreate;
}

const LeadModal: React.FC<LeadModalProps> = ({ open, onClose, onSave, initialData }) => {
  // Providing default values for all fields in LeadCreate
  const defaultLeadData: LeadCreate = {
    title: '',
    description: '',
    location: '',
    salary: '',
    job_function: '',
    employment_type: '',
    seniority_level: '',
    notes: '',
    url: '',
    // Ensure all fields from your LeadCreate type are covered here
  };

  const [leadData, setLeadData] = useState<LeadCreate>(defaultLeadData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setLeadData(initialData);
      setIsEdited(true);
    } else {
      setLeadData(defaultLeadData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLeadData({ ...leadData, [name]: value });
  };

  const handleSave = () => {
    onSave(leadData);
    onClose();
    setLeadData(defaultLeadData);
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">{isEdited ? 'Edit Lead' : 'New Lead'}</DialogTitle>
      <DialogContent>
        {Object.entries(leadData).map(([key, value]) => (
          <TextField
            key={key}
            margin="dense"
            name={key}
            label={formatLabel(key)}
            type="text"
            fullWidth
            value={value}
            onChange={handleChange}
            // Add input validation as required
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

export default LeadModal;
