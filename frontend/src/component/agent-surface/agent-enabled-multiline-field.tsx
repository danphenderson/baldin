import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Collapse,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import { UNSAFE_LocationContext as RouterLocationContext } from 'react-router-dom';

import { UserContext } from '../../context/user-context';
import {
  applyAgentSurfaceRun,
  createAgentSurfaceRun,
  dismissAgentSurfaceRun,
  getFilteredAgentRuns,
  type AgentRunApplyMode,
  type AgentRunRead,
  type AgentRunSummaryRead,
  type AgentSurfaceEntityRef,
} from '../../service/agents';
import AgentTaskComposer, {
  type AgentTaskComposerPendingAction,
  type AgentTaskComposerSubmitPayload,
} from './agent-task-composer';
import {
  buildAgentSurfaceRunRequest,
  createAgentTaskComposerDraft,
} from './helpers';
import type {
  AgentEditableSurface,
  AgentSurfaceRunRecord,
  AgentTaskComposerDraft,
} from './types';

type MultilineInputElement = HTMLTextAreaElement | HTMLInputElement;

export interface AgentEnabledMultilineFieldProps
  extends Omit<TextFieldProps, 'onChange' | 'value'> {
  value: string;
  onChange: (nextValue: string) => void;
  surfaceId: string;
  fieldKey: string;
  entityRefs?: AgentSurfaceEntityRef[];
  sourceRoute?: string;
  applicationId?: string | null;
  multiline?: boolean;
}

type SelectionRange = {
  start: number | null;
  end: number | null;
  text: string | null;
};

type TokenBounds = {
  start: number;
  end: number;
};

function readSelection(element: MultilineInputElement | null, value: string): SelectionRange {
  if (!element) {
    return { start: null, end: null, text: null };
  }

  const start = typeof element.selectionStart === 'number' ? element.selectionStart : null;
  const end = typeof element.selectionEnd === 'number' ? element.selectionEnd : null;

  if (start === null || end === null || start === end) {
    return { start, end, text: null };
  }

  return {
    start,
    end,
    text: value.slice(start, end),
  };
}

function replaceTokenAtIndex(
  value: string,
  tokenStart: number | null,
  currentToken: string | null,
  nextToken: string,
): string {
  const previousToken = currentToken ?? '@';

  if (
    tokenStart !== null
    && tokenStart >= 0
    && value.slice(tokenStart, tokenStart + previousToken.length) === previousToken
  ) {
    return `${value.slice(0, tokenStart)}${nextToken}${value.slice(tokenStart + previousToken.length)}`;
  }

  const fallbackIndex = value.lastIndexOf(previousToken);
  if (fallbackIndex >= 0) {
    return `${value.slice(0, fallbackIndex)}${nextToken}${value.slice(fallbackIndex + previousToken.length)}`;
  }

  return value;
}

function removeTokenAtIndex(
  value: string,
  tokenStart: number | null,
  currentToken: string | null,
): string {
  const previousToken = currentToken ?? '@';
  return replaceTokenAtIndex(value, tokenStart, previousToken, '').trimStart();
}

function findTokenBounds(
  value: string,
  tokenStart: number | null,
  currentToken: string | null,
): TokenBounds | null {
  const token = currentToken ?? '@';
  if (!token) {
    return null;
  }

  if (
    tokenStart !== null
    && tokenStart >= 0
    && value.slice(tokenStart, tokenStart + token.length) === token
  ) {
    return {
      start: tokenStart,
      end: tokenStart + token.length,
    };
  }

  const fallbackIndex = value.lastIndexOf(token);
  if (fallbackIndex < 0) {
    return null;
  }

  return {
    start: fallbackIndex,
    end: fallbackIndex + token.length,
  };
}

function applyPlainTextSuggestion(
  currentValue: string,
  suggestion: string,
  operation: AgentRunApplyMode,
  selection: SelectionRange,
  tokenStart: number | null,
  tokenText: string | null,
): string {
  const tokenBounds = findTokenBounds(currentValue, tokenStart, tokenText);

  if (operation === 'replace_selection' && selection.start !== null && selection.end !== null) {
    if (tokenBounds) {
      return `${currentValue.slice(0, tokenBounds.start)}${suggestion}${currentValue.slice(tokenBounds.end)}`;
    }

    return `${currentValue.slice(0, selection.start)}${suggestion}${currentValue.slice(selection.end)}`;
  }

  const sanitizedBase = tokenBounds
    ? `${currentValue.slice(0, tokenBounds.start)}${currentValue.slice(tokenBounds.end)}`
    : removeTokenAtIndex(currentValue, tokenStart, tokenText);

  if (!sanitizedBase.trim()) {
    return suggestion;
  }

  const separator = sanitizedBase.endsWith('\n') ? '\n' : '\n\n';
  return `${sanitizedBase}${separator}${suggestion}`;
}

