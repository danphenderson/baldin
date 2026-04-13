import React, { useMemo } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { StatusChip as Chip } from '../../design-system';
import {
  Close as CancelIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import type { AgentSurfaceEntityRef } from '../../service/agents';
import { AgentEnabledMultilineField } from '../agent-surface';
import { radiusTokens, toRadiusPx } from '../../design-system/tokens/radius';

export interface ChatComposerError {
  message: string;
}

export interface ChatComposerSourceOption {
  id: string;
  title: string;
  kind: string;
  tags: string[];
}

export interface ChatComposerProps {
  surfaceId: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onRetry: () => void;
  streaming: boolean;
  archived: boolean;
  error: ChatComposerError | null;
  sourceOptions: ChatComposerSourceOption[];
  loadingSourceOptions: boolean;
  useDocuments: boolean;
  canUseDocuments: boolean;
  selectedDocumentIds: string[];
  lookupUrl: string;
  onToggleUseDocuments: (nextValue: boolean) => void;
  onChangeSelectedDocumentIds: (nextIds: string[]) => void;
  onChangeLookupUrl: (value: string) => void;
  entityRefs?: AgentSurfaceEntityRef[];
  applicationId?: string | null;
}

const ChatComposer: React.FC<ChatComposerProps> = ({
  surfaceId,
  value,
  onChange,
  onSubmit,
  onCancel,
  onRetry,
  streaming,
  archived,
  error,
  sourceOptions,
  loadingSourceOptions,
  useDocuments,
  canUseDocuments,
  selectedDocumentIds,
  lookupUrl,
  onToggleUseDocuments,
  onChangeSelectedDocumentIds,
  onChangeLookupUrl,
  entityRefs = [],
  applicationId = null,
}) => {
  const selectedOptions = useMemo(
    () => sourceOptions.filter((option) => selectedDocumentIds.includes(option.id)),
    [selectedDocumentIds, sourceOptions],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!streaming && !archived && value.trim()) {
        onSubmit();
      }
    }
  };

  const sourceControlsDisabled = streaming || archived;
  const documentToggleDisabled = sourceControlsDisabled || !canUseDocuments;

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
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: toRadiusPx(radiusTokens.lg),
            px: 1.5,
            py: 1.25,
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems={{ md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="subtitle2">
                  Sources
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Add selected documents or one URL for this reply.
                </Typography>
              </Box>
              <FormControlLabel
                control={(
                  <Switch
                    size="small"
                    checked={useDocuments}
                    onChange={(event) => onToggleUseDocuments(event.target.checked)}
                    disabled={documentToggleDisabled}
                  />
                )}
                label="Use documents"
                sx={{ m: 0 }}
              />
            </Stack>
            <Autocomplete<ChatComposerSourceOption, true, false, false>
              multiple
              size="small"
              options={sourceOptions}
              value={selectedOptions}
              loading={loadingSourceOptions}
              disabled={sourceControlsDisabled}
              getOptionLabel={(option) => option.title}
              isOptionEqualToValue={(option, current) => option.id === current.id}
              onChange={(_event, nextOptions) => {
                onChangeSelectedDocumentIds(nextOptions.map((option) => option.id));
              }}
              renderTags={(tagValue, getTagProps) => (
                tagValue.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.title}
                    size="small"
                  />
                ))
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Stack spacing={0.25}>
                    <Typography variant="body2">{option.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[option.kind.replace(/_/g, ' '), ...option.tags].join(' • ')}
                    </Typography>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selected documents"
                  placeholder={sourceOptions.length > 0 ? 'Choose documents' : 'No documents available'}
                  helperText={(
                    useDocuments
                      ? 'Selected documents will be searched for relevant context.'
                      : 'Pick documents here, then enable Use documents when you want retrieval.'
                  )}
                />
              )}
            />
            <TextField
              size="small"
              label="URL source"
              placeholder="https://example.com/profile"
              value={lookupUrl}
              onChange={(event) => onChangeLookupUrl(event.target.value)}
              disabled={sourceControlsDisabled}
              helperText="Optional. A single URL can be fetched and added as extra context for this turn."
            />
            {!canUseDocuments && sourceOptions.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Select at least one document before enabling document retrieval.
              </Typography>
            )}
          </Stack>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-end' }}>
          <AgentEnabledMultilineField
            fullWidth
            autoFocus
            multiline
            minRows={2}
            maxRows={8}
            slotProps={{ htmlInput: { 'aria-label': 'Chat message' } }}
            placeholder={archived ? 'Archived sessions are read-only.' : 'Ask the agent to refine, draft, or explain…'}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            disabled={streaming || archived}
            surfaceId={surfaceId}
            fieldKey="agent_chat_message"
            entityRefs={entityRefs}
            applicationId={applicationId}
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
