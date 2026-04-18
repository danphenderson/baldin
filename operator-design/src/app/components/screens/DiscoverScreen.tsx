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

export type DiscoverScreenState = "populated" | "superuser_empty" | "filter_empty" | "request_connection";

type DiscoverPerson = {
  id: string;
  name: string;
  role: string;
  company: string;
  summary: string;
  reachability: string;
  visibilityNote: string;
  isSuperuser?: boolean;
  tags: { label: string; tone: "accent" | "info" | "skill" | "warning" | "neutral" }[];
};

const DISCOVER_PEOPLE: DiscoverPerson[] = [
  {
    id: "maya-patel",
    name: "Maya Patel",
    role: "Platform Design Lead",
    company: "Linear",
    summary: "Shared operator-surface and internal-tooling context makes a concise introduction feel natural here.",
    reachability: "Prefers a short, specific note before accepting a new connection.",
    visibilityNote: "Visible by choice",
    tags: [
      { label: "Systems craft", tone: "skill" },
      { label: "Operator tooling", tone: "info" },
    ],
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    role: "Trust Platform PM",
    company: "Plaid",
    summary: "Strong crossover on trust posture, private workflows, and deliberate network use inside product operations.",
    reachability: "Open to targeted requests tied to real platform or trust questions.",
    visibilityNote: "Visible by choice",
    tags: [
      { label: "Trust systems", tone: "warning" },
      { label: "Product platform", tone: "accent" },
    ],
  },
  {
    id: "leo-hernandez",
    name: "Leo Hernandez",
    role: "Design Systems Staff IC",
    company: "Figma",
    summary: "Surface fit is high when the ask is about reusable UI systems rather than a generic networking request.",
    reachability: "Best for a precise note about systems governance or library migration work.",
    visibilityNote: "Visible by choice",
    tags: [
      { label: "Design systems", tone: "skill" },
      { label: "Deliberate intros", tone: "neutral" },
    ],
  },
  {
    id: "sana-rahman",
    name: "Sana Rahman",
    role: "Operations Engineering Lead",
    company: "Notion",
    summary: "Good fit for questions where operational clarity and human-centered product systems intersect.",
    reachability: "Responds best to notes that explain the exact conversation you want to have.",
    visibilityNote: "Superuser reachable",
    isSuperuser: true,
    tags: [
      { label: "Superuser path", tone: "warning" },
      { label: "Ops systems", tone: "info" },
    ],
  },
];

