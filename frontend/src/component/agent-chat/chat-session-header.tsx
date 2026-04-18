import React, { useEffect, useState } from 'react';
import {
  Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { StatusChip as Chip } from '../../design-system';
import {
  ArrowBack as BackIcon,
  DescriptionOutlined as DocumentIcon,
  EditOutlined as EditIcon,
  OpenInNew as OpenIcon,
  SaveOutlined as SaveIcon,
} from '@mui/icons-material';

export interface ChatSessionHeaderProps {
  agentName: string;
  title: string;
  status: 'active' | 'archived';
  modelLabel: string;
  applicationId: string | null | undefined;
  isSavingTitle: boolean;
  isSavingDocument: boolean;
  canSaveDocument: boolean;
  onBack: () => void;
  onSaveTitle: (title: string) => Promise<void>;
  onSaveDocument: () => void;
}

const ChatSessionHeader: React.FC<ChatSessionHeaderProps> = ({
  agentName,
  title,
  status,
  modelLabel,
  applicationId,
  isSavingTitle,
  isSavingDocument,
  canSaveDocument,
  onBack,
  onSaveTitle,
  onSaveDocument,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(title);
    }
  }, [isEditing, title]);

  const handleSave = async () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === title.trim()) {
      setIsEditing(false);
      setDraftTitle(title);
      return;
    }

    await onSaveTitle(nextTitle);
    setIsEditing(false);
  };

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Button size="small" startIcon={<BackIcon />} onClick={onBack}>
          Agent
        </Button>
      </Stack>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
        {agentName}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <TextField
                size="small"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSave();
                  }
                  if (event.key === 'Escape') {
                    setDraftTitle(title);
                    setIsEditing(false);
                  }
                }}
                disabled={isSavingTitle}
                label="Session title"
                autoFocus
                fullWidth
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  disabled={isSavingTitle || !draftTitle.trim()}
                  onClick={() => void handleSave()}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => {
                    setDraftTitle(title);
                    setIsEditing(false);
                  }}
                  disabled={isSavingTitle}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ sm: 'center' }}
            >
              <Typography variant="h5" fontWeight={700} noWrap sx={{ minWidth: 0, flex: 1 }}>
                {title}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  sx={{ flexShrink: 0 }}
                >
                  Edit title
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DocumentIcon />}
                  onClick={onSaveDocument}
                  disabled={!canSaveDocument || isSavingDocument}
                  sx={{ flexShrink: 0 }}
                >
                  {isSavingDocument ? 'Saving…' : 'Save as Document'}
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap>
        <Chip
          label={status === 'archived' ? 'Archived' : 'Active'}
          size="small"
          color={status === 'archived' ? 'default' : 'success'}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`Model: ${modelLabel}`}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
        {applicationId && (
          <Link
            component={RouterLink}
            to={`/applications/${applicationId}`}
            underline="hover"
            variant="body2"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}
          >
            Application
            <OpenIcon sx={{ fontSize: 14 }} />
          </Link>
        )}
      </Stack>
    </Stack>
  );
};

export default ChatSessionHeader;
