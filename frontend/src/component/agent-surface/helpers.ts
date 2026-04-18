import type { AlertColor } from '@mui/material';
import type { AgentSurfaceRunRequest } from '../../service/agents';
import type {
  AgentEditableSurface,
  AgentEditableSurfaceSnapshot,
  AgentSurfaceRunRecord,
  AgentTaskComposerDraft,
} from './types';

export interface AgentSurfaceRunDisplayState {
  label: string;
  tone: AlertColor;
}

export function createAgentTaskComposerDraft(
  initial?: Partial<AgentTaskComposerDraft>,
): AgentTaskComposerDraft {
  return {
    agentId: initial?.agentId ?? null,
    promptText: initial?.promptText ?? '',
  };
}

export function canSubmitAgentTaskComposerDraft(draft: AgentTaskComposerDraft): boolean {
  return Boolean(draft.agentId && draft.promptText.trim());
}

export function canApplyAgentSurfaceRun(run: AgentSurfaceRunRecord): boolean {
  return run.status === 'completed'
    && run.apply_status === 'pending'
    && Boolean(run.suggested_edit?.content);
}

export function canDismissAgentSurfaceRun(run: AgentSurfaceRunRecord): boolean {
  return run.apply_status === 'pending' && run.status !== 'running' && run.status !== 'pending';
}

export function getAgentSurfaceRunDisplayState(run: AgentSurfaceRunRecord): AgentSurfaceRunDisplayState {
  if (run.status === 'failed') {
    return { label: 'Failed', tone: 'error' };
  }

  if (run.status === 'running' || run.status === 'pending') {
    return { label: 'Running', tone: 'info' };
  }

  if (run.apply_status === 'applied') {
    return { label: 'Applied', tone: 'success' };
  }

  if (run.apply_status === 'dismissed') {
    return { label: 'Dismissed', tone: 'warning' };
  }

  return { label: 'Preview ready', tone: 'success' };
}

export function buildAgentSurfaceRunRequest(
  surface: AgentEditableSurface,
  snapshot: AgentEditableSurfaceSnapshot,
  draft: AgentTaskComposerDraft,
): AgentSurfaceRunRequest {
  const sourceDocumentId = snapshot.sourceDocumentId
    ?? (surface.surfaceKind === 'multiline_text_field' ? undefined : surface.surfaceId);

  return {
    surface_kind: surface.surfaceKind,
    source_route: surface.sourceRoute,
    source_document_id: sourceDocumentId,
    source_field_key: surface.fieldKey ?? undefined,
    anchor_id: snapshot.anchorId ?? undefined,
    content_format: snapshot.contentFormat,
    surface_content: snapshot.surfaceContent,
    selection_text: snapshot.selection?.text ?? undefined,
    selection_start: snapshot.selection?.start ?? undefined,
    selection_end: snapshot.selection?.end ?? undefined,
    entity_refs: surface.entityRefs,
    application_id: snapshot.applicationId ?? undefined,
    prompt_text: draft.promptText.trim(),
    requested_apply_mode: snapshot.requestedApplyMode,
  };
}
