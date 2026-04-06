import React, { useContext, useState, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, Alert, LinearProgress, Select, MenuItem, FormControl,
  InputLabel, Stack, alpha, useTheme, type SelectChangeEvent,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { uploadDocument, type DocumentDetailRead, type DocumentKind } from '../service/documents';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UploadDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (doc: DocumentDetailRead) => void;
}

const KIND_OPTIONS: { value: DocumentKind; label: string }[] = [
  { value: 'resume', label: 'Resume' },
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'reference_sheet', label: 'Reference Sheet' },
  { value: 'freeform', label: 'Freeform' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const UploadDocumentDialog: React.FC<UploadDocumentDialogProps> = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const { token } = useContext(UserContext);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<DocumentKind>('resume');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setTitle('');
    setKind('resume');
    setError('');
    setUploading(false);
    setDragOver(false);
  }, []);

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const validateFile = (f: File): string | null => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are accepted.';
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'File size must be under 10 MB.';
    }
    return null;
  };

  const acceptFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setFile(f);
    if (!title) {
      setTitle(f.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  };

  const handleUpload = async () => {
    if (!token || !file || !title.trim()) return;
    setUploading(true);
    setError('');
    try {
      const doc = await uploadDocument(token, file, title.trim(), kind);
      reset();
      onSuccess(doc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload PDF Document</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {/* Drop zone */}
          <Box
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            sx={{
              border: `2px dashed ${dragOver ? theme.palette.primary.main : alpha(theme.palette.divider, 0.5)}`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: dragOver
                ? alpha(theme.palette.primary.main, 0.04)
                : alpha(theme.palette.action.hover, 0.02),
              '&:hover': {
                borderColor: theme.palette.primary.main,
                background: alpha(theme.palette.primary.main, 0.04),
              },
            }}
            role="button"
            tabIndex={0}
            aria-label="Select PDF file"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              hidden
              onChange={handleFileChange}
            />
            {file ? (
              <Stack spacing={1} sx={{ alignItems: 'center' }}>
                <PdfIcon sx={{ fontSize: 40, color: 'error.main' }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1} sx={{ alignItems: 'center' }}>
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Drag and drop a PDF or click to select
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF only, max 10 MB
                </Typography>
              </Stack>
            )}
          </Box>

          {/* Title */}
          <TextField
            label="Title" fullWidth size="small"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Document title"
            slotProps={{ input: { 'aria-label': 'Document title' } }}
          />

          {/* Kind */}
          <FormControl size="small" fullWidth>
            <InputLabel id="upload-kind-label">Kind</InputLabel>
            <Select
              labelId="upload-kind-label" label="Kind"
              value={kind}
              onChange={(e: SelectChangeEvent) => setKind(e.target.value as DocumentKind)}
              aria-label="Document kind"
            >
              {KIND_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {uploading && <LinearProgress />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading} aria-label="Cancel upload">
          Cancel
        </Button>
        <Button
          variant="contained" onClick={handleUpload}
          disabled={uploading || !file || !title.trim()}
          startIcon={<CloudUploadIcon />}
          aria-label="Upload document"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDocumentDialog;
