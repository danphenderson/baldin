import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { AspirationItem } from '../service/aspirations';
import { CardShell } from '../design-system';
import { CardTitle, Caption } from './common/text';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AspirationCardProps {
  item: AspirationItem;
  onEdit: (item: AspirationItem) => void;
  onDelete: (item: AspirationItem) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AspirationCard: React.FC<AspirationCardProps> = ({ item, onEdit, onDelete }) => {
  const theme = useTheme();

  return (
    <CardShell aria-label={item.label}>
      {/* Header: label + actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <CardTitle sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </CardTitle>
        <Box sx={{ flexShrink: 0, display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(item)} aria-label={`Edit ${item.label}`}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(item)} aria-label={`Delete ${item.label}`}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Reason */}
      {item.reason && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, lineHeight: 1.55 }}
        >
          {item.reason}
        </Typography>
      )}

      {/* Notes */}
      {item.notes && (
        <Caption sx={{ mt: 0.75, fontStyle: 'italic' }}>
          {item.notes}
        </Caption>
      )}

      {/* Footer: timestamp */}
      <Box sx={{ mt: 'auto', pt: 1.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
        <Caption>
          Added {new Date(item.created_at).toLocaleDateString()}
        </Caption>
      </Box>
    </CardShell>
  );
};

export default AspirationCard;
