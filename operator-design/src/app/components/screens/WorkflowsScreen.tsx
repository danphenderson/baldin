import type { ReactNode } from "react";
import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenField,
  ScreenMetric,
  ScreenPanel,
  ScreenSearch,
  ScreenTag,
} from "./flagship-primitives";

export const WORKFLOWS_SCREEN_STATE_IDS = [
  "populated",
  "no_workflows",
  "filtered_run_quiet",
  "raw_service_warning",
  "mutation",
] as const;

export type WorkflowsScreenState = (typeof WORKFLOWS_SCREEN_STATE_IDS)[number];

export const WORKFLOWS_SCREEN_MUTATION_FOCUS_IDS = [
  "trigger",
  "edit",
  "delete",
] as const;

export type WorkflowsScreenMutationFocus = (typeof WORKFLOWS_SCREEN_MUTATION_FOCUS_IDS)[number];

type Tone = "accent" | "success" | "warning" | "error" | "info" | "skill" | "neutral";
type WorkflowStatus = "success" | "failure" | "running" | "pending" | "pending_review";

type WorkflowRecord = {
  id: string;
  name: string;
  description: string;
  source: string;
  destination: string;
  lastStatus: WorkflowStatus;
  lastRun: string;
  runCount: number;
  failureCount: number;
  definition: string;
  rawWarning?: boolean;
};

type RunHistoryRecord = {
  id: string;
  workflowId: string;
  message: string;
  createdAt: string;
  status: WorkflowStatus;
  note: string;
  retry?: boolean;
};

const WORKFLOWS: WorkflowRecord[] = [
  {
    id: "wf-intake",
    name: "Lead Intake Normalizer",
    description: "Turns workspace capture into ranked lead records and queues the next review pass.",
    source: "workspace://imports/linkedin-jobs",
    destination: "workspace://leads/normalized",
    lastStatus: "success",
    lastRun: "28m ago",
    runCount: 36,
    failureCount: 1,
    definition: `{
  "source_uri": "workspace://imports/linkedin-jobs",
  "destination_uri": "workspace://leads/normalized",
  "steps": ["extract", "dedupe", "rank"],
  "review_gate": true
}`,
  },
  {
    id: "wf-review",
    name: "Application Review Gate",
    description: "Routes extracted handoffs into review-required workspace items before they become active applications.",
    source: "service://extractors/application-brief",
    destination: "workspace://applications/review-queue",
    lastStatus: "pending_review",
    lastRun: "2h ago",
    runCount: 14,
    failureCount: 0,
    definition: `{
  "source_uri": "service://extractors/application-brief",
  "destination_uri": "workspace://applications/review-queue",
  "requires_human_review": true,
  "event_status": "pending_review"
}`,
  },
  {
    id: "wf-sync",
    name: "Profile Snapshot Sync",
    description: "Keeps profile drafts, saved aspirations, and downstream workflow context in sync.",
    source: "workspace://profile/drafts",
    destination: "db://profile/state",
    lastStatus: "running",
    lastRun: "just now",
    runCount: 8,
    failureCount: 1,
    definition: `{
  "source_uri": "workspace://profile/drafts",
  "destination_uri": "db://profile/state",
  "steps": ["merge", "snapshot", "publish_context"]
}`,
  },
  {
    id: "wf-raw",
    name: "Raw Service Relay",
    description: "Captures a low-level service response for inspection before the route promotes it into the workspace.",
    source: "raw://extractor-service",
    destination: "workspace://ingest/staging",
    lastStatus: "failure",
    lastRun: "7h ago",
    runCount: 13,
    failureCount: 4,
    rawWarning: true,
    definition: `{
  "source_uri": "raw://extractor-service",
  "destination_uri": "workspace://ingest/staging",
  "pass_through": true,
  "note": "Keep raw-service output visible until the contract stabilizes."
}`,
  },
];

