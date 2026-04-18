import type { ReactNode } from "react";
import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenMetric,
  ScreenPanel,
  ScreenTag,
} from "./flagship-primitives";

export type NetworkProfileScreenState = "connectable" | "connected_message" | "locked_message_gate";

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

function GuidanceRow({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { T } = useTheme();
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${T.s0}` }}>
      <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

function MessagePreview() {
  const { T } = useTheme();
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>Latest exchange</p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2, margin: "2px 0 0" }}>Direct, private, and already accepted</p>
        </div>
        <ScreenTag label="Message open" tone="success" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ alignSelf: "flex-end", maxWidth: "82%", padding: "10px 12px", background: T.accentDim, border: `1px solid ${T.aStroke}`, borderRadius: `${T.r3}px ${T.r1}px ${T.r3}px ${T.r3}px` }}>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.55, margin: 0 }}>I’m mapping trust-heavy operator flows and your perspective looks unusually relevant. If you have fifteen minutes next week, I’d value your read.</p>
        </div>
        <div style={{ maxWidth: "82%", padding: "10px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: `${T.r1}px ${T.r3}px ${T.r3}px ${T.r3}px` }}>
          <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, lineHeight: 1.55, margin: "0 0 4px" }}>That framing works. Keep the ask specific and send the workflow examples when you are ready.</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2, margin: 0 }}>Priya · Yesterday</p>
        </div>
      </div>
    </div>
  );
}

function NetworkProfileDesktopContent({ state }: { state: NetworkProfileScreenState }) {
  const { T } = useTheme();
  const isConnectable = state === "connectable";
  const isConnected = state === "connected_message";
  const isLocked = state === "locked_message_gate";

  return (
    <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 68, height: 68, borderRadius: T.rFull, background: T.accentDim, border: `1px solid ${T.aStroke}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 18, color: T.accent }}>PS</span>
          </div>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · NETWORK TRUST</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Priya Shah</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, margin: "0 0 8px", lineHeight: 1.6 }}>Trust Platform PM · Plaid · Visible on purpose for specific product-platform conversations</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <ScreenTag label="Trust systems" tone="warning" />
              <ScreenTag label="Product platform" tone="accent" />
              <ScreenTag label="Private reachability" tone="skill" />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge label={isConnected ? "Connected" : isLocked ? "Message gate" : "Connectable"} tone={isConnected ? "success" : isLocked ? "warning" : "accent"} />
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label={isConnected ? "Continue message" : "Request connection"} tone={isConnected ? "success" : "accent"} />
            <ScreenButton label="Back to discover" kind="secondary" />
          </div>
        </div>
      </div>

      <ScreenCallout
        title={isConnected ? "Connection accepted and message lane open" : isLocked ? "Visible profile, but direct messages stay gated" : "This profile is open to a deliberate first request"}
        body={
          isConnected
            ? "You already have a private thread with Priya. Continue the conversation directly instead of sending another connection request."
            : isLocked
              ? "Priya is visible in discover, but inbox access opens only after a connection is accepted. Start with a concise request rather than a message."
              : "Priya keeps a limited discover surface on for trust and platform crossover conversations. Broad networking language will read badly here."
        }
        tone={isConnected ? "success" : isLocked ? "warning" : "info"}
        action={<ScreenButton label={isConnected ? "Open thread" : "Review connection note"} kind="secondary" compact />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <ScreenMetric label="Access" value={isConnected ? "Open" : isLocked ? "Gated" : "By request"} tone={isConnected ? "success" : isLocked ? "warning" : "accent"} note="No broadcasted inbox state" />
        <ScreenMetric label="Trust posture" value="Private" tone="skill" note="Qualitative cues instead of public leverage bands" />
        <ScreenMetric label="Context fit" value="Strong" tone="info" note="Shared trust and operator workflow language" />
        <ScreenMetric label="Reachability" value="Deliberate" tone="warning" note="Concrete asks travel better than generic networking" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "start" }}>
        <ScreenPanel kicker="Profile summary" title="Why this person matters">
          <div style={{ display: "grid", gap: 0 }}>
            <GuidanceRow title="Trust-heavy product systems" body="Priya works on surfaces where permission, review, and operator clarity matter more than public engagement." />
            <GuidanceRow title="Good crossover with Baldin’s network posture" body="The overlap is strongest on discoverability rules, selective messaging, and private workflow design." />
            <GuidanceRow title="Approach with a real problem statement" body="A short note tied to trust operations, internal tools, or deliberate targeting is much stronger than a generic intro ask." />
          </div>
        </ScreenPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel kicker="Suggested approach" title={isConnected ? "Continue the thread" : isLocked ? "Request first, message later" : "Make one precise ask"}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Connection posture</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                  {isConnected
                    ? "You have already cleared the trust gate. Keep the conversation narrow and useful."
                    : isLocked
                      ? "The profile is visible, but the message lane stays closed until a connection is accepted."
                      : "Priya is reachable because she explicitly allows precise discover requests, not because the route is generally public."}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Short intro", "Specific ask", "No bulk framing"].map((item) => (
                  <ScreenTag key={item} label={item} tone="neutral" />
                ))}
              </div>
            </div>
          </ScreenPanel>

          <ScreenPanel kicker={isConnected ? "Private thread" : "Message lane"} title={isConnected ? "Message preview" : isLocked ? "Inbox stays closed for now" : "What opens after connection"}>
            {isConnected ? (
              <MessagePreview />
            ) : isLocked ? (
              <div style={{ padding: "22px 20px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r2 }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Direct message gate is still locked</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: "0 0 12px" }}>
                  Send a deliberate connection request first. Messaging becomes available only after Priya accepts.
                </p>
                <ScreenButton label="Request connection" tone="warning" />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <GuidanceRow title="Lead with context" body="Reference the trust or operator problem you are exploring, not the fact that you want to grow your network." />
                <GuidanceRow title="Keep the ask contained" body="A short exchange, one document, or one workflow question is more credible than a broad request for time." />
              </div>
            )}
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

function NetworkProfileMobileContent({ state }: { state: NetworkProfileScreenState }) {
  const isConnected = state === "connected_message";
  const isLocked = state === "locked_message_gate";

  return (
    <MobileFrame routeLabel="/network/discover/priya-shah" title="Priya Shah" activeTab="Network">
      <ScreenBadge label={isConnected ? "Connected" : isLocked ? "Message gate" : "Connectable"} tone={isConnected ? "success" : isLocked ? "warning" : "accent"} />

      <ScreenCallout
        title={isConnected ? "Message lane open" : isLocked ? "Visible, but still gated" : "Reachable by request"}
        body={
          isConnected
            ? "You already have a private thread here."
            : isLocked
              ? "Direct messages open only after the connection is accepted."
              : "This profile is discoverable because visibility was turned on deliberately."
        }
        tone={isConnected ? "success" : isLocked ? "warning" : "info"}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Access" value={isConnected ? "Open" : isLocked ? "Gated" : "Request"} tone={isConnected ? "success" : isLocked ? "warning" : "accent"} />
        <ScreenMetric label="Trust" value="Private" tone="skill" />
      </div>

      <ScreenPanel kicker="Profile" title="Why Priya surfaced">
        <div style={{ display: "grid", gap: 10 }}>
          <GuidanceRow title="Trust systems crossover" body="Operator and trust workflows overlap cleanly here." />
          <GuidanceRow title="Approach deliberately" body="Use a short note with a real problem statement." />
        </div>
      </ScreenPanel>

      {isConnected && (
        <ScreenPanel kicker="Thread" title="Latest exchange">
          <MessagePreview />
        </ScreenPanel>
      )}
    </MobileFrame>
  );
}

export function NetworkProfileScreen({
  state = "connectable",
  mobile = false,
}: {
  state?: NetworkProfileScreenState;
  mobile?: boolean;
}) {
  if (mobile) {
    return <NetworkProfileMobileContent state={state} />;
  }

  return <NetworkProfileDesktopContent state={state} />;
}