const AgentEnabledMultilineField: React.FC<AgentEnabledMultilineFieldProps> = ({
  value,
  onChange,
  surfaceId,
  fieldKey,
  entityRefs = [],
  sourceRoute,
  applicationId = null,
  onKeyDown,
  disabled = false,
  ...textFieldProps
}) => {
  const locationContext = useContext(RouterLocationContext);
  const { token } = useContext(UserContext);
  const inputRef = useRef<MultilineInputElement | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<AgentTaskComposerDraft>(createAgentTaskComposerDraft());
  const [run, setRun] = useState<AgentSurfaceRunRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<AgentTaskComposerPendingAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectionIntent, setSelectionIntent] = useState<SelectionRange>({ start: null, end: null, text: null });
  const [selectionAtRun, setSelectionAtRun] = useState<SelectionRange>({ start: null, end: null, text: null });
  const [tokenStart, setTokenStart] = useState<number | null>(null);
  const [tokenText, setTokenText] = useState<string | null>(null);

  const resolvedRoute = sourceRoute
    ?? locationContext?.location.pathname
    ?? (typeof window !== 'undefined' ? window.location.pathname : '/');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await getFilteredAgentRuns(token, {
          source_field_key: fieldKey,
          source_route: resolvedRoute,
          source_anchor_id: surfaceId,
          page: 1,
          page_size: 1,
        });
        if (cancelled) return;
        setRun(response.items[0] ?? null);
      } catch {
        if (!cancelled) {
          setRun(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fieldKey, resolvedRoute, surfaceId, token]);

  const surface = useMemo<AgentEditableSurface>(() => ({
    surfaceKind: 'multiline_text_field',
    surfaceId,
    fieldKey,
    sourceRoute: resolvedRoute,
    entityRefs,
    getSnapshot: () => {
      const liveSelection = readSelection(inputRef.current, value);
      const selection = selectionIntent.text ? selectionIntent : liveSelection;
      return {
        anchorId: surfaceId,
        contentFormat: 'plain_text',
        surfaceContent: value,
        selection,
        applicationId,
        requestedApplyMode: selection.text ? 'replace_selection' : 'append_to_surface',
      };
    },
    applySuggestion: (currentRun) => {
      const suggestion = currentRun.suggested_edit;
      if (!suggestion?.content) return;

      const nextValue = applyPlainTextSuggestion(
        value,
        suggestion.content,
        suggestion.operation,
        selectionAtRun,
        tokenStart,
        tokenText,
      );
      onChange(nextValue);
    },
  }), [applicationId, entityRefs, fieldKey, onChange, resolvedRoute, selectionAtRun, selectionIntent, surfaceId, tokenStart, tokenText, value]);

  const handleFieldKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }

    if (event.key === '@') {
      const target = event.target as MultilineInputElement | null;
      const pendingSelection = readSelection(target, value);
      const start = typeof target?.selectionStart === 'number'
        ? target.selectionStart
        : value.length;
      setComposerOpen(true);
      setSelectionIntent(pendingSelection);
      setTokenStart(start);
      setTokenText('@');
      setErrorMessage(null);
    }
  }, [disabled, onKeyDown, value.length]);

  const handleRun = useCallback(async ({ agent, draft: nextDraft }: AgentTaskComposerSubmitPayload) => {
    if (!token) {
      setErrorMessage('Sign in to run agent tasks.');
      return;
    }

    setPendingAction('run');
    setErrorMessage(null);

    try {
      const nextTokenText = `@${agent.name}`;
      const nextValueWithToken = replaceTokenAtIndex(value, tokenStart, tokenText, nextTokenText);
      if (nextValueWithToken !== value) {
        onChange(nextValueWithToken);
      }
      setTokenText(nextTokenText);
      setDraft(nextDraft);

      const snapshot = await surface.getSnapshot();
      setSelectionAtRun({
        start: snapshot.selection?.start ?? null,
        end: snapshot.selection?.end ?? null,
        text: snapshot.selection?.text ?? null,
      });

      const createdRun = await createAgentSurfaceRun(
        token,
        agent.id,
        buildAgentSurfaceRunRequest(surface, {
          ...snapshot,
          surfaceContent: nextValueWithToken,
        }, nextDraft),
      );
      setRun(createdRun);
      setComposerOpen(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Agent task failed.');
    } finally {
      setPendingAction(null);
    }
  }, [onChange, surface, token, tokenStart, tokenText, value]);

  const handleApply = useCallback(async (currentRun: AgentSurfaceRunRecord) => {
    if (!token) {
      setErrorMessage('Sign in to apply agent tasks.');
      return;
    }

    setPendingAction('apply');
    setErrorMessage(null);

    try {
      surface.applySuggestion(currentRun);
      const appliedRun = await applyAgentSurfaceRun(token, currentRun.id, {});
      setRun(appliedRun);
      setComposerOpen(false);
      setSelectionIntent({ start: null, end: null, text: null });
      setSelectionAtRun({ start: null, end: null, text: null });
      setTokenText(null);
      setTokenStart(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to apply suggestion.');
    } finally {
      setPendingAction(null);
    }
  }, [surface, token]);

  const handleDismiss = useCallback(async (currentRun: AgentSurfaceRunRecord) => {
    if (!token) {
      setErrorMessage('Sign in to dismiss agent tasks.');
      return;
    }

    setPendingAction('dismiss');
    setErrorMessage(null);

    try {
      const dismissedRun = await dismissAgentSurfaceRun(token, currentRun.id);
      setRun(dismissedRun);
      onChange(removeTokenAtIndex(value, tokenStart, tokenText));
      setComposerOpen(false);
      setSelectionIntent({ start: null, end: null, text: null });
      setSelectionAtRun({ start: null, end: null, text: null });
      setTokenText(null);
      setTokenStart(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to dismiss suggestion.');
    } finally {
      setPendingAction(null);
    }
  }, [onChange, token, tokenStart, tokenText, value]);

  return (
    <Box>
      <TextField
        {...textFieldProps}
        multiline
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleFieldKeyDown}
        disabled={disabled}
        inputRef={(instance) => {
          inputRef.current = instance;
        }}
      />
      <Collapse in={composerOpen || Boolean(run && run.apply_status === 'pending')} sx={{ mt: 1.5 }}>
        <AgentTaskComposer
          draft={draft}
          onDraftChange={setDraft}
          onRun={handleRun}
          onApply={handleApply}
          onDismiss={handleDismiss}
          run={run}
          pendingAction={pendingAction}
          errorMessage={errorMessage}
        />
      </Collapse>
    </Box>
  );
};

export default AgentEnabledMultilineField;
