import React from 'react';
import { Box, Stack, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { motion } from 'motion/react';
import { stagger } from '../constants';

const MotionBox = motion.create(Box);

export const ItemCard: React.FC<{
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  ariaLabel: string;
}> = ({ children, onEdit, onDelete, ariaLabel }) => {
  const theme = useTheme();
  return (
    <MotionBox
      layout
      {...stagger}
      transition={{ duration: 0.22 }}
      sx={{
        p: 2.5, borderRadius: '10px',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.3), bgcolor: alpha(theme.palette.primary.main, 0.02) },
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
          <Tooltip title="Edit" arrow>
            <IconButton size="small" onClick={onEdit} aria-label={`Edit ${ariaLabel}`}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton size="small" color="error" onClick={onDelete} aria-label={`Delete ${ariaLabel}`}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </MotionBox>
  );
};
