import React from 'react';
import {
  Box, Button, Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { FormDialogShell } from '../../../design-system';
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
    <FormDialogShell
      open={!!deleteTarget}
      onClose={onCancel}
      maxWidth="xs"
      title={(
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          <Typography variant="h6" fontWeight={700}>
            Confirm Delete
          </Typography>
        </Box>
      )}
      actions={(
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="contained" color="error" onClick={onConfirm} startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </>
      )}
    >
        <Typography variant="body2">
          Are you sure you want to delete <strong>{deleteTarget?.label}</strong>?
          This action cannot be undone.
        </Typography>
    </FormDialogShell>
  );
};
