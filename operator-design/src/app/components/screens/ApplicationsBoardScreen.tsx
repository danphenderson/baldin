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
  ScreenTag,
} from "./flagship-primitives";

export type ApplicationsBoardScreenState =
  | "populated"
  | "empty_board"
  | "overdue_warning"
  | "move_dialog"
  | "reminder_dialog";

type Tone = "accent" | "success" | "warning" | "error" | "info" | "skill" | "neutral";

interface BoardApplication {
  id: string;
  title: string;
  company: string;
  lane: string;
  tone: Tone;
  location: string;
  documents: number;
  nextStep?: string;
  dueLabel?: string;
  overdue?: boolean;
}

const BOARD_APPLICATIONS: BoardApplication[] = [
  {
    id: "APP-244",
    title: "Growth Design Lead",
    company: "Notion",
    lane: "registered",
    tone: "neutral",
    location: "San Francisco / Hybrid",
    documents: 1,
    nextStep: "Decide whether to move this registration into the active pipeline.",
    dueLabel: "Registered yesterday",
  },
  {
    id: "APP-219",
    title: "Product Systems Designer",
    company: "Figma",
    lane: "applied",
    tone: "info",
    location: "Remote / US",
    documents: 2,
    nextStep: "Keep the company notes attached and watch for the next update on this application.",
    dueLabel: "Updated today",
  },
  {
    id: "APP-203",
    title: "Research Operations",
    company: "Anthropic",
    lane: "screening",
    tone: "warning",
    location: "Remote",
    documents: 1,
    nextStep: "Reply to the screening prompt and attach the revised resume.",
    dueLabel: "Overdue since Apr 15",
    overdue: true,
  },
  {
    id: "APP-197",
    title: "Staff Frontend Platform",
    company: "Stripe",
    lane: "interview",
    tone: "info",
    location: "Remote / San Francisco",
    documents: 3,
    nextStep: "Send the portfolio follow-up before the onsite debrief.",
    dueLabel: "Due Apr 19",
  },
  {
    id: "APP-161",
    title: "Backend Platform Engineer",
    company: "Linear",
    lane: "offer",
    tone: "success",
    location: "Remote / US",
    documents: 4,
    nextStep: "Review the written offer and create a negotiation checklist.",
    dueLabel: "Due Apr 22",
  },
  {
    id: "APP-140",
    title: "Developer Experience",
    company: "Vercel",
    lane: "rejected",
    tone: "error",
    location: "Remote",
    documents: 2,
    nextStep: "Capture why the loop ended before removing this from current memory.",
    dueLabel: "Closed last week",
  },
  {
    id: "APP-133",
    title: "Platform Product Designer",
    company: "Rippling",
    lane: "withdrawn",
    tone: "neutral",
    location: "San Francisco / Hybrid",
    documents: 2,
    nextStep: "Preserve notes in case the team reopens the role later.",
    dueLabel: "Withdrawn Apr 11",
  },
];

const BOARD_SECTIONS = [
  {
    key: "intake",
    title: "Intake",
    description: "Registered applications stay separate until you deliberately move them into the active pipeline.",
    lanes: ["registered"],
  },
  {
    key: "pipeline",
    title: "Active Pipeline",
    description: "Drag cards or use Move to keep the funnel current without opening the detail route.",
    lanes: ["applied", "screening", "interview", "offer"],
  },
  {
    key: "closed",
    title: "Closed",
    description: "Rejected and withdrawn cards remain visible so reopening still feels intentional.",
    lanes: ["rejected", "withdrawn"],
  },
] as const;

