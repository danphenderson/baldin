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
  ScreenProposal,
  ScreenTag,
} from "./flagship-primitives";

export type DetailScreenState =
  | "populated"
  | "overdue_warning"
  | "missing_artifact_warning"
  | "create_action_item"
  | "delete_confirm";
export type DetailScreenObservabilityMode = "current" | "proposal";

type Tone = "accent" | "success" | "warning" | "error" | "info" | "skill" | "neutral";

type DetailObservabilityBand = {
  label: string;
  value: string;
  tone: Tone;
  note: string;
};

interface TimelineEntry {
  label: string;
  timestamp: string;
  duration: string;
  tone: Tone;
}

interface DocumentEntry {
  title: string;
  kind: string;
  version: string;
  status: string;
  tone: Tone;
}

const APPLICATION = {
  id: "APP-197",
  title: "Staff Frontend Platform",
  company: "Stripe",
  stage: "Interview",
  tone: "info" as Tone,
  location: "Remote / San Francisco",
  salary: "$210k-$240k",
  workMode: "Hybrid / 2 days onsite",
  source: "Warm intro via Anika Chen",
  applied: "Apr 13, 2026",
  updated: "2h ago",
  nextStep: "Send the portfolio follow-up before the onsite debrief.",
  nextStepDue: "Apr 19, 2026",
  note: "Role still maps tightly to the current aspiration set around product systems, platform ownership, and calm operator tooling. The search surface should keep that rationale visible while actions stay grounded in the actual interview loop.",
};

const TIMELINE: TimelineEntry[] = [
  {
    label: "Created in Applied",
    timestamp: "Apr 13, 09:18",
    duration: "Stayed in Applied for 2 days",
    tone: "info",
  },
  {
    label: "Moved to Screening",
    timestamp: "Apr 15, 11:04",
    duration: "Stayed in Screening for 1 day",
    tone: "warning",
  },
  {
    label: "Moved to Interview",
    timestamp: "Apr 16, 17:32",
    duration: "Currently in Interview",
    tone: "info",
  },
];

const DOCUMENTS: DocumentEntry[] = [
  {
    title: "Resume / Systems v4",
    kind: "Resume",
    version: "v4",
    status: "Attached",
    tone: "info",
  },
  {
    title: "Cover letter / Stripe",
    kind: "Cover letter",
    version: "v2",
    status: "Generated",
    tone: "skill",
  },
  {
    title: "Interview brief",
    kind: "Workspace doc",
    version: "v1",
    status: "Linked",
    tone: "accent",
  },
];

