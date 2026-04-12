import React from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close as CancelIcon,
  Send as SendIcon,
} from '@mui/icons-material';

export interface ChatComposerError {
  message: string;
}

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onRetry: () => void;
  streaming: boolean;
  archived: boolean;
  error: ChatComposerError | null;
}

const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  onRetry,
  streaming,
  archived,
  error,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!streaming && !archived && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        position: 'sticky',
        bottom: 0,
        zIndex: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        {error && (
          <Alert
            severity="error"
            action={(
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            )}
          >
            {error.message}
          </Alert>
        )}
        {archived && (
          <Alert severity="info">
            This chat session is archived. Restore it from the agent detail page to continue.
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-end' }}>
          <TextField
            fullWidth
            autoFocus
            multiline
            minRows={2}
            maxRows={8}
            inputProps={{ 'aria-label': 'Chat message' }}
            placeholder={archived ? 'Archived sessions are read-only.' : 'Ask the agent to refine, draft, or explain…'}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming || archived}
          />
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignSelf: { sm: 'flex-end' } }}>
            {streaming && (
              <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={onSubmit}
              disabled={streaming || archived || !value.trim()}
            >
              Send
            </Button>
          </Stack>
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            Enter sends. Shift+Enter inserts a newline.
          </Typography>
          {streaming && (
            <Typography variant="caption" color="text.secondary">
              Response is streaming. Cancel to stop the current reply.
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export default ChatComposer;
