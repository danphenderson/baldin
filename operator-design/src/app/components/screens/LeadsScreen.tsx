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

export type LeadsScreenState = "ranked" | "no_leads_imported" | "filter_empty" | "modal";
export type LeadsScreenModalMode = "lead-review" | "apply-handoff";
export type LeadsScreenObservabilityMode = "current" | "proposal";

type Tone = "accent" | "success" | "warning" | "info" | "neutral" | "skill";

type LeadMetric = {
  label: string;
  value: string;
  tone: Tone;
  note: string;
};

type LeadCardSpec = {
  rank: string;
  company: string;
  role: string;
  location: string;
  source: string;
  summary: string;
  collaboration: string[];
  privateCue?: string;
  handoff: {
    label: string;
    tone: Tone;
    body: string;
  };
};

type LeadsObservabilityBand = {
  label: string;
  value: string;
  tone: Tone;
  note: string;
};

const RANKED_LEADS: LeadCardSpec[] = [
  {
    rank: "Ranked #1",
    company: "Stripe",
    role: "Staff Frontend Platform",
    location: "Remote / San Francisco",
    source: "Imported from company site",
    summary: "Strong aspiration fit for internal tooling, systems influence, and platform-scale product work.",
    collaboration: ["Shared context active", "Followed by you"],
    privateCue: "Warm intro path via Anika Chen once the first note is tight enough to forward.",
    handoff: {
      label: "Ready to apply",
      tone: "warning",
      body: "High aspiration fit. Resume variant and candidate story are both close enough for application handoff.",
    },
  },
  {
    rank: "Ranked #2",
    company: "Figma",
    role: "Staff Product Designer",
    location: "Remote (US)",
    source: "Imported from LinkedIn",
    summary: "Systems and library ownership line up well, but the product-craft story still needs a sharper first pass.",
    collaboration: ["Compare note queued", "Shared lead"],
    handoff: {
      label: "Lead review first",
      tone: "info",
      body: "Keep this ranked, but validate the product narrative before moving into handoff.",
    },
  },
  {
    rank: "Ranked #3",
    company: "Vercel",
    role: "Design Systems Engineer",
    location: "Remote",
    source: "Imported from company site",
    summary: "Very strong tooling overlap with lighter confidence around level and compensation.",
    collaboration: ["Workspace brief drafted", "Comments active"],
    handoff: {
      label: "Create action",
      tone: "accent",
      body: "Promote the draft brief into an explicit action before deciding whether to create an application.",
    },
  },
  {
    rank: "Ranked #4",
    company: "Northstar",
    role: "Principal Product Designer",
    location: "New York / Hybrid",
    source: "Imported from Glassdoor",
    summary: "Leadership signal is strong, but the day-to-day scope looks less platform-heavy than the top cluster.",
    collaboration: ["Tracking with notes", "Context thread quiet"],
    handoff: {
      label: "Hold in ranked set",
      tone: "neutral",
      body: "Keep this visible in the collection, but do not hand it off until the scope reads clearer.",
    },
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
    case "info":
      return { color: T.info, dim: T.infoDim, border: `${T.info}44` };
    case "skill":
      return { color: T.skill, dim: T.skillDim, border: `${T.skill}44` };
    default:
      return { color: T.t1, dim: T.s0, border: T.s1 };
  }
}

