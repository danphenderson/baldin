import React from 'react';
import {
  Box, Button, Typography,
} from '@mui/material';
import { Warning as WarningIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { FormDialogShell } from '../../design-system';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel',
  destructive = true, loading = false, onConfirm, onCancel,
}) => {
  const theme = useTheme();
  const confirmColor = destructive ? 'error' : 'primary';
  const titleIcon = destructive
    ? <WarningIcon sx={{ color: theme.palette.warning.main }} />
    : <InfoIcon sx={{ color: theme.palette.primary.main }} />;

  return (
    <FormDialogShell
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      busy={loading}
      title={(
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {titleIcon}
          <Typography variant="h6" component="span" fontWeight={700}>
            {title}
          </Typography>
        </Box>
      )}
      actions={(
        <>
          <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button
            variant="contained"
            color={confirmColor}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? `${confirmLabel}...` : confirmLabel}
          </Button>
        </>
      )}
    >
        <Typography variant="body2" color="text.secondary" component="div">
          {message}
        </Typography>
    </FormDialogShell>
  );
};

export default ConfirmDialog;
