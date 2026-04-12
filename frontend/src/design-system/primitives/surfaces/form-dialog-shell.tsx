import React, { useId } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  type DialogProps,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { radiusTokens } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export interface FormDialogShellProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  actions: React.ReactNode;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: boolean;
  busy?: boolean;
  dismissible?: boolean;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const FormDialogShell: React.FC<FormDialogShellProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  busy = false,
  dismissible = true,
  subtitle,
  headerActions,
}) => {
  const theme = useTheme();
  const borderRadius = (theme as typeof theme & { baldin?: typeof theme.baldin }).baldin?.radius.xl ?? radiusTokens.xl;
  const titleId = useId();
  const subtitleId = useId();
  const canDismiss = dismissible && !busy;

  const handleDialogClose: NonNullable<DialogProps['onClose']> = (_, reason) => {
    if (!canDismiss && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      disableEscapeKeyDown={!canDismiss}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      PaperProps={{
        sx: {
          borderRadius,
        },
      }}
    >
      <DialogTitle
        id={titleId}
        sx={{
          px: toSpacingPx(spacingTokens.dialogPadding),
          pt: toSpacingPx(spacingTokens.dialogPadding - 1),
          pb: toSpacingPx(3),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {typeof title === 'string' ? (
              <Typography variant="h6" fontWeight={700}>
                {title}
              </Typography>
            ) : (
              title
            )}
            {subtitle && (
              <Typography
                id={subtitleId}
                variant="body2"
                color="text.secondary"
                sx={{ mt: toSpacingPx(1) }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {(headerActions || dismissible) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {headerActions}
              {dismissible && (
                <IconButton
                  onClick={onClose}
                  size="small"
                  aria-label="Close dialog"
                  disabled={!canDismiss}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          px: toSpacingPx(spacingTokens.dialogPadding),
          py: toSpacingPx(4),
        }}
      >
        {children}
      </DialogContent>

      <DialogActions
        sx={{
          px: toSpacingPx(spacingTokens.dialogPadding),
          py: toSpacingPx(4),
          gap: 1,
        }}
      >
        {actions}
      </DialogActions>
    </Dialog>
  );
};

export default FormDialogShell;
