import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Switch,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { FormDialogShell } from '../design-system';
import type { AgentRead, AgentCreate, AgentUpdate, AgentKind } from '../service/agents';
import { getAvailableModels, type AgentModelOptionRead } from '../service/agent-chat';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import {
  buildAgentModelOptions,
  copyAgentConfiguration,
  getAgentDefaultModelHelperText,
  getAgentConfiguredModelName,
  getAgentModelDisplayLabel,
} from '../util/agent-models';
import { AgentEnabledMultilineField } from './agent-surface';

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
  const { token } = useContext(UserContext);
  const { notify } = useNotification();
  const isEdit = Boolean(agent?.id);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AgentKind>('cover_letter');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [modelOptions, setModelOptions] = useState<AgentModelOptionRead[]>([]);
  const [modelOptionsLoading, setModelOptionsLoading] = useState(false);
  const [defaultModelName, setDefaultModelName] = useState<string | null>(null);
  const [defaultModelLabel, setDefaultModelLabel] = useState<string | null>(null);
  const [selectedModelName, setSelectedModelName] = useState('');
  const [saving, setSaving] = useState(false);

  const configuredModelName = getAgentConfiguredModelName(agent?.configuration);
  const visibleModelOptions = useMemo(
    () => buildAgentModelOptions(modelOptions, selectedModelName || configuredModelName),
    [configuredModelName, modelOptions, selectedModelName],
  );
  const selectedModelLabel = useMemo(() => {
    if (!selectedModelName) {
      return getAgentModelDisplayLabel(null);
    }

    const selectedOption = visibleModelOptions.find((option) => option.name === selectedModelName);
    return getAgentModelDisplayLabel(selectedModelName, selectedOption?.label);
  }, [selectedModelName, visibleModelOptions]);

  useEffect(() => {
    if (!open) return;

    if (agent) {
      setName(agent.name);
      setKind(agent.kind);
      setDescription(agent.description ?? '');
      setInstructions(agent.instructions ?? '');
      setIsEnabled(agent.is_enabled);
      setSelectedModelName(getAgentConfiguredModelName(agent.configuration) ?? '');
      return;
    }

    setName('');
    setKind('cover_letter');
    setDescription('');
    setInstructions('');
    setIsEnabled(true);
    setSelectedModelName('');
  }, [agent, open]);

  useEffect(() => {
    if (!open || !token) {
      return;
    }

    let isActive = true;
    setModelOptionsLoading(true);

    void (async () => {
      try {
        const response = await getAvailableModels(token);
        if (!isActive) {
          return;
        }
        setDefaultModelName(response.default_model_name);
        setDefaultModelLabel(response.default_model_label);
        setModelOptions(response.models ?? []);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setDefaultModelName(null);
        setDefaultModelLabel(null);
        setModelOptions([]);
        notify(error instanceof Error ? error.message : 'Failed to load available models', 'error');
      } finally {
        if (isActive) {
          setModelOptionsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [notify, open, token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextConfiguration = copyAgentConfiguration(agent?.configuration);
      if (selectedModelName) {
        nextConfiguration.model_name = selectedModelName;
      } else {
        delete nextConfiguration.model_name;
      }

      if (isEdit) {
        const data: AgentUpdate = {
          name: name.trim(),
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          configuration: nextConfiguration,
          is_enabled: isEnabled,
        };
        await onSave(data);
      } else {
        const data: AgentCreate = {
          name: name.trim(),
          kind,
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          ...(selectedModelName ? { configuration: { model_name: selectedModelName } } : {}),
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

          <Grid size={{ xs: 12, sm: 3 }}>
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

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Model</InputLabel>
              <Select
                displayEmpty
                value={selectedModelName}
                label="Model"
                onChange={(e) => setSelectedModelName(e.target.value)}
                renderValue={() => selectedModelLabel}
                inputProps={{ 'aria-label': 'Model' }}
              >
                <MenuItem value="">{getAgentModelDisplayLabel(null)}</MenuItem>
                {visibleModelOptions.map((option) => (
                  <MenuItem key={option.name} value={option.name}>
                    {getAgentModelDisplayLabel(option.name, option.label)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {getAgentDefaultModelHelperText(defaultModelName, defaultModelLabel)}
                {modelOptionsLoading ? ' Loading models…' : ''}
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid size={12}>
            <AgentEnabledMultilineField
              fullWidth
              label="Description"
              surfaceId={agent?.id ?? 'agent-form-dialog'}
              fieldKey="agent_description"
              entityRefs={agent?.id ? [{ kind: 'agent', id: agent.id, label: agent.name }] : []}
              value={description}
              onChange={setDescription}
              multiline
              rows={2}
              placeholder="A short summary of what this agent does"
              helperText="Optional — helps you identify this agent"
            />
          </Grid>

          <Grid size={12}>
            <AgentEnabledMultilineField
              fullWidth
              label="Instructions"
              surfaceId={agent?.id ?? 'agent-form-dialog'}
              fieldKey="agent_instructions"
              entityRefs={agent?.id ? [{ kind: 'agent', id: agent.id, label: agent.name }] : []}
              value={instructions}
              onChange={setInstructions}
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
