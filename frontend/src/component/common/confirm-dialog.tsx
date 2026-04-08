import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel',
  loading = false, onConfirm, onCancel,
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle
        id="confirm-dialog-title"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <WarningIcon sx={{ color: theme.palette.warning.main }} />
        <Typography variant="h6" component="span" fontWeight={700}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" component="div">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? `${confirmLabel}...` : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
