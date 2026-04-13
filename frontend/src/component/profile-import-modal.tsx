import React, { useState, useCallback } from 'react';
import {
  Button,
  TextField,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  SurfaceDialog as Dialog,
  SurfaceDialogTitle as DialogTitle,
  SurfaceDialogContent as DialogContent,
  SurfaceDialogActions as DialogActions,
  StatusChip as Chip,
} from '../design-system';
import {
  Upload as UploadIcon,
  Link as LinkIcon,
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  Add as AddIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import {
  extractProfile,
  type ProfileExtractResponse,
  type ProfileExtractRequest,
  type ProfileExtractSource,
} from '../service/users';

interface ProfileImportModalProps {
  open: boolean;
  onClose: () => void;
  token: string | null;
  onSuccess: (result: ProfileExtractResponse) => void;
}

interface SourceEntry {
  id: number;
  type: 'url' | 'file';
  url: string;
  file: File | null;
}

let _nextId = 1;

/** Returns a LinkedIn/Handshake icon label if the URL matches, else null. */
function detectDomainHint(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('linkedin.com')) return 'LinkedIn';
    if (hostname.includes('joinhandshake.com')) return 'Handshake';
  } catch { /* not a valid URL yet */ }
  return null;
}

const ProfileImportModal: React.FC<ProfileImportModalProps> = ({
  open,
  onClose,
  token,
  onSuccess,
}) => {
  const [sources, setSources] = useState<SourceEntry[]>([
    { id: _nextId++, type: 'url', url: '', file: null },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProfileExtractResponse | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleReset = useCallback(() => {
    setSources([{ id: _nextId++, type: 'url', url: '', file: null }]);
    setError('');
    setResult(null);
    setLoading(false);
    setAnchorEl(null);
  }, []);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const addSource = (type: 'url' | 'file') => {
    setSources((prev) => [...prev, { id: _nextId++, type, url: '', file: null }]);
    setAnchorEl(null);
  };

  const removeSource = (id: number) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSourceUrl = (id: number, url: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, url } : s)),
    );
  };

  const updateSourceFile = (id: number, file: File | null) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, file } : s)),
    );
  };

  const canSubmit =
    !loading &&
    sources.length > 0 &&
    sources.every(
      (s) =>
        (s.type === 'url' && s.url.trim().length > 0) ||
        (s.type === 'file' && s.file !== null),
    );

  const handleSubmit = async () => {
    if (!token) return;
    setError('');
    setLoading(true);

    const extractSources: ProfileExtractSource[] = sources.map((s) =>
      s.type === 'url' ? { url: s.url.trim() } : { file: s.file },
    );

    const payload: ProfileExtractRequest =
      extractSources.length === 1
        ? {
            mode: 'entire_document',
            ...(extractSources[0].url ? { url: extractSources[0].url } : {}),
            ...(extractSources[0].file ? { file: extractSources[0].file } : {}),
          }
        : { mode: 'entire_document', sources: extractSources };

    try {
      const res = await extractProfile(token, payload);
      setResult(res);
      onSuccess(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    }
    setLoading(false);
  };

  // Build summary chips
  const summaryParts: string[] = [];
  if (result) {
    if (result.user && Object.keys(result.user).length > 0)
      summaryParts.push(`${Object.keys(result.user).length} profile fields`);
    if (result.skills?.length) summaryParts.push(`${result.skills.length} skills`);
    if (result.experiences?.length) summaryParts.push(`${result.experiences.length} experiences`);
    if (result.education?.length) summaryParts.push(`${result.education.length} education records`);
    if (result.certificates?.length) summaryParts.push(`${result.certificates.length} certificates`);
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        Import Profile
      </DialogTitle>

      <DialogContent>
        {result ? (
          /* ── Success summary ─── */
          <Box sx={{ py: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Profile imported successfully
              {(result.sources_count ?? 1) > 1
                ? ` from ${result.sources_count} sources`
                : ''}
              !
            </Alert>
            {summaryParts.length > 0 ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Extracted and saved:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summaryParts.map((part) => (
                    <Chip key={part} label={part} size="small" color="primary" variant="outlined" />
                  ))}
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No data could be extracted. Try a different document or URL.
              </Typography>
            )}
            {result.content_too_long && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Some documents were too long to fully process. Data may be incomplete.
              </Alert>
            )}
          </Box>
        ) : (
          /* ── Multi-source input form ─── */
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add one or more sources — LinkedIn/Handshake profile URLs, or
              resume files (PDF, TXT, HTML). All sources are processed together.
            </Typography>

            <Stack spacing={1.5}>
              {sources.map((source, idx) => (
                <Stack
                  key={source.id}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    p: 1.5,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {source.type === 'url' ? (
                    <>
                      <LinkIcon color="action" sx={{ fontSize: 20, flexShrink: 0 }} />
                      <TextField
                        fullWidth
                        size="small"
                        label={`URL ${sources.length > 1 ? idx + 1 : ''}`}
                        placeholder="https://linkedin.com/in/yourname"
                        value={source.url}
                        onChange={(e) => updateSourceUrl(source.id, e.target.value)}
                        disabled={loading}
                        slotProps={{
                          input: {
                            endAdornment: (() => {
                              const hint = detectDomainHint(source.url);
                              return hint ? (
                                <Chip label={hint} size="small" color="info" variant="outlined" />
                              ) : null;
                            })(),
                          },
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <FileIcon color="action" sx={{ fontSize: 20, flexShrink: 0 }} />
                      {source.file ? (
                        <Chip
                          label={source.file.name}
                          size="small"
                          onDelete={() => updateSourceFile(source.id, null)}
                          sx={{ maxWidth: 250 }}
                        />
                      ) : (
                        <Button
                          component="label"
                          variant="outlined"
                          size="small"
                          startIcon={<UploadIcon />}
                          disabled={loading}
                        >
                          Choose File
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.txt,.html"
                            onChange={(e) =>
                              updateSourceFile(source.id, e.target.files?.[0] ?? null)
                            }
                          />
                        </Button>
                      )}
                    </>
                  )}
                  {sources.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => removeSource(source.id)}
                      disabled={loading}
                      aria-label="Remove source"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>

            {/* Add source button */}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              disabled={loading}
              sx={{ mt: 1 }}
            >
              Add Source
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => addSource('url')}>
                <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
                <ListItemText>URL</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => addSource('file')}>
                <ListItemIcon><UploadIcon fontSize="small" /></ListItemIcon>
                <ListItemText>File</ListItemText>
              </MenuItem>
            </Menu>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Extracting from {sources.length} source{sources.length > 1 ? 's' : ''}…
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {result ? (
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!canSubmit}
              startIcon={<AIIcon />}
            >
              {loading ? 'Extracting…' : `Import${sources.length > 1 ? ` (${sources.length})` : ''}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProfileImportModal;