function LeadsObservabilityModule({
  state,
  mobile = false,
}: {
  state: LeadsScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const contentState = state === "modal" ? "ranked" : state;
  const snapshot = contentState === "no_leads_imported"
    ? {
        bands: [
          { label: "Lead freshness", value: "Fresh", tone: "info" as const, note: "The overlay can acknowledge a clean slate without pretending that ranked momentum already exists." },
          { label: "Fit read", value: "Unclear", tone: "neutral" as const, note: "Private observability stays broad until at least one lead has enough context to anchor the route." },
          { label: "Route climate", value: "Quiet", tone: "neutral" as const, note: "No contact or collaboration pattern should surface while the collection is still empty." },
        ] satisfies LeadsObservabilityBand[],
        signalQuality: "Low confidence",
        signalTone: "warning" as const,
        signalNote: "Proposal cues remain tentative when they rely on default posture instead of corroborated lead evidence.",
        decayNote: "If no lead enters the loop, any early read drops back toward Quiet rather than hardening into a standing claim.",
      }
    : contentState === "filter_empty"
      ? {
          bands: [
            { label: "Lead freshness", value: "Aging", tone: "warning" as const, note: "The route can imply that useful context exists, but hidden cards should not read as fresh confirmation." },
            { label: "Fit read", value: "Steady", tone: "info" as const, note: "Saved lead context can stay directionally useful even when the current query hides the ranked set." },
            { label: "Route climate", value: "Quiet", tone: "neutral" as const, note: "Filtered emptiness should not be mistaken for a responsive or public-facing market signal." },
          ] satisfies LeadsObservabilityBand[],
          signalQuality: "Early signal",
          signalTone: "info" as const,
          signalNote: "The route can show a soft read, but it should remain visibly provisional until the operator reopens matching lead cards.",
          decayNote: "When corroborating cards are out of view, stronger bands soften before they ever imply certainty.",
        }
      : {
          bands: [
            { label: "Lead freshness", value: "Fresh", tone: "accent" as const, note: "Future-facing lead cues can stay current while still hiding exact volume and private contributor detail." },
            { label: "Fit read", value: "Stronger", tone: "success" as const, note: "The overlay can reflect durable candidate-side fit without drifting into marketplace-style proof." },
            { label: "Route climate", value: "Mixed", tone: "info" as const, note: "Private context may be active, but the read stays qualitative and never implies guaranteed reach." },
          ] satisfies LeadsObservabilityBand[],
          signalQuality: "Corroborated",
          signalTone: "success" as const,
          signalNote: "Bands can surface only when ranking, route-local notes, and private context point in the same broad direction.",
          decayNote: "Fresh lead cues soften toward Aging as ranking notes or route-local context stop being refreshed.",
        };

  return (
    <ScreenPanel
      kicker="Proposal overlay"
      title="Private lead observability"
      aside={<ScreenTag label="Opt-in" tone="info" />}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <ScreenProposal
          title="Leverage hints stay qualitative"
          body="This route can preview coarse private lead bands, but the cues stay clearly proposal-labeled and separate from any public or recruiter-marketplace framing."
          provenance="Derived from ranked lead context, saved private notes, and route-local decision activity."
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

function LeadsPhoneFrame({
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
          const isActive = tab === "Leads";
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

function LeadsHeader({
  state,
  mobile = false,
}: {
  state: LeadsScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const badge = state === "no_leads_imported"
    ? { label: "Empty route", tone: "warning" as const }
    : state === "filter_empty"
      ? { label: "Filter empty", tone: "info" as const }
      : state === "modal"
        ? { label: "Modal open", tone: "accent" as const }
        : { label: "Ranked collection", tone: "accent" as const };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexDirection: mobile ? "column" : "row" }}>
      <div>
        {!mobile && <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · LEADS</p>}
        {!mobile && <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Leads</h1>}
        <p style={{ fontFamily: T.fontBody, fontSize: mobile ? 12.5 : 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 720 }}>
          Extract, rank, and move promising opportunities into application handoff without losing shared context or candidate-side leverage.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: mobile ? "flex-start" : "flex-end" }}>
        <ScreenBadge label={badge.label} tone={badge.tone} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenButton label="Create lead" />
          <ScreenButton label="Rank with aspirations" kind="secondary" />
        </div>
      </div>
    </div>
  );
}

function ExtractionPanel({
  state,
}: {
  state: LeadsScreenState;
}) {
  const { T } = useTheme();
  const helper = state === "no_leads_imported"
    ? "Import a job lead from LinkedIn, Glassdoor, or a company site to get started."
    : "Paste a job posting URL to pull details into the ranked collection and shared lead context.";

  return (
    <ScreenPanel
      kicker="Extract or import"
      title="Bring one lead into the decision loop"
      aside={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenButton label="Extract" compact />
          <ScreenButton label="Create manually" kind="secondary" compact />
        </div>
      }
    >
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 14px" }}>{helper}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, height: 38, background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>URL</span>
          <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t2 }}>Paste a posting from LinkedIn, Glassdoor, or a company site...</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenTag label="Private-by-default" tone="skill" />
          <ScreenTag label="Shared lead context" tone="info" />
        </div>
      </div>
    </ScreenPanel>
  );
}

