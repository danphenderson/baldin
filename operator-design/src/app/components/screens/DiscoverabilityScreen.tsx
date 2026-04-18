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

export type DiscoverabilityScreenState = "visible" | "hidden" | "saving_toggle" | "error_feedback";

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
  const tabs = ["Dashboard", "Network", "Profile", "Settings"] as const;

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

function TogglePreview({
  enabled,
  saving = false,
}: {
  enabled: boolean;
  saving?: boolean;
}) {
  const { T } = useTheme();
  return (
    <div style={{ width: 54, height: 30, borderRadius: T.rFull, background: enabled ? T.accentDim : T.s0, border: `1px solid ${enabled ? T.aStroke : T.s1}`, display: "flex", alignItems: "center", justifyContent: enabled ? "flex-end" : "flex-start", padding: 3, transition: "all 0.16s" }}>
      <div style={{ width: 22, height: 22, borderRadius: T.rFull, background: enabled ? T.accent : T.t2, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: saving ? T.shadowAccent : "none" }}>
        {saving ? <div style={{ width: 7, height: 7, borderRadius: T.rFull, background: T.bg }} /> : null}
      </div>
    </div>
  );
}

function SettingsDesktopContent({ state }: { state: DiscoverabilityScreenState }) {
  const { T } = useTheme();
  const isVisible = state === "visible" || state === "saving_toggle" || state === "error_feedback";
  const isSaving = state === "saving_toggle";
  const isError = state === "error_feedback";

  return (
    <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>FLAGSHIP · NETWORK TRUST</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Discoverability</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 650 }}>
            Control whether you appear in discover. The default is hidden. Visibility should be a deliberate choice, not a permanent public posture.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <ScreenBadge label={isSaving ? "Saving toggle" : isError ? "Inline error" : isVisible ? "Visible by choice" : "Hidden by default"} tone={isSaving || isError ? "warning" : isVisible ? "accent" : "neutral"} />
          <div style={{ display: "flex", gap: 8 }}>
            <ScreenButton label={isVisible ? "Turn off visibility" : "Turn on visibility"} tone={isVisible ? "warning" : "accent"} />
            <ScreenButton label="Preview profile" kind="secondary" />
          </div>
        </div>
      </div>

      <ScreenCallout
        title={isVisible ? "You are visible on purpose" : "You are hidden from general discover"}
        body={
          isVisible
            ? "People can find you in discover when your profile fits their current search context. Reachability still stays private and request-based."
            : "Your profile is off the general discover surface. Existing connections still work, and superusers can remain intentionally reachable through limited paths."
        }
        tone={isVisible ? "info" : "warning"}
        action={<ScreenButton label="Review trust posture" kind="secondary" compact />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        <ScreenMetric label="Default state" value="Hidden" tone="neutral" note="Privacy comes first" />
        <ScreenMetric label="Current state" value={isVisible ? "Visible" : "Hidden"} tone={isVisible ? "accent" : "warning"} note="Visibility should stay intentional" />
        <ScreenMetric label="Superuser path" value="Limited" tone="warning" note="Reachable without becoming broadly public" />
        <ScreenMetric label="Trust cues" value="Private" tone="skill" note="No public observability bands or exact counts" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 16, alignItems: "start" }}>
        <ScreenPanel kicker="Primary control" title="Show me in discover">
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 16px", background: T.base, border: `1px solid ${isVisible ? T.aStroke : T.s1}`, borderRadius: T.r2 }}>
              <div>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{isVisible ? "Visible by choice" : "Hidden by default"}</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                  {isVisible
                    ? "Your profile may appear in discover when it is a strong, deliberate fit."
                    : "Your profile stays off the broad discover surface until you explicitly turn visibility on."}
                </p>
              </div>
              <TogglePreview enabled={isVisible} saving={isSaving} />
            </div>

            {isSaving && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: T.warnDim, border: `1px solid ${T.warning}44`, borderRadius: T.r2 }}>
                <div style={{ width: 7, height: 7, borderRadius: T.rFull, background: T.warning }} />
                <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.warning }}>Saving discoverability…</span>
              </div>
            )}

            {isError && (
              <div style={{ padding: "10px 12px", background: T.errDim, border: `1px solid ${T.error}44`, borderLeft: `2px solid ${T.error}`, borderRadius: T.r2 }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 14, color: T.error, margin: "0 0 3px", letterSpacing: "-0.01em" }}>Could not update discoverability</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>The setting did not save. Your profile remains visible by choice until the next successful update.</p>
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>What changes</p>
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    isVisible ? "You may appear in targeted discover results." : "You stay off the general discover surface.",
                    "Requests still require a person-specific note.",
                    "Existing connections and direct messages continue to work normally.",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.accent, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScreenPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScreenPanel kicker="Reachability rules" title="Superusers stay intentional">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, padding: "12px 14px" }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Limited superuser path</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 10px" }}>
                  Even when you are hidden, certain trusted operators can remain intentionally reachable if that setting stays enabled. This is not a broad public surface.
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <ScreenTag label="Superuser reachable" tone="warning" />
                  <ScreenTag label="Still private" tone="skill" />
                </div>
              </div>
            </div>
          </ScreenPanel>

          <ScreenPanel kicker="Preview" title="How your posture reads">
            <div style={{ background: T.base, border: `1px solid ${isVisible ? T.aStroke : T.s1}`, borderRadius: T.r2, padding: "14px 15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Jordan Kim</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>Operator systems · design systems · calm product workflows</p>
                </div>
                <ScreenBadge label={isVisible ? "Visible by choice" : "Hidden"} tone={isVisible ? "accent" : "neutral"} />
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 10px" }}>
                {isVisible
                  ? "Shown only when someone’s search context and trust posture align with your profile."
                  : "Unavailable in general discover. Existing trusted paths still remain private and deliberate."}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <ScreenTag label="No bulk connect" tone="neutral" />
                <ScreenTag label="Request-based" tone="info" />
              </div>
            </div>
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

function SettingsMobileContent({ state }: { state: DiscoverabilityScreenState }) {
  const { T } = useTheme();
  const isVisible = state === "visible" || state === "saving_toggle" || state === "error_feedback";
  const isSaving = state === "saving_toggle";
  const isError = state === "error_feedback";

  return (
    <MobileFrame routeLabel="/settings/discoverability" title="Discoverability" activeTab="Settings">
      <ScreenBadge label={isSaving ? "Saving toggle" : isError ? "Inline error" : isVisible ? "Visible by choice" : "Hidden by default"} tone={isSaving || isError ? "warning" : isVisible ? "accent" : "neutral"} />

      <ScreenCallout
        title={isVisible ? "Visible on purpose" : "Hidden from general discover"}
        body={isVisible ? "You can be found when the fit is specific." : "The default stays private until you choose otherwise."}
        tone={isVisible ? "info" : "warning"}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ScreenMetric label="Current" value={isVisible ? "Visible" : "Hidden"} tone={isVisible ? "accent" : "warning"} />
        <ScreenMetric label="Trust" value="Private" tone="skill" />
      </div>

      <ScreenPanel kicker="Toggle" title="Show me in discover">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 16px", background: T.base, border: `1px solid ${isVisible ? T.aStroke : T.s1}`, borderRadius: T.r2 }}>
          <div>
            <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{isVisible ? "Visible by choice" : "Hidden by default"}</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>{isVisible ? "Discoverable when the fit is specific." : "Off the broad discover surface."}</p>
          </div>
          <TogglePreview enabled={isVisible} saving={isSaving} />
        </div>
        {isError && <ScreenCallout title="Could not update discoverability" body="The setting did not save. Try again." tone="error" />}
      </ScreenPanel>
    </MobileFrame>
  );
}

export function DiscoverabilityScreen({
  state = "hidden",
  mobile = false,
}: {
  state?: DiscoverabilityScreenState;
  mobile?: boolean;
}) {
  if (mobile) {
    return <SettingsMobileContent state={state} />;
  }

  return <SettingsDesktopContent state={state} />;
}