const RUN_HISTORY: RunHistoryRecord[] = [
  {
    id: "evt-914",
    workflowId: "wf-review",
    message: "Review extracted application brief for pending handoff",
    createdAt: "11m ago",
    status: "pending_review",
    note: "Awaiting operator confirmation before the record can enter the active queue.",
  },
  {
    id: "evt-911",
    workflowId: "wf-sync",
    message: "Publish refreshed profile snapshot to downstream consumers",
    createdAt: "24m ago",
    status: "running",
    note: "The sync is still applying profile and aspiration changes to dependent screens.",
  },
  {
    id: "evt-903",
    workflowId: "wf-intake",
    message: "Normalize new lead capture batch",
    createdAt: "28m ago",
    status: "success",
    note: "Twenty-two new leads reached the normalized queue without manual repair.",
  },
  {
    id: "evt-876",
    workflowId: "wf-raw",
    message: "Retry relay after raw-service payload drift",
    createdAt: "7h ago",
    status: "failure",
    note: "The raw response shape changed and the destination mapper rejected the event.",
    retry: true,
  },
];

function resolveTone(tone: Tone, T: ReturnType<typeof useTheme>["T"]) {
  switch (tone) {
    case "accent":
      return { color: T.accent, dim: T.accentDim, border: T.aStroke };
    case "success":
      return { color: T.success, dim: T.succDim, border: `${T.success}44` };
    case "warning":
      return { color: T.warning, dim: T.warnDim, border: `${T.warning}44` };
    case "error":
      return { color: T.error, dim: T.errDim, border: `${T.error}44` };
    case "info":
      return { color: T.info, dim: T.infoDim, border: `${T.info}44` };
    case "skill":
      return { color: T.skill, dim: T.skillDim, border: `${T.skill}44` };
    default:
      return { color: T.t1, dim: T.s0, border: T.s1 };
  }
}

function getStatusMeta(status: WorkflowStatus): { label: string; tone: Tone } {
  switch (status) {
    case "success":
      return { label: "Success", tone: "success" };
    case "failure":
      return { label: "Failed", tone: "error" };
    case "running":
      return { label: "Running", tone: "info" };
    case "pending_review":
      return { label: "Pending Review", tone: "warning" };
    default:
      return { label: "Pending", tone: "neutral" };
  }
}

function FilterChip({
  label,
  active = false,
  tone = "neutral",
}: {
  label: string;
  active?: boolean;
  tone?: Tone;
}) {
  const { T } = useTheme();
  const palette = resolveTone(active ? tone : "neutral", T);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: T.rFull,
        border: `1px solid ${active ? palette.border : T.s1}`,
        background: active ? palette.dim : T.base,
      }}
    >
      {active && <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: palette.color }} />}
      <span style={{ fontFamily: T.fontMono, fontSize: 10.5, fontWeight: 600, color: active ? palette.color : T.t1 }}>{label}</span>
    </div>
  );
}

function EmptySurface({
  title,
  body,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel?: string;
}) {
  const { T } = useTheme();

  return (
    <div style={{ padding: "30px 24px", border: `1px dashed ${T.s1}`, borderRadius: T.r3, background: T.base }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 14px", maxWidth: 520 }}>{body}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ScreenButton label={primaryLabel} />
        {secondaryLabel && <ScreenButton label={secondaryLabel} kind="secondary" />}
      </div>
    </div>
  );
}

function JsonBlock({
  label,
  value,
  helper,
  tone = "accent",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
}) {
  const { T } = useTheme();
  const palette = resolveTone(tone, T);

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      <div style={{ padding: "10px 12px", borderRadius: T.r2, background: T.base, border: `1px solid ${palette.border}` }}>
        <pre style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t0, margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{value}</pre>
      </div>
      {helper && <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: palette.color, margin: 0 }}>{helper}</p>}
    </div>
  );
}

