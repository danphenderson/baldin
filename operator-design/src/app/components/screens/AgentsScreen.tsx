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

export type AgentsScreenState =
  | "populated"
  | "first_agent_empty"
  | "search_empty"
  | "load_failure"
  | "mutation";

export type AgentsScreenMutationMode = "create" | "edit" | "delete" | "toggle";

type Tone = "accent" | "success" | "warning" | "error" | "info" | "skill" | "neutral";
type AgentKind = "cover_letter" | "follow_up" | "outreach" | "custom";

type AgentCardSpec = {
  id: string;
  name: string;
  kind: AgentKind;
  description: string;
  updated: string;
  enabled: boolean;
  runNote: string;
  chatNote: string;
  mutationLabel?: string;
};

const AGENTS: AgentCardSpec[] = [
  {
    id: "stripe-cover-letter",
    name: "Stripe Cover Letter Draft",
    kind: "cover_letter",
    description: "Builds a workspace draft from the attached application, pinned resume, and saved company notes without hiding where each instruction came from.",
    updated: "Updated 12m ago",
    enabled: true,
    runNote: "18 workspace runs",
    chatNote: "3 active chats",
  },
  {
    id: "interview-follow-up",
    name: "Interview Follow-Up",
    kind: "follow_up",
    description: "Prepares concise follow-up plans after calls and onsites while keeping send-ready copy separate from supporting evidence.",
    updated: "Updated 2h ago",
    enabled: true,
    runNote: "9 workspace runs",
    chatNote: "2 active chats",
  },
  {
    id: "warm-intro-outreach",
    name: "Warm Intro Outreach",
    kind: "outreach",
    description: "Turns private relationship notes into specific outreach drafts without carrying those notes into unrelated agent sessions.",
    updated: "Updated yesterday",
    enabled: false,
    runNote: "4 workspace runs",
    chatNote: "1 archived chat",
  },
  {
    id: "operator-notes-extractor",
    name: "Operator Notes Extractor",
    kind: "custom",
    description: "",
    updated: "Updated Apr 15",
    enabled: true,
    runNote: "6 workspace runs",
    chatNote: "No active chats",
  },
];

const KIND_META: Record<AgentKind, { label: string; tone: Tone }> = {
  cover_letter: { label: "Cover Letter Workspace", tone: "accent" },
  follow_up: { label: "Follow-Up Planner", tone: "info" },
  outreach: { label: "Outreach Tracker", tone: "info" },
  custom: { label: "Custom", tone: "neutral" },
};

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

function FilterChip({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  const { T } = useTheme();
  return (
    <div
      style={{
        padding: "5px 10px",
        borderRadius: T.rFull,
        background: active ? T.accentDim : T.base,
        border: `1px solid ${active ? T.aStroke : T.s1}`,
      }}
    >
      <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: active ? T.accent : T.t1 }}>{label}</span>
    </div>
  );
}

function EnabledSwitch({
  enabled,
  pendingLabel,
}: {
  enabled: boolean;
  pendingLabel?: string;
}) {
  const { T } = useTheme();
  const label = pendingLabel ?? (enabled ? "Enabled" : "Disabled");
  const accent = pendingLabel ? T.warning : enabled ? T.success : T.t2;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 34,
          height: 20,
          borderRadius: T.rFull,
          background: pendingLabel ? T.warnDim : enabled ? T.succDim : T.s0,
          border: `1px solid ${pendingLabel ? `${T.warning}44` : enabled ? `${T.success}44` : T.s1}`,
          padding: 2,
          display: "flex",
          justifyContent: enabled ? "flex-end" : "flex-start",
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: T.rFull, background: accent }} />
      </div>
      <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: accent }}>{label}</span>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentCardSpec }) {
  const { T } = useTheme();
  const kindMeta = KIND_META[agent.kind];
  const kindPalette = resolveTone(kindMeta.tone, T);

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: "16px 16px 14px",
        background: T.base,
        border: `1px solid ${agent.mutationLabel ? `${T.warning}44` : T.s1}`,
        borderRadius: T.r3,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            {agent.name}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenTag label={kindMeta.label} tone={kindMeta.tone} />
            {agent.mutationLabel && <ScreenTag label={agent.mutationLabel} tone="warning" />}
          </div>
        </div>
        <EnabledSwitch enabled={agent.enabled} pendingLabel={agent.mutationLabel} />
      </div>

      <p
        style={{
          fontFamily: T.fontBody,
          fontSize: 12.5,
          color: agent.description ? T.t1 : T.t2,
          lineHeight: 1.6,
          minHeight: 40,
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          fontStyle: agent.description ? "normal" : "italic",
        }}
      >
        {agent.description || "No description"}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ padding: "10px 11px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "0 0 4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Run mode</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: 0 }}>{agent.runNote}</p>
        </div>
        <div style={{ padding: "10px 11px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "0 0 4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Chat mode</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: 0 }}>{agent.chatNote}</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingTop: 10, borderTop: `1px solid ${T.s0}` }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: kindPalette.color }}>{agent.updated}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <ScreenButton label="Edit" kind="secondary" compact />
          <ScreenButton label="Delete" kind="ghost" compact tone="warning" />
        </div>
      </div>
    </div>
  );
}

