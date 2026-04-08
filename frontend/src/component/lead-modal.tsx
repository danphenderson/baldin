import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { timeAgo } from '../util/format';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { alpha } from '@mui/material/styles';
import {
  AutoAwesome as SparkIcon,
  Bolt as BoltIcon,
  Close as CloseIcon,
  Comment as CommentIcon,
  DeleteOutline as DeleteIcon,
  Groups as GroupsIcon,
  Language as LinkIcon,
  LockOutlined as LockIcon,
  OpenInNew as OpenIcon,
  PersonAddAlt1 as JoinIcon,
  Reply as ReplyIcon,
  SaveOutlined as SaveIcon,
  TravelExplore as ViewIcon,
  PersonAdd as PersonAddIcon,
  WorkspacesOutlined as LeadIcon,
  PlaylistAdd as PlaylistAddIcon,
} from '@mui/icons-material';
import ConfirmDialog from './common/confirm-dialog';
import CreateActionItemDialog from './create-action-item-dialog';
import type { ActionItemRead, ActionItemCreate } from '../service/action-items';
import type { CompanyRead } from '../service/companies';
import { avatarUrl } from '../service/users';
import {
  createLeadComment,
  createLeadCommentReply,
  createLeadRegistration,
  deleteLead,
  deleteLeadRegistration,
  getLead,
  getLeadComments,
  isLeadServiceError,
  type LeadCommentCreate,
  type LeadCommentRead,
  type LeadDetailRead,
  type LeadExtractResponse,
  type LeadRead,
  type LeadSharedUpdate,
  type LeadViewerPermissionsRead,
  updateLead,
  updateLeadRegistration,
} from '../service/leads';
import { createConnection } from '../service/connections';

type LeadTab = 'overview' | 'edit' | 'notes' | 'comments' | 'people';
export type LeadModalTab = LeadTab;

interface SharedDraft {
  title: string;
  description: string;
  location: string;
  salary: string;
  jobFunction: string;
  employmentType: string;
  seniorityLevel: string;
  educationLevel: string;
  hiringManager: string;
  companyIds: string[];
}

interface CommentDraft {
  content: string;
  anonymous: boolean;
}

interface LeadModalProps {
  open: boolean;
  token: string | null;
  leadId: string | null;
  companies: CompanyRead[];
  applying: boolean;
  extractContext: LeadExtractResponse | null;
  initialTab?: LeadTab;
  onClose: () => void;
  onApply: (lead: LeadRead) => void;
  onLeadChange: (lead: LeadRead) => void;
  onLeadDeleted: (leadId: string) => void;
  onNotify: (message: string, severity?: 'success' | 'error') => void;
}

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const SENIORITY_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Staff', 'Director', 'Executive'];
const TABS: Array<{ value: LeadTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'edit', label: 'Edit' },
  { value: 'notes', label: 'My Notes' },
  { value: 'comments', label: 'Comments' },
  { value: 'people', label: 'People' },
];
const EMPTY_COMMENT_DRAFT: CommentDraft = { content: '', anonymous: true };

const normalizeText = (value?: string | null): string => value ?? '';

const hasText = (value?: string | null): boolean => Boolean(value?.trim());

const sortIds = (ids: string[]): string[] => [...ids].sort((left, right) => left.localeCompare(right));

const sameIds = (left: string[], right: string[]): boolean => {
  const sortedLeft = sortIds(left);
  const sortedRight = sortIds(right);
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
};

const buildSharedDraft = (lead: LeadDetailRead | null): SharedDraft => ({
  title: normalizeText(lead?.title),
  description: normalizeText(lead?.description),
  location: normalizeText(lead?.location),
  salary: normalizeText(lead?.salary),
  jobFunction: normalizeText(lead?.job_function),
  employmentType: normalizeText(lead?.employment_type),
  seniorityLevel: normalizeText(lead?.seniority_level),
  educationLevel: normalizeText(lead?.education_level),
  hiringManager: normalizeText(lead?.hiring_manager),
  companyIds: lead?.companies?.map((company) => company.id) ?? [],
});

const toNullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const formatLeadError = (error: unknown, fallback: string): string => {
  if (isLeadServiceError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const getOtherInterestCount = (lead: Pick<LeadRead, 'interest_count' | 'viewer_is_registered'>): number => {
  const count = lead.interest_count ?? 0;
  return Math.max(count - (lead.viewer_is_registered ? 1 : 0), 0);
};

const canEditSharedField = (
  value: string | null | undefined,
  permissions?: LeadViewerPermissionsRead,
): boolean => Boolean(
  permissions?.can_update_shared_fields
  && (!hasText(value) || permissions?.can_clear_or_overwrite_shared_fields),
);

const canEditCompanies = (
  lead: LeadDetailRead | null,
  permissions?: LeadViewerPermissionsRead,
): boolean => Boolean(
  permissions?.can_update_shared_fields,
);

const canSaveCompanySelection = (
  lead: LeadDetailRead,
  draftCompanyIds: string[],
  permissions?: LeadViewerPermissionsRead,
): boolean => {
  if (!permissions?.can_update_shared_fields) {
    return false;
  }

  if (permissions.can_clear_or_overwrite_shared_fields) {
    return true;
  }

  const currentCompanyIds = lead.companies?.map((company) => company.id) ?? [];
  return currentCompanyIds.every((companyId) => draftCompanyIds.includes(companyId));
};

const buildSharedUpdate = (lead: LeadDetailRead, draft: SharedDraft): LeadSharedUpdate | null => {
  const next: LeadSharedUpdate = {};

  if (draft.title !== normalizeText(lead.title)) next.title = toNullable(draft.title);
  if (draft.description !== normalizeText(lead.description)) next.description = toNullable(draft.description);
  if (draft.location !== normalizeText(lead.location)) next.location = toNullable(draft.location);
  if (draft.salary !== normalizeText(lead.salary)) next.salary = toNullable(draft.salary);
  if (draft.jobFunction !== normalizeText(lead.job_function)) next.job_function = toNullable(draft.jobFunction);
  if (draft.employmentType !== normalizeText(lead.employment_type)) next.employment_type = toNullable(draft.employmentType);
  if (draft.seniorityLevel !== normalizeText(lead.seniority_level)) next.seniority_level = toNullable(draft.seniorityLevel);
  if (draft.educationLevel !== normalizeText(lead.education_level)) next.education_level = toNullable(draft.educationLevel);
  if (draft.hiringManager !== normalizeText(lead.hiring_manager)) next.hiring_manager = toNullable(draft.hiringManager);

  const currentIds = lead.companies?.map((company) => company.id) ?? [];
  if (!sameIds(currentIds, draft.companyIds)) {
    next.company_ids = draft.companyIds;
  }

  return Object.keys(next).length > 0 ? next : null;
};

const commentDisplayName = (comment: LeadCommentRead): string => {
  if (comment.anonymous ?? true) {
    return 'Anonymous teammate';
  }

  return comment.author_public_profile?.display_name || 'Visible participant';
};

const commentSubtitle = (comment: LeadCommentRead): string | null => {
  const profile = comment.author_public_profile;
  if (!profile || (comment.anonymous ?? true)) {
    return null;
  }

  return [profile.city, profile.state, profile.country].filter(Boolean).join(', ');
};

const MetricPill: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
}> = ({ label, value, icon, tone }) => (
  <Stack
    direction="row"
    spacing={1}
    alignItems="center"
    sx={{
      px: 1.5,
      py: 1,
      borderRadius: 999,
      backgroundColor: tone || 'rgba(255,255,255,0.12)',
      minWidth: 0,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>
    <Box>
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Box>
  </Stack>
);

const CommentComposer: React.FC<{
  label: string;
  draft: CommentDraft;
  disabled?: boolean;
  submitting?: boolean;
  submitLabel: string;
  onChange: (next: CommentDraft) => void;
  onSubmit: () => void;
}> = ({ label, draft, disabled, submitting, submitLabel, onChange, onSubmit }) => (
  <Stack spacing={1.5}>
    <TextField
      label={label}
      multiline
      minRows={3}
      value={draft.content}
      disabled={disabled}
      onChange={(event) => onChange({ ...draft, content: event.target.value })}
      placeholder="Share context, interview signals, or useful follow-up questions."
    />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
      <FormControlLabel
        control={(
          <Checkbox
            checked={draft.anonymous}
            disabled={disabled}
            onChange={(event) => onChange({ ...draft, anonymous: event.target.checked })}
          />
        )}
        label="Post anonymously"
      />
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={disabled || submitting || !draft.content.trim()}
      >
        {submitting ? 'Sending...' : submitLabel}
      </Button>
    </Stack>
  </Stack>
);

const CommentThread: React.FC<{
  comment: LeadCommentRead;
  canReply: boolean;
  replyOpen: boolean;
  replyDraft: CommentDraft;
  submittingReply: boolean;
  onReplyToggle: () => void;
  onReplyChange: (next: CommentDraft) => void;
  onReplySubmit: () => void;
}> = ({
  comment,
  canReply,
  replyOpen,
  replyDraft,
  submittingReply,
  onReplyToggle,
  onReplyChange,
  onReplySubmit,
}) => {
  const replies = [...(comment.replies ?? [])].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );

  const renderComment = (item: LeadCommentRead, nested = false) => (
    <Paper
      key={item.id}
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        backgroundColor: nested ? 'transparent' : 'background.paper',
        borderColor: nested ? 'divider' : alpha('#94a3b8', 0.16),
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Avatar
            src={item.anonymous
              ? undefined
              : avatarUrl(
                item.author_public_profile?.user_id,
                item.author_public_profile?.avatar_uri,
              )}
            sx={{ width: nested ? 32 : 38, height: nested ? 32 : 38 }}
          >
            {commentDisplayName(item).charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} alignItems={{ sm: 'center' }}>
              <Typography variant="body2" fontWeight={700}>{commentDisplayName(item)}</Typography>
              <Chip
                size="small"
                variant="outlined"
                label={item.anonymous ? 'Anonymous' : 'Profile shown'}
                sx={{ width: 'fit-content' }}
              />
              <Typography variant="caption" color="text.secondary">{timeAgo(item.created_at)}</Typography>
            </Stack>
            {commentSubtitle(item) && (
              <Typography variant="caption" color="text.secondary">{commentSubtitle(item)}</Typography>
            )}
          </Box>
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {item.content}
        </Typography>
      </Stack>
    </Paper>
  );

  return (
    <Stack spacing={1.5}>
      {renderComment(comment)}

      {canReply && (
        <Box sx={{ pl: { sm: 6 } }}>
          <Button startIcon={<ReplyIcon />} size="small" onClick={onReplyToggle}>
            {replyOpen ? 'Cancel reply' : 'Reply'}
          </Button>
        </Box>
      )}

      {replyOpen && canReply && (
        <Box sx={{ pl: { sm: 6 } }}>
          <CommentComposer
            label="Reply"
            draft={replyDraft}
            onChange={onReplyChange}
            onSubmit={onReplySubmit}
            submitting={submittingReply}
            submitLabel="Post Reply"
          />
        </Box>
      )}

      {replies.length > 0 && (
        <Stack spacing={1.25} sx={{ pl: { sm: 6 } }}>
          {replies.map((reply) => renderComment(reply, true))}
        </Stack>
      )}
    </Stack>
  );
};

const LeadModal: React.FC<LeadModalProps> = ({
  open,
  token,
  leadId,
  companies,
  applying,
  extractContext,
  initialTab,
  onClose,
  onApply,
  onLeadChange,
  onLeadDeleted,
  onNotify,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [tab, setTab] = useState<LeadTab>('overview');
  const [lead, setLead] = useState<LeadDetailRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [comments, setComments] = useState<LeadCommentRead[]>([]);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [sharedDraft, setSharedDraft] = useState<SharedDraft>(() => buildSharedDraft(null));
  const [sharedSaving, setSharedSaving] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [exposeProfile, setExposeProfile] = useState(false);
  const [registrationSaving, setRegistrationSaving] = useState(false);
  const [commentDraft, setCommentDraft] = useState<CommentDraft>(EMPTY_COMMENT_DRAFT);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, CommentDraft>>({});
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const permissions = lead?.viewer_permissions;
  const otherInterestCount = lead ? getOtherInterestCount(lead) : 0;

  const loadComments = useCallback(async (currentLead: LeadDetailRead) => {
    if (!token || !leadId) return;
    if (!currentLead.viewer_permissions?.can_view_comments) {
      setComments([]);
      setCommentsError('');
      return;
    }

    setCommentsLoading(true);
    setCommentsError('');
    try {
      const nextComments = await getLeadComments(token, leadId);
      setComments(nextComments);
    } catch (error) {
      setCommentsError(formatLeadError(error, 'Unable to load lead comments.'));
    } finally {
      setCommentsLoading(false);
    }
  }, [leadId, token]);

  const refreshLead = useCallback(async (showLoading = true) => {
    if (!open || !token || !leadId) return;

    if (showLoading) {
      setLoading(true);
    }
    setLoadError('');

    try {
      const nextLead = await getLead(token, leadId);
      setLead(nextLead);
      onLeadChange(nextLead);
      await loadComments(nextLead);
    } catch (error) {
      setLoadError(formatLeadError(error, 'Unable to load lead details.'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [leadId, loadComments, onLeadChange, open, token]);

  useEffect(() => {
    if (!open || !leadId) return;
    void refreshLead();
  }, [leadId, open, refreshLead]);

  useEffect(() => {
    setSharedDraft(buildSharedDraft(lead));
    setNoteDraft(lead?.viewer_registration?.internal_notes ?? '');
    setExposeProfile(Boolean(lead?.viewer_registration?.expose_profile));
    setCommentDraft(EMPTY_COMMENT_DRAFT);
    setReplyOpenId(null);
    setReplyDrafts({});
  }, [lead]);

  useEffect(() => {
    if (!open) {
      setTab('overview');
      setConfirmDelete(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && initialTab) {
      setTab(initialTab);
    }
  }, [initialTab, open]);

  const sharedUpdate = useMemo(() => (lead ? buildSharedUpdate(lead, sharedDraft) : null), [lead, sharedDraft]);
  const sharedDirty = Boolean(sharedUpdate);
  const canSaveSharedUpdate = useMemo(() => {
    if (!lead || !sharedUpdate) {
      return false;
    }

    if (sharedUpdate.company_ids !== undefined && !canSaveCompanySelection(lead, sharedDraft.companyIds, permissions)) {
      return false;
    }

    return true;
  }, [lead, permissions, sharedDraft.companyIds, sharedUpdate]);
  const registrationDirty = Boolean(
    lead?.viewer_registration
    && (noteDraft !== (lead.viewer_registration.internal_notes ?? '')
      || exposeProfile !== Boolean(lead.viewer_registration.expose_profile)),
  );

  const hotLeadCopy = useMemo(() => {
    if (!extractContext || extractContext.lead.id !== leadId) {
      return null;
    }

    switch (extractContext.disposition) {
      case 'created':
        return {
          eyebrow: 'Fresh capture',
          title: 'New shared lead added to your board',
          description: 'We normalized the posting URL and created a trackable lead record so your team can build collaboration around it.',
        };
      case 'matched_existing_joined':
        return {
          eyebrow: 'Hot lead match',
          title: 'This posting already existed, and you joined it',
          description: 'You landed on an active shared lead instead of creating a duplicate record, so the existing collaboration signal stays intact.',
        };
      default:
        return {
          eyebrow: 'Hot lead resurfaced',
          title: 'You were already registered on this shared lead',
          description: 'This extraction reopened an active opportunity you are already tracking, so we kept you in the existing collaboration flow.',
        };
    }
  }, [extractContext, leadId]);

  const handleSharedSave = async () => {
    if (!token || !leadId || !sharedUpdate) return;

    setSharedSaving(true);
    try {
      const updated = await updateLead(token, leadId, sharedUpdate);
      onLeadChange(updated);
      onNotify('Shared lead fields saved.');
      await refreshLead(false);
    } catch (error) {
      onNotify(formatLeadError(error, 'Unable to save shared lead fields.'), 'error');
    } finally {
      setSharedSaving(false);
    }
  };

  const handleJoinLead = async () => {
    if (!token || !leadId) return;

    setRegistrationSaving(true);
    try {
      await createLeadRegistration(token, leadId);
      onNotify('You are now following this lead.');
      setTab('notes');
      await refreshLead(false);
    } catch (error) {
      onNotify(formatLeadError(error, 'Unable to register interest on this lead.'), 'error');
    } finally {
      setRegistrationSaving(false);
    }
  };

  const handleRegistrationSave = async () => {
    if (!token || !leadId || !lead?.viewer_registration) return;

    setRegistrationSaving(true);
    try {
      await updateLeadRegistration(token, leadId, {
        internal_notes: noteDraft.trim() ? noteDraft : null,
        expose_profile: exposeProfile,
      });
      onNotify('Your lead notes were saved.');
      await refreshLead(false);
    } catch (error) {
      onNotify(formatLeadError(error, 'Unable to update your registration.'), 'error');
    } finally {
      setRegistrationSaving(false);
    }
  };

  const handleLeaveLead = async () => {
    if (!token || !leadId) return;

    setRegistrationSaving(true);
    try {
      await deleteLeadRegistration(token, leadId);
      onNotify('You left this shared lead.');
      await refreshLead(false);
    } catch (error) {
      onNotify(formatLeadError(error, 'Unable to leave this lead.'), 'error');
    } finally {
      setRegistrationSaving(false);
    }
  };

  const handlePostComment = async () => {
    if (!token || !leadId || !commentDraft.content.trim()) return;

    setCommentSubmitting(true);
    try {
      const payload: LeadCommentCreate = {
        content: commentDraft.content.trim(),
        anonymous: commentDraft.anonymous,
      };
      await createLeadComment(token, leadId, payload);
      setCommentDraft(EMPTY_COMMENT_DRAFT);
      onNotify('Comment posted.');
      await refreshLead(false);
    } catch (error) {
      onNotify(formatLeadError(error, 'Unable to post your comment.'), 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handlePostReply = async (commentId: string) => {
    if (!token || !leadId) return;

    const draft = replyDrafts[commentId] ?? EMPTY_COMMENT_DRAFT;
    if (!draft.content.trim()) return;

    setReplySubmittingId(commentId);
    try {
      await createLeadCommentReply(token, leadId, commentId, {
        content: draft.content.trim(),
        anonymous: draft.anonymous,
      });
      setReplyDrafts((current) => ({ ...current, [commentId]: EMPTY_COMMENT_DRAFT }));
      setReplyOpenId(null);
      onNotify('Reply posted.');
      await refreshLead(false);
    } catch (error) {
      onNotify(formatLeadError(error, 'Unable to post your reply.'), 'error');
    } finally {
      setReplySubmittingId(null);
    }
  };

  const handleDeleteLead = async () => {
    if (!token || !leadId) return;

    setDeleting(true);
    try {
      await deleteLead(token, leadId);
      onNotify('Lead deleted.');
      onLeadDeleted(leadId);
      setConfirmDelete(false);
      onClose();
    } catch (error) {
      onNotify(formatLeadError(error, 'Unable to delete this lead.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const renderOverview = () => {
    if (!lead) return null;

    return (
      <Stack spacing={3}>
        {hotLeadCopy && (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 4,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.2)}, ${alpha(theme.palette.primary.main, 0.14)})`,
              borderColor: alpha(theme.palette.primary.main, 0.28),
            }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="primary.main">{hotLeadCopy.eyebrow}</Typography>
              <Typography variant="h5">{hotLeadCopy.title}</Typography>
              <Typography variant="body2" color="text.secondary">{hotLeadCopy.description}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Chip label={`${lead.interest_count ?? 0} tracking`} icon={<GroupsIcon />} />
                <Chip label={`${lead.comment_count ?? 0} comments`} icon={<CommentIcon />} />
                <Chip label="Canonical URL ready" icon={<BoltIcon />} />
              </Stack>
            </Stack>
          </Paper>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">Lead Narrative</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
                    {lead.description || 'No shared description has been added yet. Open the edit tab to enrich the context for everyone tracking this opportunity.'}
                  </Typography>
                  <Divider />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Chip label={lead.employment_type || 'Employment type unknown'} variant="outlined" />
                    <Chip label={lead.seniority_level || 'Seniority not set'} variant="outlined" />
                    <Chip label={lead.job_function || 'Job function open'} variant="outlined" />
                    <Chip label={lead.education_level || 'Education level open'} variant="outlined" />
                    {lead.salary && <Chip label={lead.salary} variant="outlined" color="success" />}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2}>
              <Card>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" color="text.secondary">Collaboration Signal</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lead.viewer_is_registered
                        ? otherInterestCount > 0
                          ? `${otherInterestCount} other ${otherInterestCount === 1 ? 'person is' : 'people are'} interested alongside you.`
                          : 'You are the first registered viewer on this lead.'
                        : (lead.interest_count ?? 0) > 0
                          ? `${lead.interest_count} ${(lead.interest_count ?? 0) === 1 ? 'person is' : 'people are'} already tracking this lead.`
                          : 'No one has registered interest yet.'}
                    </Typography>
                    <Stack spacing={1}>
                      <MetricPill label="Registered interest" value={`${lead.interest_count ?? 0}`} icon={<GroupsIcon fontSize="small" />} tone={alpha(theme.palette.primary.main, 0.12)} />
                      <MetricPill label="Conversation" value={`${lead.comment_count ?? 0} messages`} icon={<CommentIcon fontSize="small" />} tone={alpha(theme.palette.secondary.main, 0.12)} />
                      <MetricPill label="Viewer state" value={lead.viewer_is_registered ? 'Following' : 'Not joined'} icon={<ViewIcon fontSize="small" />} tone={alpha(theme.palette.success.main, 0.12)} />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2" color="text.secondary">Lead Source</Typography>
                    <Typography variant="body2" color="text.secondary">Canonical URL</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{lead.canonical_url}</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<OpenIcon />}
                      component="a"
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open posting
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    );
  };

  const renderEdit = () => {
    if (!lead) return null;

    const canUpdateShared = Boolean(permissions?.can_update_shared_fields);
    const canOverwrite = Boolean(permissions?.can_clear_or_overwrite_shared_fields);

    return (
      <Stack spacing={2.5}>
        {!canUpdateShared && (
          <Alert severity="info">This lead is shared read-only for you. Only viewers with update permission can edit shared fields.</Alert>
        )}
        {canUpdateShared && !canOverwrite && (
          <Alert severity="info">You can fill empty shared fields, but populated values are locked unless the server grants overwrite permission.</Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Title"
              value={sharedDraft.title}
              onChange={(event) => setSharedDraft((current) => ({ ...current, title: event.target.value }))}
              disabled={!canEditSharedField(lead.title, permissions)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Location"
              value={sharedDraft.location}
              onChange={(event) => setSharedDraft((current) => ({ ...current, location: event.target.value }))}
              disabled={!canEditSharedField(lead.location, permissions)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Salary"
              value={sharedDraft.salary}
              onChange={(event) => setSharedDraft((current) => ({ ...current, salary: event.target.value }))}
              disabled={!canEditSharedField(lead.salary, permissions)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Hiring Manager"
              value={sharedDraft.hiringManager}
              onChange={(event) => setSharedDraft((current) => ({ ...current, hiringManager: event.target.value }))}
              disabled={!canEditSharedField(lead.hiring_manager, permissions)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Job Function"
              value={sharedDraft.jobFunction}
              onChange={(event) => setSharedDraft((current) => ({ ...current, jobFunction: event.target.value }))}
              disabled={!canEditSharedField(lead.job_function, permissions)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth disabled={!canEditSharedField(lead.employment_type, permissions)}>
              <InputLabel>Employment Type</InputLabel>
              <Select
                value={sharedDraft.employmentType}
                label="Employment Type"
                onChange={(event) => setSharedDraft((current) => ({ ...current, employmentType: event.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {EMPLOYMENT_TYPES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth disabled={!canEditSharedField(lead.seniority_level, permissions)}>
              <InputLabel>Seniority Level</InputLabel>
              <Select
                value={sharedDraft.seniorityLevel}
                label="Seniority Level"
                onChange={(event) => setSharedDraft((current) => ({ ...current, seniorityLevel: event.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {SENIORITY_LEVELS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Education Level"
              value={sharedDraft.educationLevel}
              onChange={(event) => setSharedDraft((current) => ({ ...current, educationLevel: event.target.value }))}
              disabled={!canEditSharedField(lead.education_level, permissions)}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth disabled={!canEditCompanies(lead, permissions)}>
              <InputLabel>Associated Companies</InputLabel>
              <Select
                multiple
                value={sharedDraft.companyIds}
                label="Associated Companies"
                onChange={(event) => setSharedDraft((current) => ({ ...current, companyIds: event.target.value as string[] }))}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {selected.map((id) => {
                      const company = companies.find((item) => item.id === id);
                      return <Chip key={id} label={company?.name || id} size="small" />;
                    })}
                  </Stack>
                )}
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              minRows={7}
              value={sharedDraft.description}
              onChange={(event) => setSharedDraft((current) => ({ ...current, description: event.target.value }))}
              disabled={!canEditSharedField(lead.description, permissions)}
            />
          </Grid>
        </Grid>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!sharedDirty || sharedSaving || !canSaveSharedUpdate}
            onClick={handleSharedSave}
          >
            {sharedSaving ? 'Saving...' : 'Save Shared Fields'}
          </Button>
          {permissions?.can_delete_shared_lead && (
            <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>
              Delete Shared Lead
            </Button>
          )}
        </Stack>
      </Stack>
    );
  };

  const renderNotes = () => {
    if (!lead) return null;

    if (!lead.viewer_registration) {
      return (
        <Stack spacing={2}>
          <Alert severity="info">Register interest to keep private notes, decide whether your profile is visible, and unlock collaboration actions that depend on registration.</Alert>
          <Button
            variant="contained"
            startIcon={<JoinIcon />}
            disabled={!permissions?.can_register || registrationSaving}
            onClick={handleJoinLead}
            sx={{ width: 'fit-content' }}
          >
            {registrationSaving ? 'Joining...' : permissions?.can_register ? 'Join Lead' : 'Registration Locked'}
          </Button>
        </Stack>
      );
    }

    return (
      <Stack spacing={2.5}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 4 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Registration Status</Typography>
            <Typography variant="body2" color="text.secondary">
              You joined this shared lead {timeAgo(lead.viewer_registration.created_at)}. Your notes stay private, while profile visibility controls whether others can see your public profile in the participant list.
            </Typography>
          </Stack>
        </Paper>

        <TextField
          label="Internal notes"
          multiline
          minRows={8}
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          disabled={!permissions?.can_update_registration}
          placeholder="Capture interview prep, salary signals, concerns, or outreach notes visible only to you."
        />

        <FormControlLabel
          control={(
            <Switch
              checked={exposeProfile}
              onChange={(event) => setExposeProfile(event.target.checked)}
              disabled={!permissions?.can_update_registration}
            />
          )}
          label="Expose my public profile to other registered participants"
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!registrationDirty || registrationSaving || !permissions?.can_update_registration}
            onClick={handleRegistrationSave}
          >
            {registrationSaving ? 'Saving...' : 'Save My Notes'}
          </Button>
          {permissions?.can_leave_registration && (
            <Button color="inherit" disabled={registrationSaving} onClick={handleLeaveLead}>
              Leave Lead
            </Button>
          )}
        </Stack>
      </Stack>
    );
  };

  const renderComments = () => {
    if (!lead) return null;

    if (!permissions?.can_view_comments) {
      return (
        <Alert severity="info" icon={<LockIcon />}>
          Comment access is not available for this lead yet. Join the lead or wait for the server to grant comment visibility.
        </Alert>
      );
    }

    return (
      <Stack spacing={2.5}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 4 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Threaded Collaboration</Typography>
            <Typography variant="body2" color="text.secondary">
              Comments default to anonymous posting. Replies stay one level deep so the thread remains scannable inside the lead view.
            </Typography>
          </Stack>
        </Paper>

        {permissions.can_post_comments ? (
          <CommentComposer
            label="Add a comment"
            draft={commentDraft}
            onChange={setCommentDraft}
            onSubmit={handlePostComment}
            submitting={commentSubmitting}
            submitLabel="Post Comment"
          />
        ) : (
          <Alert severity="info">You can read comments on this lead, but posting is currently disabled by the server.</Alert>
        )}

        {commentsError && <Alert severity="error">{commentsError}</Alert>}

        {commentsLoading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" height={110} sx={{ borderRadius: 3 }} />
            ))}
          </Stack>
        ) : comments.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, textAlign: 'center' }}>
            <Typography variant="body1" fontWeight={700}>No comments yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Start the thread with interview context, recruiter signal, or process notes. Anonymous posting is already enabled.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                canReply={Boolean(permissions.can_post_comments)}
                replyOpen={replyOpenId === comment.id}
                replyDraft={replyDrafts[comment.id] ?? EMPTY_COMMENT_DRAFT}
                submittingReply={replySubmittingId === comment.id}
                onReplyToggle={() => setReplyOpenId((current) => current === comment.id ? null : comment.id)}
                onReplyChange={(next) => setReplyDrafts((current) => ({ ...current, [comment.id]: next }))}
                onReplySubmit={() => void handlePostReply(comment.id)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    );
  };

  const renderPeople = () => {
    if (!lead) return null;

    const participants = lead.participant_summaries ?? [];

    return (
      <Stack spacing={2.5}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 4 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Participant Context</Typography>
            <Typography variant="body2" color="text.secondary">
              {participants.length > 0
                ? `${participants.length} registered participant${participants.length === 1 ? '' : 's'} exposed a profile on this lead.`
                : otherInterestCount > 0
                  ? `${otherInterestCount} other ${otherInterestCount === 1 ? 'person is' : 'people are'} interested, but everyone is still anonymous.`
                  : 'No exposed participant profiles yet.'}
            </Typography>
          </Stack>
        </Paper>

        {participants.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="body1" fontWeight={700}>No public participant profiles yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              If you are registered on this lead, you can opt into profile visibility from the My Notes tab.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {participants.map((participant) => {
              const profile = participant.public_profile;
              const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ');
              const isConnected = participant.is_connected ?? false;

              const handleParticipantConnect = async () => {
                if (!token) return;
                setConnectingUserId(profile.user_id);
                try {
                  await createConnection(token, { addressee_id: profile.user_id });
                  onNotify('Connection request sent');
                } catch (err: unknown) {
                  onNotify(err instanceof Error ? err.message : 'Failed to send request', 'error');
                }
                setConnectingUserId(null);
              };

              return (
                <Grid key={profile.user_id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Avatar src={avatarUrl(profile.user_id, profile.avatar_uri)} sx={{ width: 48, height: 48 }}>
                            {profile.display_name.charAt(0)}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body1" fontWeight={700}>{profile.display_name}</Typography>
                            {location && <Typography variant="body2" color="text.secondary">{location}</Typography>}
                          </Box>
                          {isConnected && (
                            <Chip label="Connected" size="small" color="success" variant="outlined" />
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                            Joined {timeAgo(participant.registered_at)}
                          </Typography>
                          {!isConnected && (
                            <Chip
                              icon={connectingUserId === profile.user_id ? undefined : <PersonAddIcon />}
                              label={connectingUserId === profile.user_id ? 'Sending…' : 'Connect'}
                              color="primary"
                              variant="outlined"
                              size="small"
                              disabled={connectingUserId === profile.user_id}
                              onClick={handleParticipantConnect}
                            />
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Stack>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        fullScreen={fullScreen}
        scroll="paper"
        aria-labelledby="lead-detail-title"
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            backgroundColor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 2, sm: 2.75 },
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.5)}, ${alpha(theme.palette.secondary.dark, 0.34)})`
                : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.18)}, ${alpha(theme.palette.secondary.light, 0.14)})`,
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip icon={<LeadIcon />} label="Shared lead view" size="small" />
                    {lead?.viewer_is_registered && <Chip icon={<SparkIcon />} label="Following" size="small" color="success" />}
                  </Stack>
                  <Typography id="lead-detail-title" variant="h4" sx={{ lineHeight: 1.05 }}>
                    {lead?.title || 'Lead details'}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 1.25 }}>
                    <Typography variant="body1" color="text.secondary">
                      {lead?.companies?.map((company) => company.name).join(', ') || 'Company pending'}
                    </Typography>
                    {lead?.location && (
                      <Typography variant="body1" color="text.secondary">{lead.location}</Typography>
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {lead?.url && (
                    <Tooltip title="Open posting">
                      <IconButton component="a" href={lead.url} target="_blank" rel="noopener noreferrer">
                        <OpenIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Close lead view">
                    <IconButton onClick={onClose} aria-label="Close lead details">
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {lead && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                  <MetricPill label="Interest" value={`${lead.interest_count ?? 0} tracking`} icon={<GroupsIcon fontSize="small" />} tone={alpha(theme.palette.primary.main, 0.16)} />
                  <MetricPill label="Conversation" value={`${lead.comment_count ?? 0} comments`} icon={<CommentIcon fontSize="small" />} tone={alpha(theme.palette.secondary.main, 0.16)} />
                  <MetricPill label="Others interested" value={`${otherInterestCount}`} icon={<BoltIcon fontSize="small" />} tone={alpha(theme.palette.warning.main, 0.16)} />
                </Stack>
              )}

              {lead && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button variant="contained" onClick={() => onApply(lead)} disabled={applying}>
                    {applying ? 'Applying...' : 'Quick Apply'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PlaylistAddIcon />}
                    onClick={() => setActionDialogOpen(true)}
                    sx={{ textTransform: 'none' }}
                  >
                    Create Action
                  </Button>
                  {!lead.viewer_is_registered && permissions?.can_register && (
                    <Button variant="outlined" startIcon={<JoinIcon />} onClick={handleJoinLead} disabled={registrationSaving}>
                      {registrationSaving ? 'Joining...' : 'Join Lead'}
                    </Button>
                  )}
                  {lead.canonical_url && (
                    <Button variant="text" startIcon={<LinkIcon />} component="a" href={lead.canonical_url} target="_blank" rel="noopener noreferrer">
                      Canonical link
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Box>

          <Tabs
            value={tab}
            onChange={(_event, nextTab: LeadTab) => setTab(nextTab)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: { xs: 1, sm: 2 } }}
          >
            {TABS.map((item) => (
              <Tab key={item.value} value={item.value} label={item.label} />
            ))}
          </Tabs>
        </Box>

        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {loading && !lead ? (
              <Stack spacing={2}>
                <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }} />
                <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
              </Stack>
            ) : loadError ? (
              <Stack spacing={2}>
                <Alert severity="error">{loadError}</Alert>
                <Button variant="contained" onClick={() => void refreshLead()}>Retry</Button>
              </Stack>
            ) : (
              <>
                {tab === 'overview' && renderOverview()}
                {tab === 'edit' && renderEdit()}
                {tab === 'notes' && renderNotes()}
                {tab === 'comments' && renderComments()}
                {tab === 'people' && renderPeople()}
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Shared Lead"
        message={(
          <Typography>
            Delete this shared lead for everyone? This cannot be undone.
          </Typography>
        )}
        confirmLabel="Delete Lead"
        loading={deleting}
        onConfirm={handleDeleteLead}
        onCancel={() => setConfirmDelete(false)}
      />

      {lead && (
        <CreateActionItemDialog
          open={actionDialogOpen}
          onClose={() => setActionDialogOpen(false)}
          onCreated={(item: ActionItemRead) => {
            setActionDialogOpen(false);
            onNotify('Action item created', 'success');
          }}
          defaults={{
            title: `Review: ${lead.title ?? 'Lead'}`,
            kind: 'review_lead' as ActionItemCreate['kind'],
            lead_id: lead.id,
          }}
        />
      )}
    </>
  );
};

export default LeadModal;
