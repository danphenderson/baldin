import type {
  AgentRunApplyMode,
  AgentRunRead,
  AgentRunSourceSurfaceKind,
  AgentRunSummaryRead,
  AgentSurfaceEntityRef,
  AgentSurfaceRunRequest,
} from '../../service/agents';
import type { DocumentContentFormat } from '../../service/documents';

export type AgentSurfaceRunRecord = AgentRunRead | AgentRunSummaryRead;

export interface AgentTaskComposerDraft {
  agentId: string | null;
  promptText: string;
}

export interface AgentEditableSurfaceSelection {
  text?: string | null;
  start?: number | null;
  end?: number | null;
}

export interface AgentEditableSurfaceSnapshot {
  sourceDocumentId?: string | null;
  anchorId?: string | null;
  contentFormat: DocumentContentFormat;
  surfaceContent: string;
  selection?: AgentEditableSurfaceSelection | null;
  applicationId?: string | null;
  requestedApplyMode: AgentRunApplyMode;
}

export interface AgentSurfaceApplyResult {
  sessionDocumentId?: string | null;
  sessionVersionId?: string | null;
}

export interface AgentEditableSurface {
  surfaceKind: AgentRunSourceSurfaceKind;
  surfaceId: string;
  fieldKey?: string | null;
  sourceRoute: string;
  entityRefs: AgentSurfaceEntityRef[];
  getSnapshot: () => AgentEditableSurfaceSnapshot | Promise<AgentEditableSurfaceSnapshot>;
  applySuggestion: (
    run: AgentSurfaceRunRecord,
  ) => void | AgentSurfaceApplyResult | Promise<void | AgentSurfaceApplyResult>;
  persistAppliedSuggestion?: (
    run: AgentSurfaceRunRecord,
  ) => void | AgentSurfaceApplyResult | Promise<void | AgentSurfaceApplyResult>;
}

export type AgentTaskSurfaceRunRequest = AgentSurfaceRunRequest;
