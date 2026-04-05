import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { SECTION_FIELDS, SECTION_LABELS } from '../constants';
import type { SectionKey } from '../types';

interface EditDialogProps {
  open: boolean;
  editSection: SectionKey;
  editItem: Record<string, unknown> | null;
  editSaving: boolean;
  setEditItem: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  onClose: () => void;
  onSave: () => void;
}

export const EditDialog: React.FC<EditDialogProps> = ({
  open,
  editSection,
  editItem,
  editSaving,
  setEditItem,
  onClose,
  onSave,
}) => {
  return (
    <Dialog
      open={open}
      onClose={() => { if (!editSaving) onClose(); }}
      maxWidth="sm"
      fullWidth
      aria-labelledby="edit-dialog-title"
    >
      <DialogTitle id="edit-dialog-title" sx={{ fontWeight: 700 }}>
        {editItem && 'id' in editItem && editItem.id ? 'Edit' : 'Add'} {SECTION_LABELS[editSection]}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {SECTION_FIELDS[editSection].map(field => (
            <TextField
              key={field.key}
              fullWidth
              label={field.label}
              value={(editItem as Record<string, unknown>)?.[field.key] ?? ''}
              onChange={e => setEditItem(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
              multiline={field.multiline}
              rows={field.rows ?? 1}
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
              size="small"
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          disabled={editSaving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={editSaving}
          startIcon={editSaving ? undefined : <CheckIcon />}
        >
          {editSaving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
