import type { ReactNode } from "react";
import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenMetric,
  ScreenPanel,
  ScreenSearch,
  ScreenTag,
} from "./flagship-primitives";

export type ApplicationsQueueScreenState =
  | "populated"
  | "no_applications"
  | "filter_empty"
  | "delete_confirm";

type Tone = "accent" | "success" | "warning" | "error" | "info" | "skill" | "neutral";

interface QueueApplication {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  stage: string;
  tone: Tone;
  updated: string;
  nextStep: string;
  dueLabel: string;
  overdue?: boolean;
  documentCount: number;
  resumeReady: boolean;
  coverLetterReady: boolean;
}

const APPLICATIONS: QueueApplication[] = [
  {
    id: "APP-219",
    title: "Staff Frontend Platform",
    company: "Stripe",
    location: "Remote / San Francisco",
    salary: "$210k-$240k",
    stage: "Interview",
    tone: "info",
    updated: "2h ago",
    nextStep: "Send portfolio follow-up before the onsite debrief.",
    dueLabel: "Due Apr 19",
    documentCount: 3,
    resumeReady: true,
    coverLetterReady: true,
  },
  {
    id: "APP-203",
    title: "Product Systems Designer",
    company: "Notion",
    location: "San Francisco / Hybrid",
    salary: "$195k-$220k",
    stage: "Applied",
    tone: "info",
    updated: "5h ago",
    nextStep: "Keep the company brief attached and watch for the next update on this application.",
    dueLabel: "Updated today",
    documentCount: 2,
    resumeReady: true,
    coverLetterReady: false,
  },
  {
    id: "APP-187",
    title: "Research Operations",
    company: "Anthropic",
    location: "Remote",
    salary: "$185k-$210k",
    stage: "Screening",
    tone: "warning",
    updated: "Yesterday",
    nextStep: "Reply to the screening prompt and attach the revised resume variant.",
    dueLabel: "Overdue since Apr 15",
    overdue: true,
    documentCount: 1,
    resumeReady: true,
    coverLetterReady: false,
  },
  {
    id: "APP-161",
    title: "Backend Platform Engineer",
    company: "Linear",
    location: "Remote / US",
    salary: "$205k-$235k",
    stage: "Offer",
    tone: "success",
    updated: "2d ago",
    nextStep: "Review the written offer and add a negotiation checklist.",
    dueLabel: "Due Apr 22",
    documentCount: 4,
    resumeReady: true,
    coverLetterReady: true,
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

function StatusLabel({ stage, tone }: { stage: string; tone: Tone }) {
  const { T } = useTheme();
  const palette = resolveTone(tone, T);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: palette.color }} />
      <span style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 12.5, color: palette.color }}>{stage}</span>
    </div>
  );
}

