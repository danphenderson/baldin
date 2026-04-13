import React, { useCallback, useState } from 'react';
import {
  Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AutoAwesome as SuggestIcon,
  Check as AcceptIcon,
  CheckCircle as AcceptAllIcon,
  Close as DiscardIcon,
} from '@mui/icons-material';
import { Caption, CardShell, CardTitle, InlineFeedback, StatusChip } from '../design-system';
import {
  AspirationServiceError,
  type AspirationAdapter,
  type AspirationKind,
  type AspirationSuggestionDraft,
  type SuggestErrorCategory,
} from '../service/aspirations';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SuggestionReviewPanelProps {
  kind: AspirationKind;
  kindLabel: string;
  adapter: AspirationAdapter;
  onAccepted: () => void;
}

interface AcceptAllSummary {
  created: number;
  duplicates: number;
  remaining: number;
}

/* ------------------------------------------------------------------ */
/*  Error-category copy                                                */
/* ------------------------------------------------------------------ */

function suggestErrorFeedback(category: SuggestErrorCategory, kindLabel: string) {
  switch (category) {
    case 'no_signal':
      return {
        tone: 'warning' as const,
        message: `No strong ${kindLabel.toLowerCase()} signals found in your profile. Add more detail to your resume, headline, or work history and try again.`,
      };
    case 'rate_limited':
      return {
        tone: 'error' as const,
        message: 'Suggestion requests are temporarily rate limited. Wait a moment and try again.',
      };
    case 'ai_disabled':
      return {
        tone: 'error' as const,
        message: 'AI-powered suggestions are currently unavailable. This is a service issue — adding profile data will not help. Try again later.',
      };
    case 'network':
      return {
        tone: 'error' as const,
        message: 'Unable to reach the server. Check your connection and try again.',
      };
    default:
      return {
        tone: 'error' as const,
        message: 'Something went wrong loading suggestions. Try again.',
      };
  }
}

function acceptErrorFeedback(category: SuggestErrorCategory) {
  switch (category) {
    case 'rate_limited':
      return 'Rate limited — wait a moment and try again.';
    case 'ai_disabled':
      return 'Service temporarily unavailable. Try again later.';
    case 'network':
      return 'Unable to reach the server. Check your connection and try again.';
    default:
      return 'Failed to save aspiration. Try again.';
  }
}

/* ------------------------------------------------------------------ */
/*  Suggestion card                                                    */
/* ------------------------------------------------------------------ */

