import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { DeleteTarget } from '../types';

interface DeleteDialogProps {
  deleteTarget: DeleteTarget | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  deleteTarget,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog
      open={!!deleteTarget}
      onClose={onCancel}
      maxWidth="xs"
      aria-labelledby="delete-dialog-title"
    >
      <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 700 }}>
        Confirm Delete
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Are you sure you want to delete <strong>{deleteTarget?.label}</strong>?
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm} startIcon={<DeleteIcon />}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};
