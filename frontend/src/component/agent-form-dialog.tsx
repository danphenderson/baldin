import React, { useEffect, useState } from 'react';
import {
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { FormDialogShell } from '../design-system';
import type { AgentRead, AgentCreate, AgentUpdate, AgentKind } from '../service/agents';

/* ------------------------------------------------------------------ */
/*  Kind options                                                       */
/* ------------------------------------------------------------------ */

const KIND_OPTIONS: { value: AgentKind; label: string }[] = [
  { value: 'cover_letter', label: 'Cover Letter Workspace' },
  { value: 'follow_up', label: 'Follow-Up Planner' },
  { value: 'outreach', label: 'Outreach Tracker' },
  { value: 'custom', label: 'Custom' },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AgentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AgentCreate | AgentUpdate) => Promise<void>;
  agent: AgentRead | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AgentFormDialog: React.FC<AgentFormDialogProps> = ({
  open,
  onClose,
  onSave,
  agent,
}) => {
  const isEdit = Boolean(agent?.id);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AgentKind>('cover_letter');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (agent) {
      setName(agent.name);
      setKind(agent.kind);
      setDescription(agent.description ?? '');
      setInstructions(agent.instructions ?? '');
      setIsEnabled(agent.is_enabled);
      return;
    }

    setName('');
    setKind('cover_letter');
    setDescription('');
    setInstructions('');
    setIsEnabled(true);
  }, [agent, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        const data: AgentUpdate = {
          name: name.trim(),
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          is_enabled: isEnabled,
        };
        await onSave(data);
      } else {
        const data: AgentCreate = {
          name: name.trim(),
          kind,
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          is_enabled: isEnabled,
        };
        await onSave(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim().length > 0;

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      busy={saving}
      title={isEdit ? 'Edit Agent' : 'Create Agent'}
      actions={(
        <>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Save Changes' : 'Create Agent')
            }
          </Button>
        </>
      )}
    >
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus={!isEdit}
              placeholder="My Cover Letter Agent"
              slotProps={{ htmlInput: { 'aria-label': 'Agent name' } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Kind</InputLabel>
              <Select
                value={kind}
                label="Kind"
                onChange={(e) => setKind(e.target.value as AgentKind)}
                disabled={isEdit}
                inputProps={{ 'aria-label': 'Agent kind' }}
              >
                {KIND_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              placeholder="A short summary of what this agent does"
              helperText="Optional — helps you identify this agent"
            />
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth
              label="Instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              multiline
              rows={4}
              placeholder="Focus on quantifiable achievements. Use a professional but approachable tone."
              helperText="Guide the structure, tone, and priorities of generated sessions"
            />
          </Grid>

          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                />
              }
              label="Enabled"
              slotProps={{ typography: { variant: 'body2' } }}
            />
          </Grid>
        </Grid>
    </FormDialogShell>
  );
};

export default AgentFormDialog;
