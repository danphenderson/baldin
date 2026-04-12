import React, { useContext, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { UserContext } from '../context/user-context';
import {
  createActionItem,
  updateActionItem,
  type ActionItemCreate,
  type ActionItemRead,
  type ActionItemDetailRead,
  type ActionItemUpdate,
} from '../service/action-items';
import { AgentEnabledMultilineField } from './agent-surface';

/* ------------------------------------------------------------------ */
/*  Kind / priority labels                                             */
/* ------------------------------------------------------------------ */

const KIND_OPTIONS: Array<{ value: ActionItemCreate['kind']; label: string }> = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'prepare_document', label: 'Prepare Document' },
  { value: 'send_message', label: 'Send Message' },
  { value: 'review_lead', label: 'Review Lead' },
  { value: 'schedule_interview', label: 'Schedule Interview' },
  { value: 'custom', label: 'Custom' },
];

const PRIORITY_OPTIONS: Array<{ value: NonNullable<ActionItemCreate['priority']>; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CreateActionItemDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (item: ActionItemRead) => void;
  /** Pre-populate fields when launched from another page. */
  defaults?: Partial<ActionItemCreate>;
  /** When provided, dialog operates in edit mode. */
  editItem?: ActionItemDetailRead;
  /** Callback fired after a successful edit. */
  onUpdated?: (item: ActionItemRead) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const CreateActionItemDialog: React.FC<CreateActionItemDialogProps> = ({
  open,
  onClose,
  onCreated,
  defaults,
  editItem,
  onUpdated,
}) => {
  const { token } = useContext(UserContext);

  const isEdit = Boolean(editItem);
  const defaultTitle = defaults?.title ?? '';
  const defaultKind = defaults?.kind ?? 'follow_up';
  const defaultPriority = defaults?.priority ?? 'medium';
  const defaultDueAt = defaults?.due_at ? defaults.due_at.slice(0, 10) : '';
  const defaultDescription = defaults?.description ?? '';
  const defaultApplicationId = defaults?.application_id ?? undefined;
  const defaultLeadId = defaults?.lead_id ?? undefined;
  const defaultDocumentId = defaults?.document_id ?? undefined;
  const defaultConversationId = defaults?.conversation_id ?? undefined;

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ActionItemCreate['kind']>('follow_up');
  const [priority, setPriority] = useState<NonNullable<ActionItemCreate['priority']>>('medium');
  const [dueAt, setDueAt] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Reset form when dialog opens */
  useEffect(() => {
    if (!open) return;

    if (editItem) {
      setTitle(editItem.title);
      setKind(editItem.kind);
      setPriority(editItem.priority);
      setDueAt(editItem.due_at ? editItem.due_at.slice(0, 10) : '');
      setDescription(editItem.description ?? '');
    } else {
      setTitle(defaultTitle);
      setKind(defaultKind);
      setPriority(defaultPriority);
      setDueAt(defaultDueAt);
      setDescription(defaultDescription);
    }

    setError(null);
    setSaving(false);
  }, [
    open,
    editItem?.id,
    editItem?.title,
    editItem?.kind,
    editItem?.priority,
    editItem?.due_at,
    editItem?.description,
    defaultTitle,
    defaultKind,
    defaultPriority,
    defaultDueAt,
    defaultDescription,
  ]);

  /* Build linked-entity display text */
  const linkedLabel = editItem
    ? (editItem.application_id ? 'Linked to an application' :
       editItem.lead_id ? 'Linked to a lead' :
       editItem.document_id ? 'Linked to a document' :
       editItem.conversation_id ? 'Linked to a conversation' : null)
     : (defaultApplicationId ? 'Linked to an application' :
       defaultLeadId ? 'Linked to a lead' :
       defaultDocumentId ? 'Linked to a document' :
       defaultConversationId ? 'Linked to a conversation' : null);

  const handleSubmit = async () => {
    if (!token || !title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (editItem) {
        const payload: ActionItemUpdate = {
          title: title.trim(),
          kind,
          priority,
          description: description.trim() || null,
          due_at: dueAt ? `${dueAt}T00:00:00` : null,
        };
        const updated = await updateActionItem(token, editItem.id, payload);
        onUpdated?.(updated);
        onClose();
      } else {
        const payload: ActionItemCreate = {
          title: title.trim(),
          kind,
          priority,
          description: description.trim() || undefined,
          due_at: dueAt ? `${dueAt}T00:00:00` : undefined,
          application_id: defaultApplicationId,
          lead_id: defaultLeadId,
          document_id: defaultDocumentId,
          conversation_id: defaultConversationId,
        };
        const created = await createActionItem(token, payload);
        onCreated(created);
        onClose();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Failed to ${isEdit ? 'update' : 'create'} action item`);
    }
    setSaving(false);
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="create-action-dialog-title"
    >
      <DialogTitle id="create-action-dialog-title" sx={{ fontWeight: 700 }}>
        {isEdit ? 'Edit Action Item' : 'New Action Item'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Title"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Send follow-up email"
          />

          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel id="action-kind-label">Kind</InputLabel>
              <Select
                labelId="action-kind-label"
                label="Kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as ActionItemCreate['kind'])}
              >
                {KIND_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel id="action-priority-label">Priority</InputLabel>
              <Select
                labelId="action-priority-label"
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as NonNullable<ActionItemCreate['priority']>)}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label="Due Date"
            type="date"
            size="small"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <AgentEnabledMultilineField
            label="Description"
            multiline
            minRows={2}
            fullWidth
            surfaceId={editItem?.id ?? defaults?.conversation_id ?? defaults?.document_id ?? defaults?.lead_id ?? defaults?.application_id ?? 'action-item-dialog'}
            fieldKey="action_item_description"
            entityRefs={[
              ...(editItem?.application_id ? [{ kind: 'application', id: editItem.application_id, label: editItem.title }] : []),
              ...(editItem?.lead_id ? [{ kind: 'lead', id: editItem.lead_id, label: editItem.title }] : []),
              ...(editItem?.document_id ? [{ kind: 'document', id: editItem.document_id, label: editItem.title }] : []),
              ...(editItem?.conversation_id ? [{ kind: 'conversation', id: editItem.conversation_id, label: editItem.title }] : []),
              ...(!editItem && defaultApplicationId ? [{ kind: 'application', id: defaultApplicationId, label: title || 'Action item' }] : []),
              ...(!editItem && defaultLeadId ? [{ kind: 'lead', id: defaultLeadId, label: title || 'Action item' }] : []),
              ...(!editItem && defaultDocumentId ? [{ kind: 'document', id: defaultDocumentId, label: title || 'Action item' }] : []),
              ...(!editItem && defaultConversationId ? [{ kind: 'conversation', id: defaultConversationId, label: title || 'Action item' }] : []),
            ]}
            applicationId={editItem?.application_id ?? defaultApplicationId ?? null}
            value={description}
            onChange={setDescription}
            placeholder="Optional notes or context"
          />

          {linkedLabel && (
            <Chip label={linkedLabel} size="small" variant="outlined" color="info" />
          )}

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!title.trim() || saving}
        >
          {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateActionItemDialog;
