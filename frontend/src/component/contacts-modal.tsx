// frontend/src/common/component/contacts-modal.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { ContactRead, ContactCreate, ContactUpdate } from '../services/contacts';  // Adjust import path as necessary

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (contact: ContactCreate | ContactUpdate) => void;
  initialData?: ContactRead;
}

const ContactModal: React.FC<ContactModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultContactData: ContactCreate = {
    // Assuming these are the fields in ContactCreate, adjust as per actual schema
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    time_zone: '',
  };

  const [contactData, setContactData] = useState<ContactCreate | ContactUpdate>(defaultContactData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Assuming ContactRead and ContactUpdate have similar fields
      const updateData: ContactUpdate = {
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        phone_number: initialData.phone_number || '',
        time_zone: initialData.time_zone || '',
        //notes: initialData.notes || '',
      };
      setContactData(updateData);
      setIsEdited(true);
    } else {
      setContactData(defaultContactData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(contactData);
    onClose();
    setContactData(defaultContactData);  // Reset form state
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEdited ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
      <DialogContent>
        {Object.keys(defaultContactData).map((key) => (
          <TextField
            key={key}
            name={key}
            label={formatLabel(key)}
            value={contactData[key as keyof ContactCreate]}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ContactModal;