function WorkflowCard({
  workflow,
  emphasized = false,
}: {
  workflow: WorkflowRecord;
  emphasized?: boolean;
}) {
  const { T } = useTheme();
  const status = getStatusMeta(workflow.lastStatus);
  const palette = resolveTone(workflow.rawWarning ? "warning" : status.tone, T);

  return (
    <div
      style={{
        background: T.base,
        border: `1px solid ${emphasized || workflow.rawWarning ? palette.border : T.s1}`,
        borderRadius: T.r3,
        padding: "15px 16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{workflow.name}</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.55, margin: 0 }}>{workflow.description}</p>
        </div>
        <ScreenBadge label={status.label} tone={status.tone} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <ScreenTag label={workflow.source} tone="info" />
        <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>&rarr;</span>
        <ScreenTag label={workflow.destination} tone="skill" />
        {workflow.rawWarning && <ScreenTag label="raw-service response" tone="warning" />}
      </div>

      <div style={{ padding: "10px 12px", background: workflow.rawWarning ? palette.dim : T.raised, border: `1px solid ${workflow.rawWarning ? palette.border : T.s0}`, borderRadius: T.r2, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Last run</span>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: workflow.rawWarning ? palette.color : T.t1 }}>{workflow.lastRun}</span>
        </div>
        <p style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t0, margin: "0 0 3px" }}>
          {workflow.runCount} run{workflow.runCount === 1 ? "" : "s"} / {workflow.failureCount} failure{workflow.failureCount === 1 ? "" : "s"}
        </p>
        <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: 0 }}>
          {workflow.lastStatus === "pending_review"
            ? "The latest event is waiting on operator confirmation before promotion."
            : workflow.rawWarning
              ? "Inspect the raw payload before you retry or edit the definition."
              : "Run counts and failure totals stay visible on the card without opening the detail dialog."}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ScreenButton label="View detail" kind="secondary" compact />
        <ScreenButton label="Trigger" compact />
        <ScreenButton label="Edit" kind="ghost" compact />
        <ScreenButton label="Delete" kind="ghost" tone="error" compact />
      </div>
    </div>
  );
}

function StatusOption({
  label,
  tone,
  active = false,
}: {
  label: string;
  tone: Tone;
  active?: boolean;
}) {
  const { T } = useTheme();
  const palette = resolveTone(active ? tone : "neutral", T);

  return (
    <div
      style={{
        padding: "4px 8px",
        borderRadius: T.rFull,
        border: `1px solid ${active ? palette.border : T.s1}`,
        background: active ? palette.dim : "transparent",
      }}
    >
      <span style={{ fontFamily: T.fontMono, fontSize: 10, fontWeight: 600, color: active ? palette.color : T.t2 }}>{label}</span>
    </div>
  );
}

function RunHistoryRow({ item }: { item: RunHistoryRecord }) {
  const { T } = useTheme();
  const status = getStatusMeta(item.status);
  const workflow = WORKFLOWS.find((candidate) => candidate.id === item.workflowId);
  const palette = resolveTone(status.tone, T);

  return (
    <div style={{ background: T.base, border: `1px solid ${palette.border}`, borderRadius: T.r2, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15.5, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{item.message}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1 }}>{workflow?.name || "Workflow"}</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{item.createdAt}</span>
          </div>
        </div>
        <ScreenBadge label={status.label} tone={status.tone} />
      </div>

      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 10px" }}>{item.note}</p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Inline status change</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <StatusOption label="Pending" tone="neutral" active={item.status === "pending"} />
            <StatusOption label="Running" tone="info" active={item.status === "running"} />
            <StatusOption label="Success" tone="success" active={item.status === "success"} />
            <StatusOption label="Failed" tone="error" active={item.status === "failure"} />
            <StatusOption label="Pending Review" tone="warning" active={item.status === "pending_review"} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {item.retry && <ScreenButton label="Retry" compact tone="warning" />}
          <ScreenButton label="Open event" kind="secondary" compact />
        </div>
      </div>
    </div>
  );
}

function WorkflowDetailDialog({
  workflow,
  subtitle,
  footer,
}: {
  workflow: WorkflowRecord;
  subtitle: string;
  footer?: ReactNode;
}) {
  const status = getStatusMeta(workflow.lastStatus);

  return (
    <ScreenDialog
      title="Workflow detail"
      subtitle={subtitle}
      footer={footer}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <ScreenField label="Name" value={workflow.name} />
        <ScreenField label="Source" value={workflow.source} />
        <ScreenField label="Dest" value={workflow.destination} />
        <JsonBlock label="Definition (JSON)" value={workflow.definition} tone={workflow.rawWarning ? "warning" : "accent"} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ScreenField label={`RUNS (${workflow.runCount})`} value={`${workflow.runCount} total / ${workflow.failureCount} failed`} />
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontFamily: "inherit" }} />
            <div style={{ minHeight: 36, padding: "0 12px", borderRadius: 12, background: "transparent", display: "flex", alignItems: "center" }}>
              <ScreenBadge label={`Last status: ${status.label}`} tone={status.tone} />
            </div>
          </div>
        </div>
      </div>
    </ScreenDialog>
  );
}

