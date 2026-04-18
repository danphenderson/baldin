import type { ReactNode } from "react";
import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenMetric,
  ScreenPanel,
  ScreenSearch,
  ScreenTag,
} from "./flagship-primitives";

export type ConnectionsScreenState = "populated" | "empty" | "filter_empty" | "mutation";

type ConnectionTone = "success" | "warning" | "info" | "neutral";

type ConnectionRecord = {
  id: string;
  name: string;
  role: string;
  company: string;
  status: string;
  tone: ConnectionTone;
  note: string;
  inbound?: boolean;
  mutationLabel?: string;
};

const PENDING_CONNECTIONS: ConnectionRecord[] = [
  {
    id: "linh-tran",
    name: "Linh Tran",
    role: "Staff Product Designer",
    company: "Rippling",
    status: "Needs review",
    tone: "warning",
    inbound: true,
    note: "Opened with a precise question about permission-heavy admin flows.",
  },
  {
    id: "omar-shaikh",
    name: "Omar Shaikh",
    role: "Platform Engineering Lead",
    company: "Vercel",
    status: "Request sent",
    tone: "info",
    note: "Outbound request anchored in internal tooling and platform workflow design.",
  },
];

const ACCEPTED_CONNECTIONS: ConnectionRecord[] = [
  {
    id: "marisol-vega",
    name: "Marisol Vega",
    role: "Operations Product Lead",
    company: "Notion",
    status: "Connected",
    tone: "success",
    note: "Comfortable discussing operator-facing product tradeoffs and deliberate targeting.",
  },
  {
    id: "cameron-li",
    name: "Cameron Li",
    role: "Design Systems Manager",
    company: "Figma",
    status: "Connected",
    tone: "success",
    note: "High signal for library governance, handoff, and calm internal surfaces.",
  },
  {
    id: "lea-morgan",
    name: "Lea Morgan",
    role: "Trust PM",
    company: "Plaid",
    status: "Connected",
    tone: "success",
    note: "Useful crossover on trust posture and message gating inside admin workflows.",
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
    <div style={{ padding: "5px 10px", borderRadius: T.rFull, background: active ? T.accentDim : T.base, border: `1px solid ${active ? T.aStroke : T.s1}` }}>
      <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: active ? T.accent : T.t1 }}>{label}</span>
    </div>
  );
}

function resolveTone(tone: ConnectionTone, T: ReturnType<typeof useTheme>["T"]) {
  switch (tone) {
    case "success":
      return { color: T.success, dim: T.succDim, border: `${T.success}44` };
    case "warning":
      return { color: T.warning, dim: T.warnDim, border: `${T.warning}44` };
    case "info":
      return { color: T.info, dim: T.infoDim, border: `${T.info}44` };
    default:
      return { color: T.t1, dim: T.s0, border: T.s1 };
  }
}

function ConnectionCard({
  item,
}: {
  item: ConnectionRecord;
}) {
  const { T } = useTheme();
  const palette = resolveTone(item.tone, T);

  return (
    <div style={{ background: T.base, border: `1px solid ${item.mutationLabel ? palette.border : T.s1}`, borderRadius: T.r2, padding: "13px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 3px", letterSpacing: "-0.01em" }}>{item.name}</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>{item.role} · {item.company}</p>
        </div>
        <ScreenBadge label={item.mutationLabel || item.status} tone={item.tone} />
      </div>

      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 12px" }}>{item.note}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {item.inbound ? (
          <>
            <ScreenButton label={item.mutationLabel === "Accepting…" ? "Accepting…" : "Accept"} compact tone="success" />
            <ScreenButton label={item.mutationLabel === "Declining…" ? "Declining…" : "Decline"} compact kind="ghost" tone="warning" />
          </>
        ) : item.status === "Request sent" ? (
          <>
            <ScreenButton label="View profile" compact kind="secondary" />
            <ScreenButton label={item.mutationLabel === "Declining…" ? "Declining…" : "Withdraw"} compact kind="ghost" tone="warning" />
          </>
        ) : (
          <>
            <ScreenButton label="Message" compact kind="secondary" />
            <ScreenButton label={item.mutationLabel === "Removing…" ? "Removing…" : "Remove"} compact kind="ghost" tone="warning" />
          </>
        )}
      </div>
    </div>
  );
}

