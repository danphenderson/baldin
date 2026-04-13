import React from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  type DialogActionsProps,
  type DialogContentProps,
  type DialogProps,
  type DialogTitleProps,
} from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export interface SurfaceDialogProps extends DialogProps {
  paperSx?: SxProps<Theme>;
}

export const SurfaceDialog: React.FC<SurfaceDialogProps> = ({
  PaperProps,
  paperSx,
  slotProps,
  ...props
}) => {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const dialogSx = {
    borderRadius: toRadiusPx(baldin?.radius.xl ?? radiusTokens.xl),
    background: baldin?.surface.overlay ?? theme.palette.background.paper,
    border: `1px solid ${baldin?.border.default ?? theme.palette.divider}`,
  } as SxProps<Theme>;

  const mergedPaperSx = [
    dialogSx,
    ...(Array.isArray(paperSx) ? paperSx : paperSx ? [paperSx] : []),
    ...(Array.isArray(PaperProps?.sx) ? PaperProps.sx : PaperProps?.sx ? [PaperProps.sx] : []),
  ] as SxProps<Theme>;

  const mergedSlotProps = {
    ...slotProps,
    paper: {
      ...PaperProps,
      ...slotProps?.paper,
    },
  };

  return (
    <Dialog
      {...props}
      PaperProps={{
        ...PaperProps,
        sx: mergedPaperSx,
      }}
      slotProps={mergedSlotProps}
    />
  );
};

export interface SurfaceDialogTitleProps extends DialogTitleProps {
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const SurfaceDialogTitle: React.FC<SurfaceDialogTitleProps> = ({
  icon,
  subtitle,
  actions,
  sx,
  children,
  ...props
}) => {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const titleSx = {
    px: toSpacingPx(spacingTokens.dialogPadding),
    pt: toSpacingPx(spacingTokens.dialogPadding - 1),
    pb: toSpacingPx(3),
    borderBottom: `1px solid ${baldin?.border.subtle ?? theme.palette.divider}`,
    fontWeight: 700,
  } as SxProps<Theme>;

  const mergedSx = (sx
    ? [titleSx, ...(Array.isArray(sx) ? sx : [sx])]
    : titleSx) as SxProps<Theme>;

  return (
    <DialogTitle {...props} sx={mergedSx}>
      <Box sx={{ display: 'flex', alignItems: subtitle ? 'flex-start' : 'center', gap: 2 }}>
        {icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.primary.main,
              mt: subtitle ? 0.25 : 0,
              '& svg': {
                fontSize: 24,
              },
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {typeof children === 'string' ? (
            <Typography variant="h6" fontWeight={700}>
              {children}
            </Typography>
          ) : (
            children
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
    </DialogTitle>
  );
};

export interface SurfaceDialogContentProps extends DialogContentProps {
  sx?: SxProps<Theme>;
}

export const SurfaceDialogContent: React.FC<SurfaceDialogContentProps> = ({ sx, dividers = true, ...props }) => {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const contentSx = {
    px: toSpacingPx(spacingTokens.dialogPadding),
    py: toSpacingPx(4),
    backgroundColor: baldin?.surface.base ?? theme.palette.background.default,
    borderTopColor: baldin?.border.subtle ?? theme.palette.divider,
    borderBottomColor: baldin?.border.subtle ?? theme.palette.divider,
  } as SxProps<Theme>;

  const mergedSx = (sx
    ? [contentSx, ...(Array.isArray(sx) ? sx : [sx])]
    : contentSx) as SxProps<Theme>;

  return <DialogContent {...props} dividers={dividers} sx={mergedSx} />;
};

export interface SurfaceDialogActionsProps extends DialogActionsProps {
  sx?: SxProps<Theme>;
}

export const SurfaceDialogActions: React.FC<SurfaceDialogActionsProps> = ({ sx, ...props }) => {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const actionsSx = {
    px: toSpacingPx(spacingTokens.dialogPadding),
    py: toSpacingPx(4),
    gap: 1,
    borderTop: `1px solid ${baldin?.border.subtle ?? theme.palette.divider}`,
    backgroundColor: baldin?.surface.raised ?? theme.palette.background.paper,
  } as SxProps<Theme>;

  const mergedSx = (sx
    ? [actionsSx, ...(Array.isArray(sx) ? sx : [sx])]
    : actionsSx) as SxProps<Theme>;

  return <DialogActions {...props} sx={mergedSx} />;
};
