import { useId, type ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
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

export type DashboardScreenState = "momentum" | "no_leads" | "overdue" | "mutation";
export type DashboardScreenMutationMode = "action-triage" | "create-action";

type Tone = "accent" | "success" | "warning" | "info" | "neutral" | "skill";

type DashboardMetric = {
  label: string;
  value: string;
  tone: Tone;
  note: string;
};

type DashboardAction = {
  title: string;
  status: string;
  tone: Tone;
  due: string;
  context: string;
  note: string;
};

type DashboardLead = {
  rank: string;
  company: string;
  role: string;
  summary: string;
  collaboration: string;
  handoff: string;
};

type DashboardActivity = {
  time: string;
  actor: string;
  action: string;
  detail: string;
  tone: Tone;
};

const MOMENTUM_DATA = [
  { day: "Apr 1", ranked: 3, applied: 1, replies: 0 },
  { day: "Apr 3", ranked: 6, applied: 2, replies: 1 },
  { day: "Apr 5", ranked: 8, applied: 3, replies: 1 },
  { day: "Apr 7", ranked: 7, applied: 4, replies: 1 },
  { day: "Apr 9", ranked: 9, applied: 4, replies: 2 },
  { day: "Apr 11", ranked: 12, applied: 6, replies: 2 },
  { day: "Apr 13", ranked: 10, applied: 7, replies: 3 },
  { day: "Apr 15", ranked: 13, applied: 8, replies: 3 },
  { day: "Apr 17", ranked: 11, applied: 9, replies: 4 },
];

const BASE_ACTIONS: DashboardAction[] = [
  {
    title: "Tighten the Stripe follow-up note",
    status: "Pending",
    tone: "warning",
    due: "Due today",
    context: "Staff Frontend Platform · Stripe",
    note: "Keep the opening crisp, then decide whether the intro ask should wait for the next pass.",
  },
  {
    title: "Finalize Vercel apply handoff",
    status: "In Progress",
    tone: "info",
    due: "Due today",
    context: "Design Systems Engineer · Vercel",
    note: "Resume bullets and company-fit rationale are drafted; handoff just needs the final story block.",
  },
  {
    title: "Review Figma workspace comparison",
    status: "Ready",
    tone: "success",
    due: "Tomorrow",
    context: "Staff Product Designer · Figma",
    note: "Use the compare note to decide whether this stays in the top-ranked cluster this week.",
  },
  {
    title: "Reply to the inbound thread",
    status: "Pending",
    tone: "warning",
    due: "Tomorrow",
    context: "Growth Operator · Notion",
    note: "Share the short availability window and keep the note focused on platform-facing scope.",
  },
];

const OVERDUE_ACTIONS: DashboardAction[] = [
  {
    title: "Send the Stripe follow-up before the intro path cools",
    status: "Overdue",
    tone: "warning",
    due: "2 days overdue",
    context: "Staff Frontend Platform · Stripe",
    note: "This is the highest-risk slip in the queue; the lead still ranks well, but the outreach window is aging.",
  },
  {
    title: "Answer the Linear connection check-in",
    status: "Overdue",
    tone: "warning",
    due: "1 day overdue",
    context: "Backend Platform · Linear",
    note: "A short acknowledgement is enough to keep the shared context warm while you decide on next steps.",
  },
  ...BASE_ACTIONS.slice(1),
];

const RECENT_LEADS: DashboardLead[] = [
  {
    rank: "Ranked #1",
    company: "Stripe",
    role: "Staff Frontend Platform",
    summary: "Strong fit for internal tooling, design-system depth, and platform influence.",
    collaboration: "Shared note thread active",
    handoff: "Application handoff ready",
  },
  {
    rank: "Ranked #2",
    company: "Figma",
    role: "Staff Product Designer",
    summary: "High systems alignment with a lighter comp signal but strong product-language overlap.",
    collaboration: "Compare note queued",
    handoff: "Needs story trim",
  },
  {
    rank: "Ranked #3",
    company: "Vercel",
    role: "Design Systems Engineer",
    summary: "Good operator-tooling match with faster apply potential once the handoff is finalized.",
    collaboration: "Research note added",
    handoff: "Create action suggested",
  },
];

const ACTIVITY_FEED: DashboardActivity[] = [
  { time: "09:41", actor: "Baldin Agent", action: "drafted", detail: "Stripe follow-up", tone: "warning" },
  { time: "09:18", actor: "Jordan Kim", action: "updated", detail: "Vercel handoff brief", tone: "info" },
  { time: "08:54", actor: "Maria Garcia", action: "shared", detail: "Figma team context", tone: "success" },
  { time: "Yesterday", actor: "System", action: "imported", detail: "4 new leads", tone: "accent" },
  { time: "Yesterday", actor: "Workspace", action: "published", detail: "Compare note", tone: "skill" },
];

function resolveTone(tone: Tone, T: ReturnType<typeof useTheme>["T"]) {
  switch (tone) {
    case "accent":
      return { color: T.accent, dim: T.accentDim, border: T.aStroke };
    case "success":
      return { color: T.success, dim: T.succDim, border: `${T.success}44` };
    case "warning":
      return { color: T.warning, dim: T.warnDim, border: `${T.warning}44` };
    case "info":
      return { color: T.info, dim: T.infoDim, border: `${T.info}44` };
    case "skill":
      return { color: T.skill, dim: T.skillDim, border: `${T.skill}44` };
    default:
      return { color: T.t1, dim: T.s0, border: T.s1 };
  }
}

function DashboardPhoneFrame({
  routeLabel,
  title,
  children,
}: {
  routeLabel: string;
  title: string;
  children: ReactNode;
}) {
  const { T } = useTheme();
  const tabs = ["Dashboard", "Leads", "Messages", "Profile"] as const;

  return (
    <div style={{ width: 390, background: T.bg, border: `1px solid ${T.s2}`, borderRadius: 28, overflow: "hidden", boxShadow: T.shadow3 }}>
      <div style={{ padding: "10px 18px 12px", background: T.base, borderBottom: `1px solid ${T.s1}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: T.t0 }}>09:41</span>
          <div style={{ width: 88, height: 6, borderRadius: T.rFull, background: T.s1 }} />
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>LTE</span>
        </div>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.08em", margin: "0 0 4px" }}>{routeLabel}</p>
        <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 22, color: T.t0, margin: 0, letterSpacing: "-0.02em" }}>{title}</p>
      </div>
      <div style={{ padding: "14px 16px 18px", minHeight: 680, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "10px 14px 16px", background: T.base, borderTop: `1px solid ${T.s1}` }}>
        {tabs.map((tab) => {
          const isActive = tab === "Dashboard";
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

function SummaryCard({
  state,
  mobile = false,
}: {
  state: DashboardScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const contentState = state === "mutation" ? "momentum" : state;
  const isEmpty = contentState === "no_leads";
  const isOverdue = contentState === "overdue";
  const summaryCopy = isEmpty
    ? "Start by adding your first lead, shaping your profile, or creating a document so this dashboard has momentum to track."
    : isOverdue
      ? "3 active applications, 5 open action items, 6 unapplied leads. 2 overdue follow-ups need attention first."
      : "3 active applications, 4 open action items, 6 unapplied leads. Everything is current, so this is a good window to push the pipeline forward.";

  const badge = isEmpty
    ? { label: "Onboarding", tone: "warning" as const }
    : isOverdue
      ? { label: "Overdue focus", tone: "warning" as const }
      : state === "mutation"
        ? { label: "Action draft open", tone: "accent" as const }
        : { label: "Momentum live", tone: "accent" as const };

  return (
    <div
      style={{
        padding: mobile ? "16px 16px 18px" : "22px 24px",
        background: T.accentDim,
        border: `1px solid ${contentState === "overdue" ? `${T.warning}55` : T.aStroke}`,
        borderRadius: T.r4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 14, flexDirection: mobile ? "column" : "row" }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>TODAY AT A GLANCE</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: mobile ? 24 : 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Good afternoon, Jordan</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: mobile ? 12.5 : 13.5, color: T.t1, lineHeight: 1.65, margin: "0 0 10px", maxWidth: 780 }}>{summaryCopy}</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2, margin: 0 }}>Friday, April 17 · Last refreshed 2 min ago</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: mobile ? "flex-start" : "flex-end", gap: 8 }}>
          <ScreenBadge label={badge.label} tone={badge.tone} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenButton label="Add action" />
            <ScreenButton label="Review leads" kind="secondary" />
            {!mobile && <ScreenButton label="Refresh" kind="ghost" compact />}
          </div>
        </div>
      </div>

      {!isEmpty && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <ScreenTag label="Proposal" tone="info" />
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
            Ask Anika Chen for candidate-side context on Stripe after the first outreach note is tightened, then decide whether the warm intro should happen in the next pass.
          </p>
        </div>
      )}
    </div>
  );
}

function OverviewMetrics({
  state,
  mobile = false,
}: {
  state: DashboardScreenState;
  mobile?: boolean;
}) {
  const contentState = state === "mutation" ? "momentum" : state;
  const metrics: DashboardMetric[] = contentState === "no_leads"
    ? [
        { label: "Active Apps", value: "0", tone: "neutral", note: "Nothing active yet" },
        { label: "Open Actions", value: "0", tone: "neutral", note: "Queue starts after the first lead" },
        { label: "Unapplied Leads", value: "0", tone: "neutral", note: "Import or create one lead" },
        { label: "Overdue", value: "0", tone: "neutral", note: "No workflow debt" },
        { label: "Messages", value: "0", tone: "neutral", note: "No network threads yet" },
        { label: "Profile", value: "68%", tone: "info", note: "Enough to start ranking later" },
      ]
    : [
        { label: "Active Apps", value: "3", tone: "accent", note: "Applied or in progress" },
        { label: "Open Actions", value: contentState === "overdue" ? "5" : "4", tone: "info", note: "Working queue" },
        { label: "Unapplied Leads", value: "6", tone: "success", note: "Worth another pass" },
        { label: "Overdue", value: contentState === "overdue" ? "2" : "0", tone: contentState === "overdue" ? "warning" : "neutral", note: "Needs attention first" },
        { label: "Messages", value: "4", tone: "accent", note: "Unread network notes" },
        { label: "Profile", value: "86%", tone: "success", note: "Ranking-ready signal" },
      ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
      {metrics.map((metric) => (
        <ScreenMetric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} note={metric.note} />
      ))}
    </div>
  );
}

function MomentumPanel({
  state,
}: {
  state: DashboardScreenState;
}) {
  const { T } = useTheme();
  const contentState = state === "mutation" ? "momentum" : state;
  const chartId = useId().replace(/:/g, "");

  if (contentState === "no_leads") {
    const steps = [
      { title: "Import a lead", body: "Bring one posting into the system so recent leads and ranking have a real object to work with." },
      { title: "Shape your profile", body: "Tighten the profile hub so later ranking and apply handoff stay grounded in your actual direction." },
      { title: "Create a document", body: "Draft a resume or compare note to start building reusable candidate-side context." },
    ];

    return (
      <ScreenPanel kicker="Onboarding quick start" title="Start the decision loop">
        <div style={{ display: "grid", gap: 10 }}>
          {steps.map((step, index) => (
            <div key={step.title} style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: T.rFull, background: T.accentDim, border: `1px solid ${T.aStroke}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, color: T.accent }}>{index + 1}</span>
                </div>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{step.title}</p>
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 10px" }}>{step.body}</p>
              <ScreenButton label={index === 0 ? "Open leads" : index === 1 ? "Open profile" : "Open workspace"} kind={index === 0 ? "primary" : "secondary"} compact />
            </div>
          ))}
        </div>
      </ScreenPanel>
    );
  }

  return (
    <ScreenPanel
      kicker="Momentum"
      title="Search momentum"
      aside={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ScreenTag label="Ranked live" tone="info" />
          <ScreenTag label="Replies moving" tone="success" />
        </div>
      }
    >
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 14px" }}>
        Last 17 days of ranked leads, applications, and replies across the current decision loop.
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { label: "Ranked", tone: "info" as const },
          { label: "Applied", tone: "accent" as const },
          { label: "Replies", tone: "success" as const },
        ].map((item) => {
          const palette = resolveTone(item.tone, T);
          return (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 2, borderRadius: T.rFull, background: palette.color }} />
              <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MOMENTUM_DATA} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={`${chartId}-ranked`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.info} stopOpacity={0.32} />
                <stop offset="100%" stopColor={T.info} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${chartId}-applied`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity={0.28} />
                <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${chartId}-replies`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.success} stopOpacity={0.35} />
                <stop offset="100%" stopColor={T.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="ranked" stroke={T.info} strokeWidth={1.5} fill={`url(#${chartId}-ranked)`} dot={false} />
            <Area type="monotone" dataKey="applied" stroke={T.accent} strokeWidth={1.5} fill={`url(#${chartId}-applied)`} dot={false} />
            <Area type="monotone" dataKey="replies" stroke={T.success} strokeWidth={1.5} fill={`url(#${chartId}-replies)`} dot={false} />
            <Tooltip
              contentStyle={{ background: T.float, border: `1px solid ${T.s1}`, borderRadius: T.r2, fontFamily: T.fontMono, fontSize: 11 }}
              labelStyle={{ color: T.t1, fontSize: 11 }}
              itemStyle={{ color: T.t0, padding: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {contentState === "overdue" && (
        <div style={{ marginTop: 14 }}>
          <ScreenCallout
            title="Momentum is intact, but overdue work is bending the curve"
            body="Recent ranking and reply volume still look healthy. The faster move is to clear the overdue follow-ups before adding more fresh work."
            tone="warning"
          />
        </div>
      )}
    </ScreenPanel>
  );
}

function ActionItemsPanel({
  state,
  mobile = false,
}: {
  state: DashboardScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const contentState = state === "mutation" ? "momentum" : state;
  const actions = contentState === "no_leads" ? [] : contentState === "overdue" ? OVERDUE_ACTIONS : BASE_ACTIONS;
  const filters = ["All", "Pending", "In Progress", "Overdue"];
  const activeFilter = contentState === "overdue" ? "Overdue" : "All";
  const copy = contentState === "no_leads"
    ? "No action items yet. Action items appear once leads, applications, or network threads give the system something concrete to track."
    : contentState === "overdue"
      ? "Start with overdue work so follow-ups and deadlines do not slip."
      : "Your working queue, ordered by urgency and due date.";

  return (
    <ScreenPanel kicker="Decision loop" title="Action items" aside={<ScreenTag label={contentState === "no_leads" ? "0 open" : `${actions.length} open`} tone={contentState === "overdue" ? "warning" : "info"} />}>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>{copy}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {filters.map((filter) => (
          <div key={filter} style={{ padding: "4px 9px", borderRadius: T.rFull, background: filter === activeFilter ? T.accentDim : T.base, border: `1px solid ${filter === activeFilter ? T.aStroke : T.s1}` }}>
            <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: filter === activeFilter ? T.accent : T.t1 }}>{filter}</span>
          </div>
        ))}
      </div>
      {actions.length === 0 ? (
        <div style={{ padding: mobile ? "16px 14px" : "20px 18px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>All clear for now</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>
            Once you import a lead or draft outreach, this queue will hold the next concrete moves.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenButton label="Import first lead" compact />
            <ScreenButton label="Create document" kind="secondary" compact />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {actions.map((item) => {
            const palette = resolveTone(item.tone, T);
            return (
              <div key={`${item.title}-${item.context}`} style={{ background: T.base, border: `1px solid ${palette.border}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexDirection: mobile ? "column" : "row" }}>
                  <div>
                    <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{item.title}</p>
                    <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>{item.context}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <ScreenTag label={item.status} tone={item.tone === "accent" ? "info" : item.tone} />
                    <ScreenTag label={item.due} tone={item.tone === "warning" ? "warning" : "neutral"} />
                  </div>
                </div>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 10px" }}>{item.note}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenButton label={item.status === "Ready" ? "Open handoff" : "Open action"} compact />
                  <ScreenButton label="Edit" kind="secondary" compact />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScreenPanel>
  );
}

function RecentLeadsPanel({
  state,
  mobile = false,
}: {
  state: DashboardScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const contentState = state === "mutation" ? "momentum" : state;

  return (
    <ScreenPanel kicker="Lead review" title="Recent leads" aside={contentState === "no_leads" ? undefined : <ScreenButton label="View all" kind="ghost" compact />}>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>
        {contentState === "no_leads"
          ? "Fresh opportunities and imports will appear here once the first lead enters the system."
          : "Fresh opportunities and imports worth a second look before the next apply cycle."}
      </p>
      {contentState === "no_leads" ? (
        <div style={{ padding: mobile ? "16px 14px" : "20px 18px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>No leads yet</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>
            Import a lead or save a role to start building your pipeline.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenButton label="Import leads" compact />
            <ScreenButton label="Save aspiration" kind="secondary" compact />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {RECENT_LEADS.map((lead) => (
            <div key={`${lead.company}-${lead.role}`} style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexDirection: mobile ? "column" : "row" }}>
                <div>
                  <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{lead.role}</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>{lead.company}</p>
                </div>
                <ScreenTag label={lead.rank} tone="info" />
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 10px" }}>{lead.summary}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScreenTag label={lead.collaboration} tone="skill" />
                <ScreenTag label={lead.handoff} tone="warning" />
              </div>
            </div>
          ))}
        </div>
      )}
    </ScreenPanel>
  );
}

function ActivityPanel({
  state,
}: {
  state: DashboardScreenState;
}) {
  const { T } = useTheme();
  const contentState = state === "mutation" ? "momentum" : state;

  return (
    <ScreenPanel kicker="Signals" title="Recent activity">
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>
        Signals from the last 7 days across leads, applications, documents, and network context.
      </p>
      {contentState === "no_leads" ? (
        <div style={{ padding: "20px 18px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>No recent activity</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
            Activity across leads, applications, and workspace docs will appear here once the first operating loop starts moving.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 0 }}>
          {ACTIVITY_FEED.map((item, index) => {
            const palette = resolveTone(item.tone, T);
            return (
              <div key={`${item.time}-${item.actor}-${item.detail}`} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: index < ACTIVITY_FEED.length - 1 ? `1px solid ${T.s0}` : "none" }}>
                <div style={{ width: 20, display: "flex", justifyContent: "center", paddingTop: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: T.rFull, background: palette.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: "0 0 2px" }}>
                    <strong>{item.actor}</strong> <span style={{ color: T.t1 }}>{item.action}</span> <span style={{ color: palette.color }}>{item.detail}</span>
                  </p>
                  <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2, margin: 0 }}>{item.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScreenPanel>
  );
}

function AnalyticsUnlockPanel() {
  const { T } = useTheme();

  return (
    <ScreenPanel kicker="Pipeline analytics" title="Analytics unlock panel">
      <div style={{ padding: "20px 18px", borderRadius: T.r2, border: `1px dashed ${T.s1}`, background: T.base, textAlign: "center" }}>
        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Analytics unlock as pipeline history accumulates</p>
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>
          Once applications move through Applied, Screening, Interview, and Offer, this panel will surface stage bottlenecks and yield automatically.
        </p>
      </div>
    </ScreenPanel>
  );
}

function MutationOverlay({
  mode,
}: {
  mode: DashboardScreenMutationMode;
}) {
  const { T } = useTheme();

  return (
    <ScreenDialog
      title={mode === "action-triage" ? "Action triage" : "Create action"}
      subtitle={mode === "action-triage"
        ? "Convert dashboard signals into explicit next steps before context drifts."
        : "Add a concrete task tied to a lead, application, or network thread."}
      footer={
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label={mode === "action-triage" ? "Create 3 actions" : "Save action"} compact />
            <ScreenButton label="Dismiss" kind="secondary" compact />
          </div>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{mode === "action-triage" ? "Queue review before creation" : "Draft state only"}</span>
        </>
      }
    >
      {mode === "action-triage" ? (
        <div style={{ display: "grid", gap: 10 }}>
          {[
            {
              title: "Stripe follow-up needs a first-pass send",
              body: "Candidate-side context is ready once the intro note is tightened.",
              tone: "warning" as const,
              due: "Due today",
            },
            {
              title: "Promote the Vercel handoff into application creation",
              body: "The story block is already drafted; the next move is to convert it into an explicit apply action.",
              tone: "info" as const,
              due: "Due today",
            },
            {
              title: "Capture the Figma comparison before the memory cools",
              body: "Shared context exists, but it is still scattered across notes and messages.",
              tone: "skill" as const,
              due: "Tomorrow",
            },
          ].map((item) => (
            <div key={item.title} style={{ background: T.base, border: `1px solid ${resolveTone(item.tone, T).border}`, borderRadius: T.r2, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{item.title}</p>
                <ScreenTag label={item.due} tone={item.tone === "skill" ? "skill" : item.tone} />
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <ScreenField label="Title" value="Send Stripe follow-up and request candidate-side context" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ScreenField label="Related item" value="Staff Frontend Platform · Stripe" />
            <ScreenField label="Due date" value="Today · 4:30 PM" />
          </div>
          <ScreenField
            label="Notes"
            value="Keep the note short, mention internal-tooling alignment, and only ask for a warm intro if the candidate-side read still feels strong."
            multiline
          />
        </div>
      )}
    </ScreenDialog>
  );
}

function DashboardDesktopContent({
  state,
  mutationMode,
}: {
  state: DashboardScreenState;
  mutationMode: DashboardScreenMutationMode;
}) {
  const { T } = useTheme();
  const isMutation = state === "mutation";
  const contentState = isMutation ? "momentum" : state;

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", background: T.bg, position: "relative" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, opacity: isMutation ? 0.46 : 1, filter: isMutation ? "blur(1px)" : "none", transition: "opacity 0.16s ease" }}>
        <SummaryCard state={state} />
        {contentState === "overdue" && (
          <ScreenCallout
            title="Overdue follow-ups need attention first"
            body="Recent momentum still looks healthy, but the queue has two overdue follow-ups that should move ahead of any new ranking or outreach work."
            tone="warning"
            action={<ScreenButton label="Open overdue queue" kind="secondary" compact />}
          />
        )}
        {contentState === "no_leads" && (
          <ScreenCallout
            title="Welcome to Baldin"
            body="Start by importing a lead, building your profile, or creating a document so this dashboard has real workflow state to manage."
            tone="info"
            action={<ScreenButton label="Open leads" kind="secondary" compact />}
          />
        )}
        <OverviewMetrics state={state} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <MomentumPanel state={state} />
            <ActionItemsPanel state={state} />
            <RecentLeadsPanel state={state} />
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <ActivityPanel state={state} />
            <AnalyticsUnlockPanel />
          </div>
        </div>
      </div>

      {isMutation && (
        <div style={{ position: "absolute", inset: 0, background: `${T.bg}AA`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <MutationOverlay mode={mutationMode} />
        </div>
      )}
    </div>
  );
}

function DashboardMobileContent({
  state,
  mutationMode,
}: {
  state: DashboardScreenState;
  mutationMode: DashboardScreenMutationMode;
}) {
  const { T } = useTheme();
  const isMutation = state === "mutation";
  const contentState = isMutation ? "momentum" : state;

  return (
    <div style={{ position: "relative", width: 390 }}>
      <div style={{ opacity: isMutation ? 0.42 : 1, filter: isMutation ? "blur(1px)" : "none", transition: "opacity 0.16s ease" }}>
        <DashboardPhoneFrame routeLabel="/dashboard" title="Dashboard">
          <SummaryCard state={state} mobile />
          {contentState === "overdue" && (
            <ScreenCallout
              title="Overdue follow-ups need attention first"
              body="Two follow-ups slipped. Clear them before adding new work."
              tone="warning"
            />
          )}
          {contentState === "no_leads" && (
            <ScreenCallout
              title="Welcome to Baldin"
              body="Import your first lead or shape the profile so the dashboard has momentum to track."
              tone="info"
            />
          )}
          <OverviewMetrics state={state} mobile />
          <MomentumPanel state={state} />
          <ActionItemsPanel state={state} mobile />
          <RecentLeadsPanel state={state} mobile />
          <ActivityPanel state={state} />
          <AnalyticsUnlockPanel />
        </DashboardPhoneFrame>
      </div>

      {isMutation && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: `${T.bg}B8`, borderRadius: 28 }}>
          <MutationOverlay mode={mutationMode} />
        </div>
      )}
    </div>
  );
}

export function DashboardScreen({
  state = "momentum",
  mutationMode = "action-triage",
  mobile = false,
}: {
  state?: DashboardScreenState;
  mutationMode?: DashboardScreenMutationMode;
  mobile?: boolean;
}) {
  return mobile ? <DashboardMobileContent state={state} mutationMode={mutationMode} /> : <DashboardDesktopContent state={state} mutationMode={mutationMode} />;
}
