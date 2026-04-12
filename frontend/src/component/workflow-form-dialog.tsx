import React, { useEffect, useState } from 'react';
import { Button, Stack, TextField } from '@mui/material';
import type { OrchestrationPipelineCreate } from '../service/data-orchestration';
import { FormDialogShell } from '../design-system';
import { monoFontFamily } from '../design-system/tokens/typography';

export interface WorkflowFormDialogValues {
  name: string;
  description: string;
  definition: string;
}

export interface WorkflowFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: OrchestrationPipelineCreate) => Promise<void>;
  title?: string;
  confirmLabel?: string;
  initialValues?: Partial<WorkflowFormDialogValues>;
}

const DEFAULT_VALUES: WorkflowFormDialogValues = {
  name: '',
  description: '',
  definition: '{}',
};

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

const WorkflowFormDialog: React.FC<WorkflowFormDialogProps> = ({
  open,
  onClose,
  onSave,
  title = 'Create Workflow',
  confirmLabel = 'Create Workflow',
  initialValues,
}) => {
  const [name, setName] = useState(DEFAULT_VALUES.name);
  const [description, setDescription] = useState(DEFAULT_VALUES.description);
  const [definition, setDefinition] = useState(DEFAULT_VALUES.definition);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialValues?.name ?? DEFAULT_VALUES.name);
    setDescription(initialValues?.description ?? DEFAULT_VALUES.description);
    setDefinition(initialValues?.definition ?? DEFAULT_VALUES.definition);
    setSaving(false);
  }, [initialValues, open]);

  const handleSave = async () => {
    if (!name.trim() || !isValidJson(definition)) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        definition: JSON.parse(definition) as Record<string, unknown>,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      fullWidth
      busy={saving}
      actions={(
        <>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!name.trim() || !isValidJson(definition) || saving}
          >
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <Stack spacing={2.5}>
        <TextField
          fullWidth
          autoFocus
          label="Name"
          placeholder="e.g. LinkedIn Lead Enrichment"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          fullWidth
          label="Description"
          placeholder="What does this workflow do?"
          multiline
          minRows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <TextField
          fullWidth
          label="Definition (JSON)"
          multiline
          rows={5}
          value={definition}
          onChange={(event) => setDefinition(event.target.value)}
          error={definition.length > 0 && !isValidJson(definition)}
          helperText={definition.length > 0 && !isValidJson(definition) ? 'Invalid JSON' : ' '}
          slotProps={{
            input: {
              sx: { fontFamily: monoFontFamily, fontSize: '0.85rem' },
            },
          }}
        />
      </Stack>
    </FormDialogShell>
  );
};

export default WorkflowFormDialog;