function TriggerWorkflowDialog() {
  return (
    <ScreenDialog
      title="Trigger Run"
      subtitle="Run creation keeps workflow selection, message context, and payload validation in one place."
      footer={(
        <>
          <ScreenButton label="Cancel" kind="ghost" />
          <ScreenButton label="Trigger" tone="warning" />
        </>
      )}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <ScreenCallout
          title="Select a workflow to trigger"
          body="The trigger dialog blocks submission until a named workflow is selected and the payload parses cleanly."
          tone="warning"
        />
        <ScreenField label="Workflow" value="No workflow selected" />
        <ScreenField label="Message" value="Retry the stalled relay after reviewing the raw payload." />
        <JsonBlock
          label="Payload (JSON)"
          value={`{
  "document_id": 412,
  "dry_run":
}`}
          helper="Invalid JSON"
          tone="warning"
        />
        <ScreenCallout
          title="Payload must be valid JSON"
          body="Keep the request body human-readable, but do not allow a malformed payload to trigger an execution event."
          tone="error"
        />
      </div>
    </ScreenDialog>
  );
}

function EditWorkflowDialog({ workflow }: { workflow: WorkflowRecord }) {
  return (
    <ScreenDialog
      title="Edit Workflow"
      subtitle="Definition changes stay explicit so the operator can compare the new JSON with the previous run behavior."
      footer={(
        <>
          <ScreenButton label="Cancel" kind="ghost" />
          <ScreenButton label="Save Changes" tone="warning" />
        </>
      )}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <ScreenField label="Name" value={workflow.name} />
        <ScreenField label="Description" value={workflow.description} multiline />
        <JsonBlock
          label="Definition (JSON)"
          value={`{
  "source_uri": "raw://extractor-service",
  "destination_uri": "workspace://ingest/staging",
  "pass_through": true,
  "review_gate":
}`}
          helper="Invalid JSON"
          tone="warning"
        />
        <ScreenCallout
          title="Definition must be valid JSON"
          body="Invalid JSON is called out inline and the save action stays disabled until the definition parses cleanly."
          tone="error"
        />
      </div>
    </ScreenDialog>
  );
}

function DeleteWorkflowDialog({ workflow }: { workflow: WorkflowRecord }) {
  return (
    <ScreenDialog
      title="Delete workflow"
      subtitle="Destructive actions keep the workflow name visible and the consequence copy specific."
      footer={(
        <>
          <ScreenButton label="Cancel" kind="ghost" />
          <ScreenButton label={`Delete ${workflow.name}`} kind="secondary" tone="error" />
        </>
      )}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--op-s1)", background: "var(--op-s0)" }}>
          <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: 16, color: "inherit", margin: "0 0 4px", letterSpacing: "-0.01em" }}>{workflow.name}</p>
          <p style={{ fontFamily: "Source Sans 3, sans-serif", fontSize: 12.5, color: "inherit", lineHeight: 1.6, margin: 0 }}>
            Deleting removes the workflow definition from the orchestration list and cuts off the route-level trigger, edit, and retry entry points.
          </p>
        </div>
        <ScreenCallout
          title="Delete confirmation copy"
          body="Use the entity name in the button label and keep the consequence list concrete so the operator never confirms a generic destructive action."
          tone="error"
        />
      </div>
    </ScreenDialog>
  );
}