function QueueRow({
  application,
  compact = false,
}: {
  application: QueueApplication;
  compact?: boolean;
}) {
  const { T } = useTheme();
  const palette = resolveTone(application.tone, T);

  return (
    <div
      style={{
        display: "flex",
        gap: compact ? 10 : 14,
        alignItems: "stretch",
        padding: compact ? "12px 12px 12px 10px" : "14px 16px 14px 12px",
        background: T.base,
        border: `1px solid ${application.overdue ? palette.border : T.s1}`,
        borderRadius: T.r3,
      }}
    >
      <div style={{ width: 4, borderRadius: T.rFull, background: palette.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: compact ? 8 : 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: compact ? 15 : 17, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{application.title}</p>
            <p style={{ fontFamily: T.fontBody, fontSize: compact ? 12 : 12.5, color: T.t1, margin: 0 }}>{application.company} / {application.location}</p>
          </div>
          {!compact && <ScreenBadge label={application.id} tone="neutral" />}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <StatusLabel stage={application.stage} tone={application.tone} />
          <ScreenTag label={application.salary} tone="success" />
          <ScreenTag label={`${application.documentCount} documents`} tone="accent" />
          {application.resumeReady && <ScreenTag label="Resume ready" tone="info" />}
          {application.coverLetterReady && <ScreenTag label="Cover letter ready" tone="skill" />}
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{application.updated}</span>
        </div>

        <div style={{ padding: compact ? "8px 10px" : "10px 12px", background: application.overdue ? palette.dim : T.raised, border: `1px solid ${application.overdue ? palette.border : T.s0}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: application.overdue ? palette.color : T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Next step</p>
          <p style={{ fontFamily: T.fontBody, fontSize: compact ? 12 : 12.5, color: T.t0, lineHeight: 1.55, margin: "0 0 4px" }}>{application.nextStep}</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: application.overdue ? palette.color : T.t1, margin: 0 }}>{application.dueLabel}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenButton label="View detail" kind="secondary" compact />
            <ScreenButton label="Advance" compact />
          </div>
          {!compact && <ScreenButton label="Delete" kind="ghost" compact />}
        </div>
      </div>
    </div>
  );
}

function EmptyCollectionCard({
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
    <div style={{ padding: "30px 24px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 20, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 14px", maxWidth: 480 }}>{body}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ScreenButton label={primaryLabel} />
        {secondaryLabel && <ScreenButton label={secondaryLabel} kind="secondary" />}
      </div>
    </div>
  );
}

function QueueDesktopContent({ state }: { state: ApplicationsQueueScreenState }) {
  const { T } = useTheme();
  const noApplications = state === "no_applications";
  const filterEmpty = state === "filter_empty";
  const metrics = noApplications
    ? [
        { label: "Total", value: "0", tone: "neutral" as Tone, note: "No applications tracked" },
        { label: "Active", value: "0", tone: "neutral" as Tone, note: "Nothing in motion" },
        { label: "Interviewing", value: "0", tone: "neutral" as Tone, note: "No scheduled loops" },
        { label: "Offers", value: "0", tone: "neutral" as Tone, note: "No offer decisions" },
        { label: "Closed", value: "0", tone: "neutral" as Tone, note: "No archived outcomes" },
      ]
    : [
        { label: "Total", value: "14", tone: "accent" as Tone, note: "Across active and closed applications" },
        { label: "Active", value: "11", tone: "info" as Tone, note: "Still in the live search loop" },
        { label: "Interviewing", value: "3", tone: "warning" as Tone, note: "Needs current prep and follow-up" },
        { label: "Offers", value: "1", tone: "success" as Tone, note: "Ready for decision work" },
        { label: "Closed", value: "3", tone: "neutral" as Tone, note: "Rejected or withdrawn" },
      ];

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>JOB SEARCH / APPLICATIONS</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Applications Queue</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, margin: 0, lineHeight: 1.65, maxWidth: 620 }}>
              The queue keeps metrics, filters, document readiness, and next-step pressure visible before you drop into the board or detail route.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={noApplications ? "Queue empty" : filterEmpty ? "Filters active" : "Collection route"} tone={noApplications ? "warning" : filterEmpty ? "info" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Open board" kind="secondary" />
              <ScreenButton label="Browse leads" />
            </div>
          </div>
        </div>

        {!noApplications && (
          <ScreenCallout
            title={filterEmpty ? "Filters removed every visible result" : "Follow-up pressure stays visible in the queue"}
            body={filterEmpty
              ? "The shipped queue keeps search, stage, active/closed, and document filters in one place. This state shows the empty-result branch after filtering, not a true zero-data route."
              : "Two applications have next steps due soon, and one screening reminder is already overdue. The row callout stays visible without hiding the rest of the queue."}
            tone={filterEmpty ? "info" : "warning"}
            action={<ScreenButton label={filterEmpty ? "Clear filters" : "Open overdue"} kind="secondary" compact />}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          {metrics.map((metric) => (
            <ScreenMetric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} note={metric.note} />
          ))}
        </div>

        <ScreenPanel
          kicker="Collection controls"
          title="Search, stage filters, and workspace readiness"
          aside={<ScreenBadge label={noApplications ? "No rows" : "Recently updated"} tone={noApplications ? "neutral" : "info"} />}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <ScreenSearch label={filterEmpty ? "Search applications: Seattle" : "Search title, company, or location"} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterChip label="Recently Updated" active tone="accent" />
                <FilterChip label="Company A-Z" />
                <FilterChip label="Due date" />
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterChip label="All stages" active={!filterEmpty} tone="accent" />
                <FilterChip label="Registered" />
                <FilterChip label="Applied" />
                <FilterChip label="Screening" active={filterEmpty} tone="warning" />
                <FilterChip label="Interview" />
                <FilterChip label="Offer" />
                <FilterChip label="Rejected" />
                <FilterChip label="Withdrawn" />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterChip label="All" active={!filterEmpty} tone="accent" />
                <FilterChip label="Active" active={filterEmpty} tone="info" />
                <FilterChip label="Closed" />
                <FilterChip label="Has resume" active={filterEmpty} tone="success" />
                <FilterChip label="Has cover letter" />
              </div>
            </div>
          </div>
        </ScreenPanel>

        <ScreenPanel
          kicker="Queue rows"
          title={noApplications ? "No applications tracked" : filterEmpty ? "No queue rows match the active filters" : "Application rows"}
          aside={!noApplications && !filterEmpty ? <ScreenBadge label="14 total applications" tone="neutral" /> : undefined}
        >
          {noApplications ? (
            <EmptyCollectionCard
              title="No applications tracked"
              body="Apply to a lead to start the queue. This route stays focused on personal pipeline momentum and private search workflow."
              primaryLabel="Browse leads"
              secondaryLabel="Open board"
            />
          ) : filterEmpty ? (
            <EmptyCollectionCard
              title="No results match your filters"
              body="Clear the active stage and resume filters, or widen the search string, to bring applications back into view."
              primaryLabel="Clear filters"
              secondaryLabel="Reset search"
            />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {APPLICATIONS.map((application) => (
                <QueueRow key={application.id} application={application} />
              ))}
            </div>
          )}
        </ScreenPanel>
      </div>

      {state === "delete_confirm" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Delete application"
            subtitle="The shipped queue uses a confirm gate for destructive actions. Deleting removes the application from the queue, board, and detail route."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Delete Stripe application" kind="secondary" tone="error" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Staff Frontend Platform / Stripe</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>Remove the row, attached reminder state, and the linked detail route. This action is intentionally irreversible in the specimen.</p>
              </div>
              <ScreenCallout title="Confirm before deleting" body="Destructive actions keep the entity name in the button label so the operator never confirms a generic dialog." tone="error" />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}

function QueueMobileContent({ state }: { state: ApplicationsQueueScreenState }) {
  const { T } = useTheme();
  const noApplications = state === "no_applications";
  const filterEmpty = state === "filter_empty";

  return (
    <MobileShell routeLabel="/applications" title="Applications">
      <ScreenBadge label={noApplications ? "Queue empty" : filterEmpty ? "Filters active" : "Queue route"} tone={noApplications ? "warning" : filterEmpty ? "info" : "accent"} />

      {!noApplications && (
        <ScreenCallout
          title={filterEmpty ? "Filtered to zero" : "One reminder is overdue"}
          body={filterEmpty ? "This is the queue's filter-empty branch, not a no-data route." : "The mobile specimen keeps the same next-step pressure visible on rows."}
          tone={filterEmpty ? "info" : "warning"}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Total" value={noApplications ? "0" : "14"} tone={noApplications ? "neutral" : "accent"} />
        <ScreenMetric label="Active" value={noApplications ? "0" : "11"} tone={noApplications ? "neutral" : "info"} />
      </div>

      <ScreenPanel kicker="Filters" title="Search and chips">
        <div style={{ display: "grid", gap: 10 }}>
          <ScreenSearch label={filterEmpty ? "Search: Seattle" : "Search applications"} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FilterChip label="All" active={!filterEmpty} tone="accent" />
            <FilterChip label="Screening" active={filterEmpty} tone="warning" />
            <FilterChip label="Has resume" active={filterEmpty} tone="success" />
          </div>
        </div>
      </ScreenPanel>

      <ScreenPanel kicker="Rows" title={noApplications ? "No applications yet" : filterEmpty ? "No matching rows" : "Queue cards"}>
        {noApplications ? (
          <EmptyCollectionCard
            title="No applications tracked"
            body="Apply to a lead to start the queue."
            primaryLabel="Browse leads"
          />
        ) : filterEmpty ? (
          <EmptyCollectionCard
            title="No filters matched"
            body="Clear the stage and document filters to repopulate the queue."
            primaryLabel="Clear filters"
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {APPLICATIONS.slice(0, 3).map((application) => (
              <QueueRow key={application.id} application={application} compact />
            ))}
          </div>
        )}
      </ScreenPanel>

      {state === "delete_confirm" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5, 10, 18, 0.52)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
          <ScreenDialog
            title="Delete application"
            subtitle="The mobile confirm gate keeps the same named destructive action."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Delete Stripe" kind="secondary" tone="error" />
              </>
            )}
          >
            <ScreenCallout title="Staff Frontend Platform / Stripe" body="Removing this application also removes its reminder state and detail entry." tone="error" />
          </ScreenDialog>
        </div>
      )}
    </MobileShell>
  );
}

export function ApplicationsQueueScreen({
  state = "populated",
  mobile = false,
}: {
  state?: ApplicationsQueueScreenState;
  mobile?: boolean;
}) {
  if (mobile) {
    return <QueueMobileContent state={state} />;
  }

  return <QueueDesktopContent state={state} />;
}