function MobileFrame({
  routeLabel,
  title,
  activeTab,
  children,
}: {
  routeLabel: string;
  title: string;
  activeTab: string;
  children: ReactNode;
}) {
  const { T } = useTheme();
  const tabs = ["Dashboard", "Network", "Messages", "Settings"] as const;

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
          const isActive = tab === activeTab;
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

function DiscoverCard({
  person,
  requestInFlight = false,
}: {
  person: DiscoverPerson;
  requestInFlight?: boolean;
}) {
  const { T } = useTheme();

  return (
    <div style={{ background: T.base, border: `1px solid ${requestInFlight ? T.aStroke : T.s1}`, borderRadius: T.r2, padding: "14px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: T.rFull, background: person.isSuperuser ? T.warnDim : T.accentDim, border: `1px solid ${person.isSuperuser ? `${T.warning}44` : T.aStroke}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: person.isSuperuser ? T.warning : T.accent }}>{person.name.split(" ").map((part) => part[0]).join("")}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 3px", letterSpacing: "-0.01em" }}>{person.name}</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>{person.role} · {person.company}</p>
          </div>
        </div>
        <ScreenBadge label={person.visibilityNote} tone={person.isSuperuser ? "warning" : "accent"} />
      </div>

      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>{person.summary}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2, lineHeight: 1.55, margin: "0 0 12px" }}>{person.reachability}</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {person.tags.map((tag) => (
          <ScreenTag key={tag.label} label={tag.label} tone={tag.tone} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <ScreenButton label="View profile" kind="secondary" compact />
        <ScreenButton label={requestInFlight ? "Requesting…" : "Request connection"} compact tone={requestInFlight ? "warning" : "accent"} />
      </div>
    </div>
  );
}

function QuietState({
  title,
  body,
  buttonLabel,
}: {
  title: string;
  body: string;
  buttonLabel: string;
}) {
  const { T } = useTheme();

  return (
    <div style={{ padding: "28px 24px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65, margin: "0 0 14px" }}>{body}</p>
      <ScreenButton label={buttonLabel} />
    </div>
  );
}

function DiscoverDesktopContent({ state }: { state: DiscoverScreenState }) {
  const { T } = useTheme();
  const isSuperuserEmpty = state === "superuser_empty";
  const isFilterEmpty = state === "filter_empty";
  const isRequestConnection = state === "request_connection";
  const visiblePeople = DISCOVER_PEOPLE.filter((person) => !person.isSuperuser);
  const superusers = DISCOVER_PEOPLE.filter((person) => person.isSuperuser);

  return (
    <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · NETWORK TRUST</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Discover</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 620 }}>
            Find people who are visible on purpose through a small, private surface. Discovery stays low-volume and shaped around deliberate targeting.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge
            label={isRequestConnection ? "Request in flight" : isSuperuserEmpty ? "Quiet surface" : isFilterEmpty ? "Filter empty" : "Curated discover"}
            tone={isRequestConnection || isFilterEmpty ? "warning" : "accent"}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label="Review connections" kind="secondary" />
            <ScreenButton label="Adjust discoverability" />
          </div>
        </div>
      </div>

      <ScreenCallout
        title={
          isSuperuserEmpty
            ? "General discover is quiet right now"
            : isFilterEmpty
              ? "Current filters are narrower than the available surface"
              : isRequestConnection
                ? "Connection requests stay private and one-to-one"
                : "Visible on purpose, not broadly broadcast"
        }
        body={
          isSuperuserEmpty
            ? "Most people stay hidden by default. When the broad discover surface is empty, superusers who remain intentionally reachable can still be found through precise search."
            : isFilterEmpty
              ? "Keep the targeting deliberate, but clear one constraint if you want to see people who are already visible by choice."
              : isRequestConnection
                ? "A request sends only to the person you target. There is no bulk-connect flow and no broadcasted activity trail."
                : "Baldin surfaces a limited set of people whose visibility settings, role fit, and private trust posture align with your current search direction."
        }
        tone={isFilterEmpty || isRequestConnection ? "warning" : "info"}
        action={<ScreenButton label={isFilterEmpty ? "Clear filters" : "Open discoverability"} kind="secondary" compact />}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ScreenSearch label="Search trust, platform, or operator profiles" />
        <FilterChip label="Visible by choice" active={!isSuperuserEmpty} />
        <FilterChip label="Superuser reachable" active={isSuperuserEmpty} />
        <FilterChip label="Trust crossover" active={!isFilterEmpty} />
        <ScreenTag label="/network/discover" tone="neutral" />
        <ScreenTag label="No broadcasted activity" tone="skill" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <ScreenMetric label="Discover surface" value={isSuperuserEmpty ? "Quiet" : "Visible"} tone={isSuperuserEmpty ? "warning" : "accent"} note="Limited, intentional people-first discovery" />
        <ScreenMetric label="Request mode" value="Targeted" tone="info" note="Each connection starts with a specific reason" />
        <ScreenMetric label="Trust cues" value="Private" tone="skill" note="Qualitative posture over public counts" />
        <ScreenMetric label="Superuser path" value="Reachable" tone="warning" note="Still deliberate and invite-like" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16, alignItems: "start" }}>
        <ScreenPanel kicker="Curated surface" title={isSuperuserEmpty ? "No broadly visible matches" : isFilterEmpty ? "No current filter matches" : "Discover grid"}>
          {isSuperuserEmpty ? (
            <QuietState
              title="Nothing broad is visible right now"
              body="That is normal. Discover remains quiet unless someone has intentionally opened a private discover surface."
              buttonLabel="Review search posture"
            />
          ) : isFilterEmpty ? (
            <QuietState
              title="No people match this filter set"
              body="The current combination is stricter than the available discover surface. Clear one chip or broaden the role focus."
              buttonLabel="Clear one filter"
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {visiblePeople.map((person, index) => (
                <DiscoverCard key={person.id} person={person} requestInFlight={isRequestConnection && index === 0} />
              ))}
            </div>
          )}
        </ScreenPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel kicker="Targeted reachability" title={isSuperuserEmpty ? "Superusers remain intentionally reachable" : "How discover stays deliberate"}>
            <div style={{ display: "grid", gap: 10 }}>
              {(isSuperuserEmpty ? superusers : DISCOVER_PEOPLE.slice(1, 4)).map((person) => (
                <div key={person.id} style={{ background: T.base, border: `1px solid ${person.isSuperuser ? `${T.warning}33` : T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 3px", letterSpacing: "-0.01em" }}>{person.name}</p>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>{person.role} · {person.company}</p>
                    </div>
                    <ScreenTag label={person.visibilityNote} tone={person.isSuperuser ? "warning" : "accent"} />
                  </div>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 10px" }}>{person.reachability}</p>
                  <ScreenButton label="Open profile" kind="secondary" compact />
                </div>
              ))}
            </div>
          </ScreenPanel>

          <ScreenPanel kicker="Ground rules" title="Keep discovery human-scale">
            <div style={{ display: "grid", gap: 8 }}>
              {[
                "Visibility is opt-in and reversible.",
                "Trust posture stays qualitative and private.",
                "Superuser reachability is deliberate, not a bypass to spam.",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.accent, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

function DiscoverMobileContent({ state }: { state: DiscoverScreenState }) {
  const { T } = useTheme();
  const isSuperuserEmpty = state === "superuser_empty";
  const isFilterEmpty = state === "filter_empty";
  const isRequestConnection = state === "request_connection";
  const visiblePeople = DISCOVER_PEOPLE.filter((person) => !person.isSuperuser);

  return (
    <MobileFrame routeLabel="/network/discover" title="Discover" activeTab="Network">
      <ScreenBadge
        label={isRequestConnection ? "Request in flight" : isSuperuserEmpty ? "Quiet surface" : isFilterEmpty ? "Filter empty" : "Curated discover"}
        tone={isRequestConnection || isFilterEmpty ? "warning" : "accent"}
      />

      <ScreenCallout
        title={isSuperuserEmpty ? "General discover is quiet" : isFilterEmpty ? "No current matches" : "Visible on purpose"}
        body={
          isSuperuserEmpty
            ? "Most people stay hidden by default. Superusers can still stay intentionally reachable."
            : isFilterEmpty
              ? "Clear one filter to see people who are already visible by choice."
              : "This route stays private, small, and shaped around deliberate targeting."
        }
        tone={isFilterEmpty ? "warning" : "info"}
      />

      <ScreenSearch label="Search operator and trust profiles" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Surface" value={isSuperuserEmpty ? "Quiet" : "Visible"} tone={isSuperuserEmpty ? "warning" : "accent"} />
        <ScreenMetric label="Trust" value="Private" tone="skill" />
      </div>

      <ScreenPanel kicker="Discover" title={isSuperuserEmpty ? "Superuser-only reachability" : isFilterEmpty ? "Adjust filters" : "People surfaced for you"}>
        {isSuperuserEmpty ? (
          <QuietState
            title="No broad matches"
            body="Discover stays quiet until someone chooses to be visible."
            buttonLabel="Review discoverability"
          />
        ) : isFilterEmpty ? (
          <QuietState
            title="No filter matches"
            body="The current targeting is narrower than the available discover surface."
            buttonLabel="Clear one filter"
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {visiblePeople.slice(0, 2).map((person, index) => (
              <DiscoverCard key={person.id} person={person} requestInFlight={isRequestConnection && index === 0} />
            ))}
          </div>
        )}
      </ScreenPanel>
    </MobileFrame>
  );
}

export function DiscoverScreen({
  state = "populated",
  mobile = false,
}: {
  state?: DiscoverScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const requestTarget = DISCOVER_PEOPLE[0];

  if (mobile) {
    return (
      <div style={{ position: "relative" }}>
        <DiscoverMobileContent state={state} />
        {state === "request_connection" && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "rgba(5,10,18,0.52)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
            <ScreenDialog
              title="Request connection"
              subtitle="Lead with a concrete reason. Requests stay private and only reach the person you target."
              footer={(
                <>
                  <ScreenButton label="Cancel" kind="ghost" />
                  <ScreenButton label="Sending…" tone="warning" />
                </>
              )}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <ScreenField label="To" value={`${requestTarget.name} · ${requestTarget.role}`} />
                <ScreenField label="Connection note" value="I’m working on trust-heavy operator surfaces and would value your read on how product teams keep those interactions specific without making them noisy." multiline />
              </div>
            </ScreenDialog>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <DiscoverDesktopContent state={state} />
      {state === "request_connection" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Request connection"
            subtitle="Connection requests are private, one-to-one, and most useful when the note explains exactly why this person matters."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: T.rFull, background: T.warning }} />
                  <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>Mutation state</span>
                </div>
                <ScreenButton label="Sending request…" tone="warning" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="To" value={`${requestTarget.name} · ${requestTarget.role} · ${requestTarget.company}`} />
              <ScreenField label="Why this person" value={requestTarget.summary} multiline />
              <ScreenField label="Connection note" value="I’m exploring trust-heavy operator surfaces and your product-platform perspective feels unusually relevant. If you are open to it, I’d value a short exchange on how those workflows stay precise without becoming public-facing noise." multiline />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