function EmptyCollection({
  title,
  body,
  actionLabel,
}: {
  title: string;
  body: string;
  actionLabel: string;
}) {
  const { T } = useTheme();
  return (
    <div style={{ padding: "32px 28px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 21, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 560 }}>{body}</p>
      <ScreenButton label={actionLabel} />
    </div>
  );
}

function AgentsDesktopContent({
  state,
  mutationMode,
  mobile,
}: {
  state: AgentsScreenState;
  mutationMode: AgentsScreenMutationMode;
  mobile: boolean;
}) {
  const { T } = useTheme();
  const isFirstAgentEmpty = state === "first_agent_empty";
  const isSearchEmpty = state === "search_empty";
  const isLoadFailure = state === "load_failure";
  const isMutation = state === "mutation";

  const agents = isMutation && mutationMode === "toggle"
    ? AGENTS.map((agent, index) => index === 0 ? { ...agent, mutationLabel: agent.enabled ? "Disabling…" : "Enabling…" } : agent)
    : AGENTS;

  const totalAgents = isFirstAgentEmpty || isSearchEmpty || isLoadFailure ? 0 : agents.length;
  const enabledAgents = isFirstAgentEmpty || isSearchEmpty || isLoadFailure ? 0 : agents.filter((agent) => agent.enabled).length;

  return (
    <div style={{ position: "relative", height: mobile ? "auto" : "100%" }}>
      <div style={{ padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, minHeight: mobile ? 960 : "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>AUTOMATION / AGENT LIBRARY</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Agents</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 700 }}>
              Reusable automation agents stay task-first. They can create workspace artifacts or hold a cited chat thread, but the route keeps evidence, boundaries, and execution status visible instead of theatrical.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge
              label={
                isMutation
                  ? "Mutation state"
                  : isFirstAgentEmpty
                    ? "First agent empty"
                    : isSearchEmpty
                      ? "Search empty"
                      : isLoadFailure
                        ? "Load failure"
                        : "Populated collection"
              }
              tone={isMutation || isSearchEmpty || isLoadFailure ? "warning" : "accent"}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="New Agent" />
              <ScreenButton label="Open Workspace" kind="secondary" />
            </div>
          </div>
        </div>

        <ScreenCallout
          title={
            isLoadFailure
              ? "Unable to load agents"
              : isSearchEmpty
                ? "Filters can narrow the collection to zero"
                : isFirstAgentEmpty
                  ? "The first specimen should make both execution paths clear"
                  : isMutation
                    ? "Mutations stay explicit and local to the operator surface"
                    : "Execution modes stay visible before you open an agent"
          }
          body={
            isLoadFailure
              ? "Retry should be obvious and non-destructive. The surface should fail quietly without implying that agent definitions or past evidence were lost."
              : isSearchEmpty
                ? "Search and kind filters can empty the list, but the route should keep kind labels, create action, and private-workflow framing intact."
                : isFirstAgentEmpty
                  ? "Agents support both Run Agent workspaces and Chat with Agent conversations for job-search tasks like cover letters, follow-ups, and outreach."
                  : isMutation
                    ? "Create, edit, delete, and enable or disable actions should show progress without hiding the rest of the collection or pretending that automation is autonomous."
                    : "Cards surface name, kind, enabled state, description, and freshness so the operator can choose the right surface before execution starts."
          }
          tone={isLoadFailure || isSearchEmpty || isMutation ? "warning" : "info"}
          action={<ScreenButton label={isLoadFailure ? "Retry" : isSearchEmpty ? "Clear filters" : "Review evidence rules"} kind="secondary" compact />}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <ScreenSearch label={isSearchEmpty ? "Search agents for outreach follow-up" : "Search agents"} />
          <FilterChip label="All kinds" active={!isSearchEmpty} />
          <FilterChip label="Cover Letter" active={!isFirstAgentEmpty && !isSearchEmpty} />
          <FilterChip label="Follow-Up" active={isMutation && mutationMode === "edit"} />
          <FilterChip label="Outreach" active={isMutation && mutationMode === "toggle"} />
          <ScreenTag label="/automation/agents" tone="neutral" />
          <ScreenTag label="Private workflow" tone="skill" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <ScreenMetric
            label="Agents"
            value={isLoadFailure ? "?" : String(totalAgents)}
            tone={isLoadFailure ? "warning" : totalAgents > 0 ? "accent" : "neutral"}
            note="Task-first reusable definitions"
          />
          <ScreenMetric
            label="Enabled"
            value={isLoadFailure ? "?" : String(enabledAgents)}
            tone={enabledAgents > 0 ? "success" : "neutral"}
            note="Controls whether a definition is available to run"
          />
          <ScreenMetric
            label="Chat-ready"
            value={isLoadFailure ? "?" : isFirstAgentEmpty || isSearchEmpty ? "0" : "3"}
            tone={isLoadFailure ? "warning" : "info"}
            note="Persisted threads keep citations and source warnings visible"
          />
          <ScreenMetric
            label="Workspace mode"
            value={isFirstAgentEmpty ? "Ready" : isLoadFailure ? "Blocked" : "Live"}
            tone={isLoadFailure ? "warning" : "skill"}
            note="Run Agent outputs become workspace evidence, not ephemeral copy"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, alignItems: "start" }}>
          <ScreenPanel kicker="Collection" title="Agent cards" aside={!isLoadFailure ? <ScreenTag label={`${totalAgents} total`} tone="accent" /> : undefined}>
            {isLoadFailure ? (
              <EmptyCollection
                title="Unable to load agents"
                body="Retry should restore the collection without dropping the operator into a blank generic AI surface."
                actionLabel="Retry"
              />
            ) : isFirstAgentEmpty ? (
              <EmptyCollection
                title="Create your first agent"
                body="Agents support both Run Agent workspaces and Chat with Agent conversations for job-search tasks like cover letters, follow-ups, and outreach."
                actionLabel="New Agent"
              />
            ) : isSearchEmpty ? (
              <EmptyCollection
                title="No matching agents"
                body="Try a different search term or filter."
                actionLabel="Clear filters"
              />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </ScreenPanel>

          <div style={{ display: "grid", gap: 16 }}>
            <ScreenPanel kicker="Surface cues" title="What the list communicates">
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  "Kind labels stay task-first: Cover Letter Workspace, Follow-Up Planner, Outreach Tracker, or Custom.",
                  "Descriptions are optional. If one is missing, the card should say No description rather than inventing capability copy.",
                  "Enable or disable affects future execution only; it should not obscure prior runs, chats, or workspace evidence.",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.accent, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </ScreenPanel>

            <ScreenPanel kicker="Boundary" title="No generic agent theater">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                  <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Evidence remains legible</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                    Chat provenance belongs on the session route, and run evidence belongs in workspace history. The list just signals which surfaces each agent can open.
                  </p>
                </div>
                <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                  <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Private workflow first</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                    No public feed, no confidence meter, and no implied agent autonomy. This route is about controlled execution inside a private operator workspace.
                  </p>
                </div>
              </div>
            </ScreenPanel>
          </div>
        </div>
      </div>

      {isMutation && mutationMode !== "toggle" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title={mutationMode === "create" ? "Create agent" : mutationMode === "edit" ? "Edit agent" : "Delete agent"}
            subtitle={
              mutationMode === "create"
                ? "New agents should enter the collection with a clear task boundary and no implied public behavior."
                : mutationMode === "edit"
                  ? "Edits should preserve the current identity, enabled state, and task framing."
                  : "Deletion removes the reusable definition, not the workspace artifacts or private evidence it already produced."
            }
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton
                  label={mutationMode === "create" ? "Creating…" : mutationMode === "edit" ? "Saving…" : "Deleting…"}
                  tone={mutationMode === "delete" ? "warning" : "accent"}
                />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              {mutationMode === "delete" ? (
                <>
                  <ScreenField label="Agent" value="Warm Intro Outreach" />
                  <ScreenField
                    label="Delete impact"
                    value="Cards and future launches disappear, but existing run history, cited chats, and saved workspace documents remain part of the private record."
                    multiline
                  />
                </>
              ) : (
                <>
                  <ScreenField label="Name" value={mutationMode === "create" ? "Offer Debrief Planner" : "Interview Follow-Up"} />
                  <ScreenField label="Kind" value={mutationMode === "create" ? "Follow-Up Planner" : "Follow-Up Planner"} />
                  <ScreenField
                    label="Instructions"
                    value="Work from the selected application, attached documents, and operator instructions. Keep the output grounded, concise, and explicit about missing evidence."
                    multiline
                  />
                </>
              )}
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}

export function AgentsScreen({
  state = "populated",
  mutationMode = "edit",
  mobile = false,
}: {
  state?: AgentsScreenState;
  mutationMode?: AgentsScreenMutationMode;
  mobile?: boolean;
}) {
  return <AgentsDesktopContent state={state} mutationMode={mutationMode} mobile={mobile} />;
}