function Toolbar({
  state,
  mobile = false,
}: {
  state: LeadsScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const contentState = state === "modal" ? "ranked" : state;
  const filters = ["All Leads", "I'm Tracking", "Active Shared", "Remote"];
  const activeFilter = contentState === "filter_empty" ? "Remote" : "All Leads";

  return (
    <div style={{ padding: "12px 14px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: mobile ? "100%" : 220, height: 36, background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>SEARCH</span>
          <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t2 }}>Search by title, company, or location...</span>
        </div>
        <ScreenButton label="Rank with aspirations" compact />
        {contentState !== "no_leads_imported" && <ScreenButton label="Clear ranking" kind="ghost" compact />}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {filters.map((filter) => (
          <div key={filter} style={{ padding: "4px 9px", borderRadius: T.rFull, background: filter === activeFilter ? T.accentDim : T.base, border: `1px solid ${filter === activeFilter ? T.aStroke : T.s1}` }}>
            <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: filter === activeFilter ? T.accent : T.t1 }}>{filter}</span>
          </div>
        ))}
        <div style={{ marginLeft: mobile ? 0 : "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenTag label="Top rank first" tone="neutral" />
          {contentState !== "no_leads_imported" && <ScreenTag label="Application handoff visible" tone="warning" />}
        </div>
      </div>
    </div>
  );
}

function MetricStrip({
  state,
  mobile = false,
}: {
  state: LeadsScreenState;
  mobile?: boolean;
}) {
  const contentState = state === "modal" ? "ranked" : state;
  const metrics: LeadMetric[] = contentState === "no_leads_imported"
    ? [
        { label: "Joined by you", value: "0", tone: "neutral", note: "Nothing tracked yet" },
        { label: "Active shared", value: "0", tone: "neutral", note: "No shared lead context" },
        { label: "With discussion", value: "0", tone: "neutral", note: "No notes yet" },
        { label: "Ready to apply", value: "0", tone: "neutral", note: "No handoffs yet" },
      ]
    : [
        { label: "Joined by you", value: "3", tone: "accent", note: "Leads you are tracking" },
        { label: "Active shared", value: "2", tone: "info", note: "Shared lead context moving" },
        { label: "With discussion", value: "3", tone: "skill", note: "Comments or notes attached" },
        { label: "Ready to apply", value: "2", tone: "warning", note: "Immediate handoff candidates" },
      ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
      {metrics.map((metric) => (
        <ScreenMetric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} note={metric.note} />
      ))}
    </div>
  );
}

function LeadCard({
  lead,
}: {
  lead: LeadCardSpec;
}) {
  const { T } = useTheme();
  const handoffPalette = resolveTone(lead.handoff.tone, T);

  return (
    <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{lead.role}</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: "0 0 4px" }}>{lead.company} · {lead.location}</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2, margin: 0 }}>{lead.source}</p>
        </div>
        <ScreenTag label={lead.rank} tone="info" />
      </div>

      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>{lead.summary}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {lead.collaboration.map((item) => (
          <ScreenTag key={item} label={item} tone={item.includes("Shared") ? "skill" : "neutral"} />
        ))}
      </div>

      {lead.privateCue && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
          <ScreenTag label="Connection path" tone="skill" />
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{lead.privateCue}</p>
        </div>
      )}

      <div style={{ padding: "12px 12px 10px", background: handoffPalette.dim, border: `1px solid ${handoffPalette.border}`, borderRadius: T.r2 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <ScreenTag label={lead.handoff.label} tone={lead.handoff.tone === "accent" ? "info" : lead.handoff.tone} />
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: handoffPalette.color }}>Application handoff</span>
        </div>
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{lead.handoff.body}</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ScreenButton label="Open lead" compact />
        <ScreenButton label={lead.handoff.label === "Ready to apply" ? "Open handoff" : "Review lead"} kind="secondary" compact />
      </div>
    </div>
  );
}