function SuggestionCard({
  suggestion,
  accepting,
  onAccept,
  onDiscard,
}: {
  suggestion: AspirationSuggestionDraft;
  accepting: boolean;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  return (
    <CardShell aria-label={`${suggestion.label} suggested aspiration`}>
      <Stack spacing={1.25}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <CardTitle sx={{ minWidth: 0 }}>{suggestion.label}</CardTitle>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title="Accept">
              <span>
                <IconButton
                  size="small"
                  color="success"
                  onClick={onAccept}
                  disabled={accepting}
                  aria-label={`Accept ${suggestion.label}`}
                >
                  {accepting ? <CircularProgress size={18} /> : <AcceptIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Discard">
              <IconButton
                size="small"
                onClick={onDiscard}
                disabled={accepting}
                aria-label={`Discard ${suggestion.label}`}
              >
                <DiscardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {suggestion.reason && (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            {suggestion.reason}
          </Typography>
        )}

        {suggestion.notes && (
          <Caption sx={{ fontStyle: 'italic' }}>
            {suggestion.notes}
          </Caption>
        )}
      </Stack>
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */

const SuggestionReviewPanel: React.FC<SuggestionReviewPanelProps> = ({
  kind,
  kindLabel,
  adapter,
  onAccepted,
}) => {
  const [drafts, setDrafts] = useState<AspirationSuggestionDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [errorCategory, setErrorCategory] = useState<SuggestErrorCategory | null>(null);
  const [acceptingLabel, setAcceptingLabel] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptAllRunning, setAcceptAllRunning] = useState(false);
  const [acceptAllSummary, setAcceptAllSummary] = useState<AcceptAllSummary | null>(null);

  const handleFetch = useCallback(async () => {
    setLoading(true);
    setErrorCategory(null);
    setAcceptError(null);
    setAcceptAllSummary(null);
    try {
      const suggestions = await adapter.suggest(kind);
      setDrafts(suggestions);
      setFetched(true);
    } catch (e) {
      if (e instanceof AspirationServiceError) {
        setErrorCategory(e.category);
        if (e.category === 'no_signal') {
          setDrafts([]);
        }
      } else {
        setErrorCategory('unknown');
      }
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [adapter, kind]);

  const handleAcceptOne = useCallback(async (suggestion: AspirationSuggestionDraft) => {
    setAcceptingLabel(suggestion.label);
    setAcceptError(null);
    try {
      await adapter.create(kind, {
        label: suggestion.label,
        reason: suggestion.reason ?? undefined,
        notes: suggestion.notes ?? undefined,
      });
      setDrafts((prev) => prev.filter((d) => d.label !== suggestion.label));
      onAccepted();
    } catch (e) {
      if (e instanceof AspirationServiceError && e.category === 'duplicate') {
        setDrafts((prev) => prev.filter((d) => d.label !== suggestion.label));
        setAcceptError(`"${suggestion.label}" already exists in your aspirations.`);
        onAccepted();
      } else if (e instanceof AspirationServiceError) {
        setAcceptError(acceptErrorFeedback(e.category));
      } else {
        setAcceptError('Failed to save aspiration. Try again.');
      }
    } finally {
      setAcceptingLabel(null);
    }
  }, [adapter, kind, onAccepted]);

  const handleDiscard = useCallback((suggestion: AspirationSuggestionDraft) => {
    setDrafts((prev) => prev.filter((d) => d.label !== suggestion.label));
    setAcceptError(null);
  }, []);

  const handleAcceptAll = useCallback(async () => {
    setAcceptAllRunning(true);
    setAcceptError(null);
    setAcceptAllSummary(null);
    let created = 0;
    let duplicates = 0;
    const activeDrafts = [...drafts];

    for (const suggestion of activeDrafts) {
      setAcceptingLabel(suggestion.label);
      try {
        await adapter.create(kind, {
          label: suggestion.label,
          reason: suggestion.reason ?? undefined,
          notes: suggestion.notes ?? undefined,
        });
        created += 1;
        setDrafts((prev) => prev.filter((d) => d.label !== suggestion.label));
      } catch (e) {
        if (e instanceof AspirationServiceError && e.category === 'duplicate') {
          duplicates += 1;
          setDrafts((prev) => prev.filter((d) => d.label !== suggestion.label));
        } else {
          // Stop on first retryable error
          const remaining = activeDrafts.length - created - duplicates;
          setAcceptAllSummary({ created, duplicates, remaining });
          if (e instanceof AspirationServiceError) {
            setAcceptError(acceptErrorFeedback(e.category));
          } else {
            setAcceptError('Failed to save aspiration. Try again.');
          }
          setAcceptingLabel(null);
          setAcceptAllRunning(false);
          if (created > 0 || duplicates > 0) onAccepted();
          return;
        }
      }
    }

    setAcceptingLabel(null);
    setAcceptAllRunning(false);
    setAcceptAllSummary({ created, duplicates, remaining: 0 });
    if (created > 0 || duplicates > 0) onAccepted();
  }, [adapter, kind, drafts, onAccepted]);

  /* ---- Feedback for no-signal (clears drafts, shows guidance) ---- */
  if (fetched && errorCategory === 'no_signal') {
    const feedback = suggestErrorFeedback('no_signal', kindLabel);
    return (
      <Box sx={{ mb: 3 }}>
        <InlineFeedback tone={feedback.tone} sx={{ mb: 2 }}>
          {feedback.message}
        </InlineFeedback>
        <Button
          variant="outlined"
          startIcon={<SuggestIcon />}
          onClick={handleFetch}
          disabled={loading}
          size="small"
        >
          {loading ? 'Loading…' : 'Retry suggestions'}
        </Button>
      </Box>
    );
  }

  /* ---- Non-no_signal error feedback ---- */
  if (fetched && errorCategory && errorCategory !== 'no_signal') {
    const feedback = suggestErrorFeedback(errorCategory, kindLabel);
    return (
      <Box sx={{ mb: 3 }}>
        <InlineFeedback tone={feedback.tone} sx={{ mb: 2 }}>
          {feedback.message}
        </InlineFeedback>
        <Button
          variant="outlined"
          startIcon={<SuggestIcon />}
          onClick={handleFetch}
          disabled={loading}
          size="small"
        >
          {loading ? 'Loading…' : 'Retry suggestions'}
        </Button>
      </Box>
    );
  }

  /* ---- Not yet fetched: just the trigger button ---- */
  if (!fetched) {
    return (
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={18} /> : <SuggestIcon />}
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? 'Loading suggestions…' : 'Suggest from profile'}
        </Button>
      </Box>
    );
  }

  /* ---- Fetched but no drafts remain ---- */
  if (drafts.length === 0) {
    return (
      <Box sx={{ mb: 3 }}>
        {acceptAllSummary && (
          <InlineFeedback tone="success" sx={{ mb: 2 }}>
            {acceptAllSummary.created > 0 && `${acceptAllSummary.created} ${kindLabel.toLowerCase()}${acceptAllSummary.created === 1 ? '' : 's'} added. `}
            {acceptAllSummary.duplicates > 0 && `${acceptAllSummary.duplicates} already existed. `}
            All suggestions processed.
          </InlineFeedback>
        )}
        <Button
          variant="outlined"
          startIcon={<SuggestIcon />}
          onClick={handleFetch}
          disabled={loading}
          size="small"
        >
          {loading ? 'Loading…' : 'Suggest again'}
        </Button>
      </Box>
    );
  }

  /* ---- Drafts available for review ---- */
  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <StatusChip
          label={`${drafts.length} suggestion${drafts.length === 1 ? '' : 's'}`}
          emphasis="outline"
          tone="info"
          size="small"
        />
        <Button
          variant="contained"
          size="small"
          startIcon={acceptAllRunning ? <CircularProgress size={16} color="inherit" /> : <AcceptAllIcon />}
          onClick={handleAcceptAll}
          disabled={acceptAllRunning}
        >
          Accept all
        </Button>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <SuggestIcon />}
          onClick={handleFetch}
          disabled={loading || acceptAllRunning}
          size="small"
        >
          Refresh
        </Button>
      </Stack>

      {acceptError && (
        <InlineFeedback tone="error" density="compact" sx={{ mb: 2 }}>
          {acceptError}
        </InlineFeedback>
      )}

      {acceptAllSummary && acceptAllSummary.remaining > 0 && (
        <InlineFeedback tone="warning" density="compact" sx={{ mb: 2 }}>
          {acceptAllSummary.created > 0 && `${acceptAllSummary.created} added. `}
          {acceptAllSummary.duplicates > 0 && `${acceptAllSummary.duplicates} already existed. `}
          {acceptAllSummary.remaining} remaining — retry when ready.
        </InlineFeedback>
      )}

      <Grid container spacing={2}>
        {drafts.map((suggestion) => (
          <Grid size={{ xs: 12, md: 6 }} key={suggestion.label}>
            <SuggestionCard
              suggestion={suggestion}
              accepting={acceptingLabel === suggestion.label}
              onAccept={() => handleAcceptOne(suggestion)}
              onDiscard={() => handleDiscard(suggestion)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SuggestionReviewPanel;