function EmptyPanel({
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

function ConnectionsDesktopContent({ state }: { state: ConnectionsScreenState }) {
  const { T } = useTheme();
  const isEmpty = state === "empty";
  const isFilterEmpty = state === "filter_empty";
  const isMutation = state === "mutation";

  const pending = isMutation
    ? [
        { ...PENDING_CONNECTIONS[0], mutationLabel: "Accepting…" },
        { ...PENDING_CONNECTIONS[1], mutationLabel: "Declining…" },
      ]
    : PENDING_CONNECTIONS;

  const accepted = isMutation
    ? ACCEPTED_CONNECTIONS.map((item, index) => index === 2 ? { ...item, mutationLabel: "Removing…" } : item)
    : ACCEPTED_CONNECTIONS;

  return (
    <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · NETWORK TRUST</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Connections</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 640 }}>
            Track accepted relationships and pending decisions without turning the network into a feed. Every action stays private and person-specific.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge label={isMutation ? "Mutation state" : isEmpty ? "No connections yet" : isFilterEmpty ? "Filter empty" : "Mixed view"} tone={isMutation || isFilterEmpty ? "warning" : "accent"} />
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label="Open discover" />
            <ScreenButton label="Manage discoverability" kind="secondary" />
          </div>
        </div>
      </div>

      <ScreenCallout
        title={
          isEmpty
            ? "No accepted or pending relationships yet"
            : isFilterEmpty
              ? "The current filter set hides every relationship"
              : isMutation
                ? "Connection changes are applying privately"
                : "Accepted and pending states share one private control surface"
        }
        body={
          isEmpty
            ? "That is expected in a private-by-default network. Start from discover or make yourself visible on purpose before expecting inbound requests."
            : isFilterEmpty
              ? "Clear one filter or broaden the search posture to bring accepted or pending relationships back into view."
              : isMutation
                ? "Accept, decline, and remove all run through the same quiet mutation path. No public counters or visible social traces are created."
                : "This route keeps inbound decisions, outbound requests, and accepted contacts together so targeting stays deliberate instead of volume-driven."
        }
        tone={isEmpty ? "info" : isFilterEmpty || isMutation ? "warning" : "info"}
        action={<ScreenButton label={isFilterEmpty ? "Clear filters" : "Review rules"} kind="secondary" compact />}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ScreenSearch label="Search accepted or pending connections" />
        <FilterChip label="All" active={!isFilterEmpty} />
        <FilterChip label="Pending" active={isMutation} />
        <FilterChip label="Connected" active={!isEmpty && !isFilterEmpty} />
        <ScreenTag label="/network/connections" tone="neutral" />
        <ScreenTag label="Private actions" tone="skill" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <ScreenMetric label="Relationship mix" value={isEmpty ? "None" : "Mixed"} tone={isEmpty ? "warning" : "accent"} note="Pending and accepted stay in one view" />
        <ScreenMetric label="Pending lane" value={isEmpty ? "Quiet" : "Review"} tone={isEmpty ? "neutral" : "warning"} note="Inbound requests ask for explicit decisions" />
        <ScreenMetric label="Accepted lane" value={isEmpty ? "Ready" : "Open"} tone={isEmpty ? "neutral" : "success"} note="Direct messages stay private and one-to-one" />
        <ScreenMetric label="Trust cues" value="Private" tone="skill" note="No public leverage or social score bands" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel kicker="Pending" title="Requests that need attention">
            {isEmpty ? (
              <EmptyPanel
                title="No pending requests"
                body="Once you start using discover or turn on your own discoverability, targeted requests will appear here for review."
                buttonLabel="Open discover"
              />
            ) : isFilterEmpty ? (
              <EmptyPanel
                title="No pending matches"
                body="The active filters exclude both inbound and outbound requests."
                buttonLabel="Clear one filter"
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {pending.map((item) => (
                  <ConnectionCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </ScreenPanel>

          <ScreenPanel kicker="Accepted" title="People you can already message">
            {isEmpty ? (
              <EmptyPanel
                title="No accepted connections yet"
                body="Accepted relationships will stay here once a request lands well or someone accepts your note."
                buttonLabel="Review discoverability"
              />
            ) : isFilterEmpty ? (
              <EmptyPanel
                title="No accepted matches"
                body="Clear the current filters to bring accepted contacts back into the surface."
                buttonLabel="Reset filter"
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {accepted.map((item) => (
                  <ConnectionCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </ScreenPanel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel kicker="Ground rules" title="How connection control stays deliberate">
            <div style={{ display: "grid", gap: 8 }}>
              {[
                "Every relationship starts with a precise request rather than a bulk-connect action.",
                "Accepted relationships unlock direct messaging, but only in a private lane.",
                "Removing a connection is quiet and reversible through a fresh request later.",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.accent, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </ScreenPanel>

          <ScreenPanel kicker="Trust posture" title="No public leverage cues">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Qualitative only</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                  This surface avoids public counts, status ladders, or social observability. The signal is whether the relationship is accepted, pending, or intentionally closed.
                </p>
              </div>
              <ScreenButton label="Open discover rules" kind="secondary" compact />
            </div>
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

function ConnectionsMobileContent({ state }: { state: ConnectionsScreenState }) {
  const isEmpty = state === "empty";
  const isFilterEmpty = state === "filter_empty";
  const isMutation = state === "mutation";

  return (
    <MobileFrame routeLabel="/network/connections" title="Connections" activeTab="Network">
      <ScreenBadge label={isMutation ? "Mutation state" : isEmpty ? "No connections" : isFilterEmpty ? "Filter empty" : "Mixed view"} tone={isMutation || isFilterEmpty ? "warning" : "accent"} />

      <ScreenCallout
        title={isEmpty ? "No relationships yet" : isFilterEmpty ? "No filter matches" : "Private connection management"}
        body={
          isEmpty
            ? "Connections appear after a deliberate request lands."
            : isFilterEmpty
              ? "Clear one filter to see accepted or pending relationships again."
              : "Accepted and pending relationships stay in one quiet view."
        }
        tone={isFilterEmpty ? "warning" : "info"}
      />

      <ScreenSearch label="Search connections" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Pending" value={isEmpty ? "Quiet" : "Review"} tone={isEmpty ? "neutral" : "warning"} />
        <ScreenMetric label="Accepted" value={isEmpty ? "None" : "Open"} tone={isEmpty ? "neutral" : "success"} />
      </div>

      {!isEmpty && !isFilterEmpty && (
        <ScreenPanel kicker="Pending first" title="Requests">
          <div style={{ display: "grid", gap: 10 }}>
            {(isMutation ? [{ ...PENDING_CONNECTIONS[0], mutationLabel: "Accepting…" }] : [PENDING_CONNECTIONS[0]]).map((item) => (
              <ConnectionCard key={item.id} item={item} />
            ))}
          </div>
        </ScreenPanel>
      )}
    </MobileFrame>
  );
}

export function ConnectionsScreen({
  state = "populated",
  mobile = false,
}: {
  state?: ConnectionsScreenState;
  mobile?: boolean;
}) {
  if (mobile) {
    return <ConnectionsMobileContent state={state} />;
  }

  return <ConnectionsDesktopContent state={state} />;
}