function WorkflowsDesktopContent({
  state,
  mutationFocus,
}: {
  state: WorkflowsScreenState;
  mutationFocus: WorkflowsScreenMutationFocus;
}) {
  const { T } = useTheme();
  const noWorkflows = state === "no_workflows";
  const filteredQuiet = state === "filtered_run_quiet";
  const rawWarning = state === "raw_service_warning";
  const mutation = state === "mutation";
  const workflows = noWorkflows || filteredQuiet ? (filteredQuiet ? [] : []) : WORKFLOWS;
  const runHistory = noWorkflows || filteredQuiet ? [] : RUN_HISTORY;
  const detailWorkflow = rawWarning ? WORKFLOWS[3] : WORKFLOWS[1];

  const metrics = noWorkflows
    ? [
        { label: "Workflows", value: "0", tone: "neutral" as Tone, note: "No orchestration definitions saved" },
        { label: "Total runs", value: "0", tone: "neutral" as Tone, note: "No run history yet" },
        { label: "Failures", value: "0", tone: "neutral" as Tone, note: "No failed events" },
        { label: "Recent (24h)", value: "0", tone: "neutral" as Tone, note: "Nothing executed today" },
        { label: "Last success", value: "—", tone: "neutral" as Tone, note: "No successful run recorded" },
      ]
    : [
        { label: "Workflows", value: "4", tone: "accent" as Tone, note: "Active orchestration definitions" },
        { label: "Total runs", value: "71", tone: "info" as Tone, note: "Across workflow execution history" },
        { label: "Failures", value: rawWarning ? "4" : "2", tone: rawWarning ? ("warning" as Tone) : ("success" as Tone), note: rawWarning ? "Raw relay needs repair" : "Contained failure count" },
        { label: "Recent (24h)", value: "3", tone: "info" as Tone, note: "Fresh execution activity" },
        { label: "Last success", value: "28m ago", tone: "success" as Tone, note: "Most recent green run" },
      ];

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>AUTOMATION / WORKFLOWS</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Workflow orchestration</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 720 }}>
              This specimen extends the operator-design bundle from workspace evidence into controlled execution. Metrics, cards, run history, and review gates all stay grounded in the shipped `/workflows` route.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge
              label={
                noWorkflows
                  ? "No workflows yet"
                  : filteredQuiet
                    ? "Filtered quiet"
                    : rawWarning
                      ? "Raw-service warning"
                      : mutation
                        ? "Mutation open"
                        : "Execution live"
              }
              tone={noWorkflows ? "warning" : filteredQuiet ? "info" : rawWarning ? "warning" : mutation ? "warning" : "accent"}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Trigger Run" />
              <ScreenButton label="New Workflow" kind="secondary" />
            </div>
          </div>
        </div>

        {noWorkflows ? (
          <ScreenCallout
            title="No workflows yet"
            body="The true zero-data route is distinct from a filtered quiet state. Keep the copy direct and route the operator toward creating the first controlled execution path."
            tone="warning"
            action={<ScreenButton label="Create workflow" kind="secondary" compact />}
          />
        ) : filteredQuiet ? (
          <ScreenCallout
            title="No matching workflows and no matching runs"
            body="The current search and status filters removed every visible card and run row. Keep the empty copy explicit so operators do not confuse a quiet filter state with a missing service."
            tone="info"
            action={<ScreenButton label="Clear filters" kind="secondary" compact />}
          />
        ) : rawWarning ? (
          <ScreenCallout
            title="Raw-service warning"
            body="A relay returned raw-service output instead of a fully shaped event. Keep the banner loud, preserve the definition dialog, and avoid masking the failure behind generic success chrome."
            tone="warning"
            action={<ScreenButton label="Inspect raw relay" kind="secondary" compact />}
          />
        ) : mutation ? (
          <ScreenCallout
            title="Trigger, edit, and delete stay inside deliberate dialogs"
            body="Execution mutations keep JSON validation, review language, and destructive confirmation visible without collapsing the main workflow context."
            tone="info"
          />
        ) : (
          <ScreenCallout
            title="Pending Review remains a first-class execution state"
            body="The workflow card, detail dialog, and run history all preserve review-required status rather than flattening everything into generic pending or success labels."
            tone="info"
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {metrics.map((metric) => (
            <ScreenMetric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} note={metric.note} />
          ))}
        </div>

        {!noWorkflows && (
          <ScreenPanel
            kicker="Collection controls"
            title="Workflow search, run status, and execution scope"
            aside={<ScreenBadge label={filteredQuiet ? "No visible results" : rawWarning ? "Failure filter active" : "Last refreshed 2m ago"} tone={filteredQuiet ? "warning" : rawWarning ? "warning" : "info"} />}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <ScreenSearch label={filteredQuiet ? "Search workflows: service relay" : "Search workflows"} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <FilterChip label="All statuses" active={!filteredQuiet && !rawWarning} tone="accent" />
                  <FilterChip label="Pending Review" active={!filteredQuiet && !rawWarning} tone="warning" />
                  <FilterChip label="Failure" active={rawWarning || filteredQuiet} tone="warning" />
                  <FilterChip label="Recent (24h)" active={!filteredQuiet} tone="info" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterChip label="All workflows" active={!filteredQuiet} tone="accent" />
                <FilterChip label="Application Review Gate" active={rawWarning ? false : !filteredQuiet} tone="info" />
                <FilterChip label="Raw Service Relay" active={rawWarning || filteredQuiet} tone="warning" />
                <FilterChip label="Workflow cards" active={!filteredQuiet} tone="success" />
                <FilterChip label="Run history" active={!noWorkflows} tone="info" />
              </div>
            </div>
          </ScreenPanel>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(360px, 0.95fr)", gap: 16, alignItems: "start" }}>
          <ScreenPanel
            kicker="Workflow cards"
            title={noWorkflows ? "No workflows yet" : filteredQuiet ? "No matching workflows" : "Workflow cards"}
            aside={!noWorkflows && !filteredQuiet ? <ScreenBadge label="Source and destination visible" tone="neutral" /> : undefined}
          >
            {noWorkflows ? (
              <EmptySurface
                title="No workflows yet"
                body="Create your first workflow to turn intake, extraction, or review work into a controlled execution path."
                primaryLabel="New Workflow"
                secondaryLabel="Refresh workflows"
              />
            ) : filteredQuiet ? (
              <EmptySurface
                title="No matching workflows"
                body="Adjust the search term or clear the active workflow filter to bring cards back into view."
                primaryLabel="Clear search"
                secondaryLabel="Reset filters"
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {WORKFLOWS.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} emphasized={rawWarning && workflow.rawWarning} />
                ))}
              </div>
            )}
          </ScreenPanel>

          <ScreenPanel
            kicker="Run history"
            title={noWorkflows ? "No runs yet" : filteredQuiet ? "No matching runs" : "Execution history"}
            aside={!noWorkflows && !filteredQuiet ? <ScreenBadge label="Retry and status controls inline" tone="neutral" /> : undefined}
          >
            {noWorkflows ? (
              <EmptySurface
                title="No runs yet"
                body="Runs will appear here once a workflow is triggered. Keep the first-run empty state separate from filter-driven quiet."
                primaryLabel="Trigger Run"
              />
            ) : filteredQuiet ? (
              <EmptySurface
                title="No matching runs"
                body="The current workflow and status filters removed every run row. Widen the scope to see execution history again."
                primaryLabel="Clear filters"
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {runHistory.map((item) => (
                  <RunHistoryRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </ScreenPanel>
        </div>

        {!noWorkflows && !filteredQuiet && !mutation && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <WorkflowDetailDialog
              workflow={detailWorkflow}
              subtitle={rawWarning
                ? "The detail dialog keeps raw source and destination context visible when a service response fails to promote cleanly."
                : "The detail dialog exposes Source, Dest, Definition, RUNS, and Last status without leaving the workflow route."}
              footer={(
                <>
                  <ScreenButton label="Close" kind="ghost" />
                  <ScreenButton label="Edit Workflow" kind="secondary" />
                  <ScreenButton label="Trigger Run" />
                </>
              )}
            />
          </div>
        )}
      </div>

      {mutation && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.52)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {mutationFocus === "trigger" ? (
            <TriggerWorkflowDialog />
          ) : mutationFocus === "edit" ? (
            <EditWorkflowDialog workflow={WORKFLOWS[3]} />
          ) : (
            <DeleteWorkflowDialog workflow={WORKFLOWS[3]} />
          )}
        </div>
      )}
    </div>
  );
}

export function WorkflowsScreen({
  state = "populated",
  mutationFocus = "trigger",
}: {
  state?: WorkflowsScreenState;
  mutationFocus?: WorkflowsScreenMutationFocus;
}) {
  return <WorkflowsDesktopContent state={state} mutationFocus={mutationFocus} />;
}
