import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { CertificateRead, CertificateCreate, CertificateUpdate } from '../service/certificates';  // Adjust import path as necessary

interface CertificateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (certificate: CertificateCreate | CertificateUpdate) => void;
  initialData?: CertificateRead;
}

const CertificateModal: React.FC<CertificateModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultCertificateData: CertificateCreate = {
    // Assuming these are the fields in CertificateCreate, adjust as per actual schema
    title: '',
    issuer: '',
    issued_date: '',
    expiration_date: '',
  };

  const [certificateData, setCertificateData] = useState<CertificateCreate | CertificateUpdate>(defaultCertificateData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      const updateData: CertificateUpdate = {
        // Assuming these are the fields in CertificateUpdate, adjust as per actual schema
        title: initialData.title || '',
        issuer: initialData.issuer || '',
        issued_date: initialData.issued_date || '',
        expiration_date: initialData.expiration_date || '',
      };
      setCertificateData(updateData);
      setIsEdited(true);
    } else {
      setCertificateData(defaultCertificateData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCertificateData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(certificateData);
    onClose();
    setCertificateData(defaultCertificateData);  // Reset form state
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">{isEdited ? 'Edit Certificate' : 'New Certificate'}</DialogTitle>
      <DialogContent>
        {Object.entries(certificateData).map(([key, value]) => (
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

export default CertificateModal;