const LANE_META: Record<string, { title: string; tone: Tone; empty: string }> = {
  registered: {
    title: "Registered",
    tone: "neutral",
    empty: "Registered applications stay here until you are ready to work them in the pipeline.",
  },
  applied: {
    title: "Applied",
    tone: "info",
    empty: "No active applications in the applied lane.",
  },
  screening: {
    title: "Screening",
    tone: "warning",
    empty: "No screening conversations are currently in flight.",
  },
  interview: {
    title: "Interview",
    tone: "info",
    empty: "No interviews are currently scheduled.",
  },
  offer: {
    title: "Offer",
    tone: "success",
    empty: "No offers yet.",
  },
  rejected: {
    title: "Rejected",
    tone: "error",
    empty: "Rejected applications stay visible for context and pattern review.",
  },
  withdrawn: {
    title: "Withdrawn",
    tone: "neutral",
    empty: "Withdrawn applications stay visible until you decide to clean them up.",
  },
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

function LaneCard({
  application,
  compact = false,
}: {
  application: BoardApplication;
  compact?: boolean;
}) {
  const { T } = useTheme();
  const palette = resolveTone(application.tone, T);

  return (
    <div
      style={{
        padding: compact ? "12px" : "12px 12px 10px",
        background: T.base,
        border: `1px solid ${application.overdue ? palette.border : T.s1}`,
        borderRadius: T.r3,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: compact ? 14 : 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{application.title}</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: 0 }}>{application.company} / {application.location}</p>
        </div>
        {!compact && <ScreenTag label={application.id} tone="neutral" />}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <ScreenTag label={`${application.documents} docs`} tone="accent" />
        {application.overdue && <ScreenTag label="Overdue reminder" tone="warning" />}
      </div>

      {application.nextStep && (
        <div style={{ padding: "8px 10px", background: application.overdue ? palette.dim : T.raised, border: `1px solid ${application.overdue ? palette.border : T.s0}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: application.overdue ? palette.color : T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Reminder</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.55, margin: "0 0 4px" }}>{application.nextStep}</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: application.overdue ? palette.color : T.t1, margin: 0 }}>{application.dueLabel}</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenButton label="View" kind="secondary" compact />
          <ScreenButton label={application.lane === "registered" ? "Add to pipeline" : "Move"} compact />
        </div>
        {!compact && <ScreenButton label="Reminder" kind="ghost" compact />}
      </div>
    </div>
  );
}

function Lane({
  lane,
  applications,
  compact = false,
}: {
  lane: string;
  applications: BoardApplication[];
  compact?: boolean;
}) {
  const { T } = useTheme();
  const meta = LANE_META[lane];
  const palette = resolveTone(meta.tone, T);

  return (
    <div style={{ minWidth: compact ? "auto" : lane === "registered" ? 240 : 260, flex: compact ? undefined : 1, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: compact ? 0 : "0 2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 9, height: 9, borderRadius: T.rFull, background: palette.color }} />
          <span style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 14, color: T.t0 }}>{meta.title}</span>
        </div>
        <ScreenTag label={String(applications.length)} tone={meta.tone} />
      </div>
      <div style={{ padding: compact ? 0 : "10px", background: palette.dim, border: `1px solid ${palette.border}`, borderRadius: T.r3, display: "flex", flexDirection: "column", gap: 10, minHeight: compact ? "auto" : 210 }}>
        {applications.length === 0 ? (
          <div style={{ padding: compact ? "14px 12px" : "18px 14px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{meta.empty}</p>
          </div>
        ) : (
          applications.map((application) => (
            <LaneCard key={application.id} application={application} compact={compact} />
          ))
        )}
      </div>
    </div>
  );
}

function buildLaneMap() {
  return BOARD_APPLICATIONS.reduce<Record<string, BoardApplication[]>>((acc, application) => {
    acc[application.lane] = [...(acc[application.lane] ?? []), application];
    return acc;
  }, {});
}

function BoardDesktopContent({ state }: { state: ApplicationsBoardScreenState }) {
  const { T } = useTheme();
  const laneMap = buildLaneMap();
  const emptyBoard = state === "empty_board";
  const showOverdue = state === "overdue_warning";

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>JOB SEARCH / APPLICATIONS</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Applications Board</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, margin: 0, lineHeight: 1.65, maxWidth: 620 }}>
              Lane grouping keeps intake, active pipeline, and closed outcomes separate while the board exposes reminder pressure and drag-to-move behavior.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={emptyBoard ? "Board empty" : showOverdue ? "Reminder pressure" : "Board route"} tone={emptyBoard ? "warning" : showOverdue ? "warning" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Open queue" kind="secondary" />
              <ScreenButton label="Refresh board" />
            </div>
          </div>
        </div>

        {!emptyBoard && (
          <ScreenCallout
            title={showOverdue ? "Overdue reminders stay on the board" : "Move and reminder controls stay inline"}
            body={showOverdue
              ? "The shipped board highlights overdue next steps without hiding the lane structure. Keep the warning local to the card and reinforce it with the summary metric."
              : "The board keeps drag-and-drop, move actions, and reminder editing close to the card so the operator does not need to bounce between routes for simple progression work."}
            tone={showOverdue ? "warning" : "info"}
            action={<ScreenButton label={showOverdue ? "Open reminders" : "Edit reminder"} kind="secondary" compact />}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 }}>
          {[
            { label: "Total", value: emptyBoard ? "0" : "14", tone: "accent" as Tone },
            { label: "Registered", value: emptyBoard ? "0" : "2", tone: "neutral" as Tone },
            { label: "Active", value: emptyBoard ? "0" : "8", tone: "info" as Tone },
            { label: "Interviewing", value: emptyBoard ? "0" : "2", tone: "warning" as Tone },
            { label: "Offers", value: emptyBoard ? "0" : "1", tone: "success" as Tone },
            { label: "Closed", value: emptyBoard ? "0" : "3", tone: "neutral" as Tone },
            { label: "Overdue", value: emptyBoard ? "0" : "1", tone: "warning" as Tone },
          ].map((metric) => (
            <ScreenMetric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />
          ))}
        </div>

        {emptyBoard ? (
          <ScreenPanel kicker="Board empty state" title="No applications yet">
            <div style={{ padding: "30px 24px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 20, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>No applications yet</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 14px", maxWidth: 520 }}>
                When you apply to leads, they appear here as grouped board lanes so you can manage stage changes, reminders, and closures without leaving the route family.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <ScreenButton label="Browse leads" />
                <ScreenButton label="Open queue" kind="secondary" />
              </div>
            </div>
          </ScreenPanel>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {BOARD_SECTIONS.map((section) => (
              <ScreenPanel
                key={section.key}
                kicker={section.title}
                title={section.description}
                aside={section.key === "pipeline" ? <ScreenBadge label="Drag and drop preserved" tone="info" /> : undefined}
              >
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                  {section.lanes.map((lane) => (
                    <Lane key={lane} lane={lane} applications={laneMap[lane] ?? []} />
                  ))}
                </div>
              </ScreenPanel>
            ))}
          </div>
        )}
      </div>

      {state === "move_dialog" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Move application"
            subtitle="The shipped board supports drag-and-drop, but it also needs a menu path for deliberate movement between lanes."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Move to Interview" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Research Operations / Anthropic</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>Move this card from Screening to Interview while preserving the existing reminder and document count.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScreenTag label="Current: Screening" tone="warning" />
                <ScreenTag label="Target: Interview" tone="info" />
              </div>
            </div>
          </ScreenDialog>
        </div>
      )}

      {state === "reminder_dialog" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Edit reminder"
            subtitle="Reminder editing stays on the board so next-step maintenance does not require a full route change."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Save reminder" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="Reminder next step" value="Reply to the screening prompt and attach the revised resume." multiline />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ScreenField label="Reminder due date" value="Apr 15, 2026" />
                <ScreenField label="Application" value="Research Operations" />
              </div>
              <ScreenCallout title="Overdue reminder" body="The warning branch keeps the overdue cue on the card and in the metric strip after saving." tone="warning" />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}

function BoardMobileContent({ state }: { state: ApplicationsBoardScreenState }) {
  const { T } = useTheme();
  const laneMap = buildLaneMap();
  const emptyBoard = state === "empty_board";

  return (
    <MobileShell routeLabel="/applications/board" title="Board">
      <ScreenBadge label={emptyBoard ? "Board empty" : state === "overdue_warning" ? "Overdue reminder" : "Board route"} tone={emptyBoard ? "warning" : state === "overdue_warning" ? "warning" : "accent"} />

      {!emptyBoard && (
        <ScreenCallout
          title={state === "overdue_warning" ? "One reminder is overdue" : "Lane grouping stays visible"}
          body={state === "overdue_warning" ? "The overdue cue stays on the card and in the summary metrics." : "Intake, active pipeline, and closed outcomes remain separate even on mobile."}
          tone={state === "overdue_warning" ? "warning" : "info"}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Active" value={emptyBoard ? "0" : "8"} tone={emptyBoard ? "neutral" : "info"} />
        <ScreenMetric label="Overdue" value={emptyBoard ? "0" : "1"} tone={emptyBoard ? "neutral" : "warning"} />
      </div>

      {emptyBoard ? (
        <ScreenPanel kicker="Empty" title="No applications yet">
          <div style={{ padding: "22px 18px", background: "transparent", border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 12px" }}>Applications will appear here as grouped lanes when you move leads into the pipeline.</p>
            <ScreenButton label="Browse leads" />
          </div>
        </ScreenPanel>
      ) : (
        BOARD_SECTIONS.map((section) => (
          <ScreenPanel key={section.key} kicker={section.title} title={section.title}>
            <div style={{ display: "grid", gap: 10 }}>
              {section.lanes.map((lane) => (
                <Lane key={lane} lane={lane} applications={laneMap[lane] ?? []} compact />
              ))}
            </div>
          </ScreenPanel>
        ))
      )}

      {(state === "move_dialog" || state === "reminder_dialog") && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.52)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
          <ScreenDialog
            title={state === "move_dialog" ? "Move application" : "Edit reminder"}
            subtitle={state === "move_dialog" ? "Menu path for deliberate lane changes." : "Reminder editing stays on the board."}
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label={state === "move_dialog" ? "Move" : "Save"} />
              </>
            )}
          >
            {state === "move_dialog" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScreenTag label="Current: Screening" tone="warning" />
                <ScreenTag label="Target: Interview" tone="info" />
              </div>
            ) : (
              <ScreenField label="Reminder next step" value="Reply to the screening prompt and attach the revised resume." multiline />
            )}
          </ScreenDialog>
        </div>
      )}
    </MobileShell>
  );
}

export function ApplicationsBoardScreen({
  state = "populated",
  mobile = false,
}: {
  state?: ApplicationsBoardScreenState;
  mobile?: boolean;
}) {
  if (mobile) {
    return <BoardMobileContent state={state} />;
  }

  return <BoardDesktopContent state={state} />;
}