function RankedCollection({
  state,
}: {
  state: LeadsScreenState;
}) {
  const { T } = useTheme();
  const contentState = state === "modal" ? "ranked" : state;

  if (contentState === "no_leads_imported") {
    return (
      <ScreenPanel kicker="Collection" title="No leads imported yet">
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 14px" }}>
          Import a job lead from LinkedIn, Glassdoor, or paste a URL to get started. Any new lead can unlock ranking, shared context, and apply handoff.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenButton label="Import a lead" compact />
          <ScreenButton label="Create manually" kind="secondary" compact />
        </div>
      </ScreenPanel>
    );
  }

  if (contentState === "filter_empty") {
    return (
      <ScreenPanel kicker="Collection" title="No results match the current filters">
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 14px" }}>
          Try adjusting the search terms or clearing the active filter set. Ranking stays intact; the current query just does not surface any matching cards.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenTag label="Remote" tone="info" />
          <ScreenTag label="Warm intro path only" tone="skill" />
          <ScreenButton label="Clear filters" kind="secondary" compact />
        </div>
      </ScreenPanel>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
      {RANKED_LEADS.map((lead) => (
        <LeadCard key={`${lead.company}-${lead.role}`} lead={lead} />
      ))}
    </div>
  );
}

function RankedCollectionMobile({
  state,
}: {
  state: LeadsScreenState;
}) {
  const { T } = useTheme();
  const contentState = state === "modal" ? "ranked" : state;

  if (contentState === "no_leads_imported") {
    return (
      <ScreenPanel kicker="Collection" title="No leads imported yet">
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 12px" }}>
          Import the first lead to unlock ranking, shared context, and application handoff.
        </p>
        <ScreenButton label="Import a lead" compact />
      </ScreenPanel>
    );
  }

  if (contentState === "filter_empty") {
    return (
      <ScreenPanel kicker="Collection" title="No filter matches">
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 12px" }}>
          The active search and filter set is hiding all ranked cards right now.
        </p>
        <ScreenButton label="Clear filters" kind="secondary" compact />
      </ScreenPanel>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {RANKED_LEADS.map((lead) => (
        <LeadCard key={`${lead.company}-${lead.role}`} lead={lead} />
      ))}
    </div>
  );
}

function ModalOverlay({
  mode,
}: {
  mode: LeadsScreenModalMode;
}) {
  const { T } = useTheme();
  const activeLead = RANKED_LEADS[0];

  return (
    <ScreenDialog
      title={mode === "lead-review" ? "Lead review" : "Apply handoff"}
      subtitle={mode === "lead-review"
        ? "Validate the ranking read, shared context, and whether this lead should advance."
        : "Carry the ranked lead into application creation without losing the supporting context."}
      footer={
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label={mode === "lead-review" ? "Promote to handoff" : "Create application"} compact />
            <ScreenButton label="Return to leads" kind="secondary" compact />
          </div>
          <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{mode === "lead-review" ? "Review state" : "Handoff state"}</span>
        </>
      }
    >
      {mode === "lead-review" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenTag label={activeLead.rank} tone="info" />
            <ScreenTag label="Shared context active" tone="skill" />
          </div>
          <ScreenField label="Lead" value={`${activeLead.role} · ${activeLead.company}`} />
          <ScreenField
            label="Why it ranks"
            value="Strong aspiration fit for internal tooling, systems influence, and platform-scale product work."
            multiline
          />
          <ScreenField
            label="Connection path"
            value="Trusted contact can give candidate-side context after the first note is ready."
            multiline
          />
          <ScreenCallout
            title="Review before promotion"
            body="Keep the ranking explanation candidate-side and specific. The handoff should only move once the narrative is strong enough to support an application."
            tone="warning"
          />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ScreenTag label="Ready to apply" tone="warning" />
            <ScreenTag label="Candidate-side help stays private" tone="skill" />
          </div>
          <ScreenField label="Lead" value={`${activeLead.role} · ${activeLead.company}`} />
          <ScreenField label="Resume variant" value="Platform systems / internal tooling" />
          <ScreenField
            label="Application story"
            value="Lead with design-systems depth, platform influence, and the candidate-experience work that ties ranking, messaging, and handoff together."
            multiline
          />
          <ScreenField
            label="Private context"
            value="Use the trusted contact for candidate-side context only if the intro note still reads sharp after one more pass."
            multiline
          />
        </div>
      )}
    </ScreenDialog>
  );
}

function LeadsDesktopContent({
  state,
  modalMode,
  observabilityMode,
}: {
  state: LeadsScreenState;
  modalMode: LeadsScreenModalMode;
  observabilityMode: LeadsScreenObservabilityMode;
}) {
  const { T } = useTheme();
  const isModal = state === "modal";

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", background: T.bg, position: "relative" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16, opacity: isModal ? 0.46 : 1, filter: isModal ? "blur(1px)" : "none", transition: "opacity 0.16s ease" }}>
        <LeadsHeader state={state} />
        <ExtractionPanel state={state} />
        <Toolbar state={state} />
        <MetricStrip state={state} />
        {observabilityMode === "proposal" && <LeadsObservabilityModule state={state} />}
        {state === "filter_empty" && (
          <ScreenCallout
            title="No results match the current filters"
            body="Ranking remains available, but the current filter set is hiding the collection."
            tone="info"
            action={<ScreenButton label="Clear filters" kind="secondary" compact />}
          />
        )}
        {state === "no_leads_imported" && (
          <ScreenCallout
            title="Import a lead to unlock ranking"
            body="The collection is empty, so ranking language and apply handoff have nothing to work from yet."
            tone="warning"
            action={<ScreenButton label="Import a lead" kind="secondary" compact />}
          />
        )}
        <RankedCollection state={state} />
      </div>

      {isModal && (
        <div style={{ position: "absolute", inset: 0, background: `${T.bg}AA`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ModalOverlay mode={modalMode} />
        </div>
      )}
    </div>
  );
}

function LeadsMobileContent({
  state,
  modalMode,
  observabilityMode,
}: {
  state: LeadsScreenState;
  modalMode: LeadsScreenModalMode;
  observabilityMode: LeadsScreenObservabilityMode;
}) {
  const { T } = useTheme();
  const isModal = state === "modal";

  return (
    <div style={{ position: "relative", width: 390 }}>
      <div style={{ opacity: isModal ? 0.42 : 1, filter: isModal ? "blur(1px)" : "none", transition: "opacity 0.16s ease" }}>
        <LeadsPhoneFrame routeLabel="/leads" title="Leads">
          <LeadsHeader state={state} mobile />
          <ExtractionPanel state={state} />
          <Toolbar state={state} mobile />
          <MetricStrip state={state} mobile />
          {observabilityMode === "proposal" && <LeadsObservabilityModule state={state} mobile />}
          {state === "filter_empty" && (
            <ScreenCallout
              title="No results match"
              body="Clear the active filters to bring the ranked cards back."
              tone="info"
            />
          )}
          {state === "no_leads_imported" && (
            <ScreenCallout
              title="No leads imported yet"
              body="Import the first lead to unlock ranking and handoff."
              tone="warning"
            />
          )}
          <RankedCollectionMobile state={state} />
        </LeadsPhoneFrame>
      </div>

      {isModal && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: `${T.bg}B8`, borderRadius: 28 }}>
          <ModalOverlay mode={modalMode} />
        </div>
      )}
    </div>
  );
}

export function LeadsScreen({
  state = "ranked",
  modalMode = "lead-review",
  mobile = false,
  observabilityMode = "current",
}: {
  state?: LeadsScreenState;
  modalMode?: LeadsScreenModalMode;
  mobile?: boolean;
  observabilityMode?: LeadsScreenObservabilityMode;
}) {
  return mobile
    ? <LeadsMobileContent state={state} modalMode={modalMode} observabilityMode={observabilityMode} />
    : <LeadsDesktopContent state={state} modalMode={modalMode} observabilityMode={observabilityMode} />;
}
