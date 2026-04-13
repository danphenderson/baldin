import React, { useEffect, useState } from 'react';
import { Button, TextField } from '@mui/material';
import { FormDialogShell } from '../design-system';
import type { AspirationItem, AspirationCreate, AspirationUpdate } from '../service/aspirations';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AspirationFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AspirationCreate | AspirationUpdate) => Promise<void>;
  item: AspirationItem | null;
  /** Route-specific noun shown in the dialog title, e.g. "Role" or "Company". */
  kindLabel: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AspirationFormDialog: React.FC<AspirationFormDialogProps> = ({
  open,
  onClose,
  onSave,
  item,
  kindLabel,
}) => {
  const isEdit = Boolean(item?.id);

  const [label, setLabel] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  /* Reset form when dialog opens or item changes */
  useEffect(() => {
    if (!open) return;
    if (item) {
      setLabel(item.label);
      setReason(item.reason ?? '');
      setNotes(item.notes ?? '');
    } else {
      setLabel('');
      setReason('');
      setNotes('');
    }
  }, [item, open]);

  const handleSubmit = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      busy={saving}
      title={isEdit ? `Edit ${kindLabel}` : `Add ${kindLabel}`}
      actions={(
        <>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !label.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      )}
    >
      <TextField
        autoFocus
        label={kindLabel}
        placeholder={`Enter ${kindLabel.toLowerCase()} name`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        fullWidth
        required
        sx={{ mb: 2 }}
      />
      <TextField
        label="Reason"
        placeholder="Why is this important to you?"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Notes"
        placeholder="Any extra notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        fullWidth
        multiline
        minRows={2}
      />
    </FormDialogShell>
  );
};

export default AspirationFormDialog;
