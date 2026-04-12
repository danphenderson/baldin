import React from 'react';
import {
  Button, TextField, Stack,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { FormDialogShell } from '../../../design-system';
import { SECTION_FIELDS, SECTION_LABELS } from '../constants';
import type { SectionKey } from '../types';
import { AgentEnabledMultilineField } from '../../../component/agent-surface';

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
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      busy={editSaving}
      title={`${editItem && 'id' in editItem && editItem.id ? 'Edit' : 'Add'} ${SECTION_LABELS[editSection]}`}
      actions={(
        <>
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
        </>
      )}
    >
        <Stack spacing={2} sx={{ mt: 1 }}>
          {SECTION_FIELDS[editSection].map(field => {
            const rawVal = (editItem as Record<string, unknown>)?.[field.key];
            const displayVal = field.isArray && Array.isArray(rawVal)
              ? rawVal.join(', ')
              : typeof rawVal === 'string' || typeof rawVal === 'number'
                ? String(rawVal)
                : '';
            const commonProps = {
              key: field.key,
              fullWidth: true,
              label: field.label,
              value: displayVal,
              type: field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text',
              InputLabelProps: field.type === 'date' ? { shrink: true } : undefined,
              size: 'small' as const,
            };
            return (
              field.multiline ? (
                <AgentEnabledMultilineField
                  {...commonProps}
                  surfaceId={String((editItem as Record<string, unknown>)?.id ?? `${editSection}-${field.key}`)}
                  fieldKey={`${editSection}_${field.key}`}
                  entityRefs={typeof (editItem as Record<string, unknown>)?.id === 'string'
                    ? [{ kind: editSection, id: (editItem as Record<string, unknown>).id as string, label: SECTION_LABELS[editSection] }]
                    : []}
                  onChange={nextValue => setEditItem(prev => prev ? { ...prev, [field.key]: nextValue } : prev)}
                  multiline
                  rows={field.rows ?? 1}
                />
              ) : (
                <TextField
                  {...commonProps}
                  onChange={e => setEditItem(prev => prev ? { ...prev, [field.key]: e.target.value } : prev)}
                />
              )
            );
          })}
        </Stack>
    </FormDialogShell>
  );
};