const STATUS_PATH = [
  { label: "Applied", tone: "info" as Tone, complete: true },
  { label: "Screening", tone: "warning" as Tone, complete: true },
  { label: "Interview", tone: "info" as Tone, complete: true, current: true },
  { label: "Offer", tone: "success" as Tone, complete: false },
  { label: "Rejected", tone: "error" as Tone, complete: false },
  { label: "Withdrawn", tone: "neutral" as Tone, complete: false },
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

function DetailObservabilityModule({
  state,
  mobile = false,
}: {
  state: DetailScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const snapshot = state === "missing_artifact_warning"
    ? {
        bands: [
          { label: "Follow-up freshness", value: "Aging", tone: "warning" as const, note: "The route can warn that momentum is softening without exposing exact elapsed time or named operators." },
          { label: "Stage posture", value: "Unclear", tone: "neutral" as const, note: "Missing evidence keeps any forward-looking read visibly tentative rather than overstating application strength." },
          { label: "Evidence weight", value: "Low", tone: "warning" as const, note: "The overlay can only show a low coarse band while a key artifact is absent from the route." },
        ] satisfies DetailObservabilityBand[],
        signalQuality: "Low confidence",
        signalTone: "warning" as const,
        signalNote: "Proposal bands stay weak when the application lacks the supporting artifact needed to corroborate the read.",
        decayNote: "If the missing artifact remains unresolved, stronger bands step down before the route suggests any durable advantage.",
      }
    : state === "overdue_warning"
      ? {
          bands: [
            { label: "Follow-up freshness", value: "Stale-risk", tone: "warning" as const, note: "The application detail can flag a cooling next step without turning delay into a precise public claim." },
            { label: "Stage posture", value: "Steady", tone: "info" as const, note: "Underlying fit can remain intact even while the recency band warns that action is slipping." },
            { label: "Evidence weight", value: "Medium", tone: "info" as const, note: "The route still has enough private evidence to support a qualitative read, but not to imply certainty." },
          ] satisfies DetailObservabilityBand[],
          signalQuality: "Corroborated",
          signalTone: "success" as const,
          signalNote: "Multiple route-local cues agree on the same broad risk posture, so the module can show a stronger qualitative warning.",
          decayNote: "Fresh follow-up cues degrade into Aging and then Stale-risk when the next action is not refreshed in time.",
        }
      : {
          bands: [
            { label: "Follow-up freshness", value: "Fresh", tone: "accent" as const, note: "The module can summarize current application momentum without ever exposing exact counts or named contributors." },
            { label: "Stage posture", value: "Steady", tone: "info" as const, note: "The route can suggest durable application footing while keeping the read qualitative and private." },
            { label: "Evidence weight", value: "Medium", tone: "info" as const, note: "Attached documents and route-local notes support a measured band instead of a stronger public-style claim." },
          ] satisfies DetailObservabilityBand[],
          signalQuality: "Corroborated",
          signalTone: "success" as const,
          signalNote: "Bands can appear only after the application route has enough aligned private evidence to justify a coarse summary.",
          decayNote: "If the next-step and document context stop moving together, Fresh softens toward Aging before the route suggests any stronger conclusion.",
        };

  return (
    <ScreenPanel
      kicker="Proposal overlay"
      title="Private application observability"
      aside={<ScreenTag label="Opt-in" tone="info" />}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <ScreenProposal
          title="Application leverage stays confidence-scoped"
          body="Future-facing detail cues can compress private application momentum into broad bands, but they remain proposal-only and subordinate to the actual next step, status history, and artifacts."
          provenance="Synthesized from route-local application state, artifact readiness, and current next-step pressure."
          boundary="Private candidate workflow only. Coarse bands only, no exact counts, and no named contributors."
        />

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {snapshot.bands.map((band) => (
            <div key={band.label} style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "grid", gap: 8 }}>
              <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{band.label}</p>
              <div>
                <ScreenTag label={band.value} tone={band.tone === "accent" ? "info" : band.tone} />
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{band.note}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(220px, 0.7fr) minmax(0, 1fr)", gap: 10 }}>
          <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "grid", gap: 8 }}>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Signal quality</p>
            <div>
              <ScreenTag label={snapshot.signalQuality} tone={snapshot.signalTone} />
            </div>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{snapshot.signalNote}</p>
          </div>
          <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "grid", gap: 8 }}>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Time decay</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{snapshot.decayNote}</p>
          </div>
        </div>
      </div>
    </ScreenPanel>
  );
}

function MobileShell({
  routeLabel,
  title,
  children,
}: {
  routeLabel: string;
  title: string;
  children: ReactNode;
}) {
  const { T } = useTheme();
  const tabs = ["Dashboard", "Applications", "Messages", "Workspace"] as const;

  return (
    <div style={{ width: 390, background: T.bg, border: `1px solid ${T.s2}`, borderRadius: 28, overflow: "hidden", boxShadow: T.shadow3, position: "relative" }}>
      <div style={{ padding: "10px 18px 12px", background: T.base, borderBottom: `1px solid ${T.s1}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: T.t0 }}>09:41</span>
          <div style={{ width: 88, height: 6, borderRadius: T.rFull, background: T.s1 }} />
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>LTE</span>
        </div>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.08em", margin: "0 0 4px" }}>{routeLabel}</p>
        <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 22, color: T.t0, margin: 0, letterSpacing: "-0.02em" }}>{title}</p>
      </div>
      <div style={{ padding: "14px 16px 18px", minHeight: 720, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "10px 14px 16px", background: T.base, borderTop: `1px solid ${T.s1}` }}>
        {tabs.map((tab) => {
          const isActive = tab === "Applications";
          return (
            <div key={tab} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? T.accentDim : "transparent", border: `1px solid ${isActive ? T.aStroke : "transparent"}` }} />
              <span style={{ fontFamily: T.fontMono, fontSize: 9.5, color: isActive ? T.accent : T.t2 }}>{tab}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { T } = useTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, alignItems: "start", padding: "8px 0", borderBottom: `1px solid ${T.s0}` }}>
      <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.6 }}>{value}</span>
    </div>
  );
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  const { T } = useTheme();
  const palette = resolveTone(entry.tone, T);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
      <div style={{ width: 20, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: T.rFull, background: palette.color, marginTop: 9, boxShadow: `0 0 0 4px ${palette.dim}` }} />
      </div>
      <div style={{ flex: 1, padding: "12px 14px", background: T.base, border: `1px solid ${palette.border}`, borderRadius: T.r2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{entry.label}</p>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{entry.timestamp}</span>
        </div>
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{entry.duration}</p>
      </div>
    </div>
  );
}

function DocumentRow({ document }: { document: DocumentEntry }) {
  const { T } = useTheme();
  const palette = resolveTone(document.tone, T);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{document.title}</p>
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>{document.kind} / {document.version}</p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <ScreenTag label={document.status} tone={document.tone} />
        <ScreenButton label="Open" kind="secondary" compact />
      </div>
    </div>
  );
}

function WarningCallout({ state }: { state: DetailScreenState }) {
  if (state !== "overdue_warning" && state !== "missing_artifact_warning") {
    return null;
  }

  return (
    <ScreenCallout
      title={state === "overdue_warning" ? "Next step is overdue" : "Missing artifact blocks the workspace flow"}
      body={state === "overdue_warning"
        ? "The queue row and board card should both show the same overdue reminder cue until the due date changes. Keep the detail page aligned with those collection-level warnings."
        : "A resume variant is missing, so workspace comparison and the next document-generation step should stay visibly blocked until you attach the required artifact."}
      tone={state === "overdue_warning" ? "warning" : "error"}
      action={<ScreenButton label={state === "overdue_warning" ? "Create action item" : "Attach resume"} kind="secondary" compact />}
    />
  );
}

function DetailDesktopContent({
  state,
  observabilityMode,
}: {
  state: DetailScreenState;
  observabilityMode: DetailScreenObservabilityMode;
}) {
  const { T } = useTheme();
  const stagePalette = resolveTone(APPLICATION.tone, T);
  const missingArtifact = state === "missing_artifact_warning";
  const documents = missingArtifact ? DOCUMENTS.filter((document) => document.kind !== "Resume") : DOCUMENTS;

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>JOB SEARCH / APPLICATION DETAIL</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{APPLICATION.title}</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, margin: 0, lineHeight: 1.65, maxWidth: 680 }}>
              The detail route stays section-based: current next step, status history, documents, and action flows all remain visible without falling back to route-local tabs.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={`${APPLICATION.company} / ${APPLICATION.stage}`} tone={APPLICATION.tone} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Open board" kind="secondary" />
              <ScreenButton label="Create action item" />
            </div>
          </div>
        </div>

        <WarningCallout state={state} />
        {observabilityMode === "proposal" && <DetailObservabilityModule state={state} />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <ScreenMetric label="Documents" value={String(documents.length)} tone="accent" note="Attached across resume, cover letter, and workspace docs" />
          <ScreenMetric label="History events" value={String(TIMELINE.length)} tone="info" note="Status timeline entries loaded for this application" />
          <ScreenMetric label="Open actions" value="4" tone="warning" note="Create action item, generate document, run agent, delete" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, 0.9fr)", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <ScreenPanel
              kicker="Route summary"
              title={`${APPLICATION.company} / ${APPLICATION.location}`}
              aside={<ScreenBadge label={APPLICATION.stage} tone={APPLICATION.tone} />}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.7, margin: 0 }}>{APPLICATION.note}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenTag label={APPLICATION.salary} tone="success" />
                  <ScreenTag label={APPLICATION.workMode} tone="neutral" />
                  <ScreenTag label={APPLICATION.source} tone="skill" />
                  <ScreenTag label={`Updated ${APPLICATION.updated}`} tone="accent" />
                </div>
              </div>
            </ScreenPanel>

            <ScreenPanel
              kicker="Next step"
              title="Current follow-up"
              aside={<ScreenTag label={`Due ${APPLICATION.nextStepDue}`} tone={state === "overdue_warning" ? "warning" : "info"} />}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ padding: "12px 14px", background: state === "overdue_warning" ? stagePalette.dim : T.base, border: `1px solid ${state === "overdue_warning" ? stagePalette.border : T.s1}`, borderRadius: T.r2 }}>
                  <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t0, lineHeight: 1.65, margin: 0 }}>{APPLICATION.nextStep}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenButton label="Create action item" />
                  <ScreenButton label="Generate cover letter" kind="secondary" />
                  <ScreenButton label="Run agent" kind="ghost" />
                </div>
              </div>
            </ScreenPanel>

            <ScreenPanel kicker="Operator notes" title="Notes and rationale">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>Warm intro context already exists, so the next action should tighten the portfolio handoff rather than restart outreach from scratch.</p>
                </div>
                <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>Keep the design-systems and internal-product angle legible in both the follow-up and the attached workspace brief.</p>
                </div>
              </div>
            </ScreenPanel>

            <ScreenPanel kicker="Status history" title="Timeline">
              <div style={{ display: "grid", gap: 12 }}>
                {TIMELINE.map((entry) => (
                  <TimelineCard key={entry.label} entry={entry} />
                ))}
              </div>
            </ScreenPanel>

            <ScreenPanel
              kicker="Documents"
              title="Attached documents"
              aside={<ScreenBadge label={`${documents.length} linked`} tone="accent" />}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {missingArtifact && (
                  <ScreenCallout
                    title="Resume variant missing"
                    body="The detail route should keep document problems local to the documents section while the warning stays visible higher in the page shell."
                    tone="error"
                  />
                )}
                {documents.map((document) => (
                  <DocumentRow key={document.title} document={document} />
                ))}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenButton label="Attach document" kind="secondary" />
                  <ScreenButton label="New workspace doc" kind="ghost" />
                </div>
              </div>
            </ScreenPanel>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <ScreenPanel kicker="Application context" title="Summary">
              <div style={{ display: "grid" }}>
                <InfoRow label="Company" value={APPLICATION.company} />
                <InfoRow label="Location" value={APPLICATION.location} />
                <InfoRow label="Work mode" value={APPLICATION.workMode} />
                <InfoRow label="Source" value={APPLICATION.source} />
                <InfoRow label="Applied" value={APPLICATION.applied} />
                <InfoRow label="Updated" value={APPLICATION.updated} />
              </div>
            </ScreenPanel>

            <ScreenPanel kicker="Workflow progress" title="Status path">
              <div style={{ display: "grid", gap: 8 }}>
                {STATUS_PATH.map((step) => {
                  const palette = resolveTone(step.tone, T);
                  return (
                    <div key={step.label} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.s0}` }}>
                      <div style={{ width: 18, height: 18, borderRadius: T.rFull, background: step.complete ? palette.color : T.base, border: `1px solid ${step.complete ? palette.color : T.s1}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {step.complete && <span style={{ fontFamily: T.fontMono, fontSize: 9, color: T.bg }}>+</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: T.fontBody, fontWeight: step.current ? 700 : 600, fontSize: 12.5, color: step.current ? palette.color : T.t0, margin: 0 }}>{step.label}</p>
                        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "2px 0 0" }}>{step.current ? "Current stage" : step.complete ? "Completed" : "Not reached"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScreenPanel>

            <ScreenPanel kicker="Action flows" title="Mutation states">
              <div style={{ display: "grid", gap: 10 }}>
                <ScreenCallout
                  title="Create action item stays local"
                  body="The action-item dialog pre-fills from the current next step so you can capture follow-up work without leaving the application route."
                  tone="info"
                />
                <ScreenCallout
                  title="Delete uses a confirm gate"
                  body="Destructive actions name the entity directly. The dialog should never collapse into a generic OK/Cancel pattern."
                  tone="error"
                />
              </div>
            </ScreenPanel>
          </div>
        </div>
      </div>

      {state === "create_action_item" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Create action item"
            subtitle="Action items inherit the current next step and application link so the dashboard can surface the same work later."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Create action item" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="Title" value={APPLICATION.nextStep} multiline />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ScreenField label="Due date" value={APPLICATION.nextStepDue} />
                <ScreenField label="Linked application" value={`${APPLICATION.company} / ${APPLICATION.title}`} />
              </div>
            </div>
          </ScreenDialog>
        </div>
      )}

      {state === "delete_confirm" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Delete application"
            subtitle="Removing this application also removes the detail route entry, reminder state, and attached action context."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Delete Stripe application" kind="secondary" tone="error" />
              </>
            )}
          >
            <ScreenCallout title={`${APPLICATION.title} / ${APPLICATION.company}`} body="The confirm button keeps the entity name visible so the action stays unmistakable at the last step." tone="error" />
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}

function DetailMobileContent({
  state,
  observabilityMode,
}: {
  state: DetailScreenState;
  observabilityMode: DetailScreenObservabilityMode;
}) {
  const { T } = useTheme();
  const missingArtifact = state === "missing_artifact_warning";
  const documents = missingArtifact ? DOCUMENTS.filter((document) => document.kind !== "Resume") : DOCUMENTS;

  return (
    <MobileShell routeLabel="/applications/app-197" title="Application detail">
      <ScreenBadge label={`${APPLICATION.company} / ${APPLICATION.stage}`} tone={APPLICATION.tone} />
      <WarningCallout state={state} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Docs" value={String(documents.length)} tone="accent" />
        <ScreenMetric label="History" value={String(TIMELINE.length)} tone="info" />
      </div>

      {observabilityMode === "proposal" && <DetailObservabilityModule state={state} mobile />}

      <ScreenPanel kicker="Next step" title="Current follow-up">
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.65, margin: 0 }}>{APPLICATION.nextStep}</p>
          <ScreenTag label={`Due ${APPLICATION.nextStepDue}`} tone={state === "overdue_warning" ? "warning" : "info"} />
          <ScreenButton label="Create action item" />
        </div>
      </ScreenPanel>

      <ScreenPanel kicker="Timeline" title="Status history">
        <div style={{ display: "grid", gap: 10 }}>
          {TIMELINE.map((entry) => (
            <TimelineCard key={entry.label} entry={entry} />
          ))}
        </div>
      </ScreenPanel>

      <ScreenPanel kicker="Documents" title="Linked files">
        <div style={{ display: "grid", gap: 10 }}>
          {missingArtifact && (
            <ScreenCallout title="Resume missing" body="Attach the resume before the next workspace step." tone="error" />
          )}
          {documents.map((document) => (
            <DocumentRow key={document.title} document={document} />
          ))}
        </div>
      </ScreenPanel>

      {(state === "create_action_item" || state === "delete_confirm") && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.52)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
          <ScreenDialog
            title={state === "create_action_item" ? "Create action item" : "Delete application"}
            subtitle={state === "create_action_item" ? "Prefilled from the next step." : "Named destructive confirmation."}
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label={state === "create_action_item" ? "Create" : "Delete"} tone={state === "create_action_item" ? "accent" : "error"} kind={state === "create_action_item" ? "primary" : "secondary"} />
              </>
            )}
          >
            {state === "create_action_item" ? (
              <ScreenField label="Title" value={APPLICATION.nextStep} multiline />
            ) : (
              <ScreenCallout title={`${APPLICATION.title} / ${APPLICATION.company}`} body="Delete removes the route and reminder state." tone="error" />
            )}
          </ScreenDialog>
        </div>
      )}
    </MobileShell>
  );
}

export function DetailScreen({
  state = "populated",
  mobile = false,
  observabilityMode = "current",
}: {
  state?: DetailScreenState;
  mobile?: boolean;
  observabilityMode?: DetailScreenObservabilityMode;
}) {
  if (mobile) {
    return <DetailMobileContent state={state} observabilityMode={observabilityMode} />;
  }

  return <DetailDesktopContent state={state} observabilityMode={observabilityMode} />;
}
