import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenPanel,
  ScreenTag,
} from "./flagship-primitives";

export type WorkspaceCompareScreenState = "populated" | "identical" | "warning" | "mutation";

function VersionCard({
  label,
  note,
  selected = false,
}: {
  label: string;
  note: string;
  selected?: boolean;
}) {
  const { T } = useTheme();
  return (
    <div style={{ padding: "14px 16px", background: T.base, border: `1px solid ${selected ? T.aStroke : T.s1}`, borderRadius: T.r3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{label}</p>
        <ScreenButton label={`Restore ${label}`} kind="secondary" compact />
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 8px" }}>{note}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ScreenTag label="Rich text" tone="skill" />
        <ScreenTag label="Compare target" tone={selected ? "accent" : "neutral"} />
      </div>
    </div>
  );
}

function DiffLine({
  tone,
  text,
}: {
  tone: "success" | "error" | "neutral";
  text: string;
}) {
  const { T } = useTheme();
  const bg = tone === "success" ? T.succDim : tone === "error" ? T.errDim : T.base;
  const border = tone === "success" ? `${T.success}44` : tone === "error" ? `${T.error}44` : T.s1;
  const color = tone === "success" ? T.success : tone === "error" ? T.error : T.t1;
  const prefix = tone === "success" ? "+" : tone === "error" ? "-" : " ";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, padding: "10px 12px", background: bg, borderBottom: `1px solid ${border}` }}>
      <span style={{ fontFamily: T.fontMono, fontSize: 11, color }}>{prefix}</span>
      <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

export function WorkspaceCompareScreen({
  state = "populated",
}: {
  state?: WorkspaceCompareScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const identical = state === "identical";
  const warning = state === "warning";
  const mutation = state === "mutation";

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>WORKSPACE / COMPARE</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Compare saved versions</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 760 }}>
              This route keeps version summaries, diff-mode warnings, and restore actions together so the operator can inspect evidence drift before restoring an older state.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={identical ? "Identical state" : warning ? "Warning state" : mutation ? "Restore mutation" : "Diff visible"} tone={warning || mutation ? "warning" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Back to detail" kind="ghost" />
              <ScreenButton label="Restore v7" kind="secondary" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenButton label="Back to detail" kind="ghost" compact />
          <ScreenTag label="/workspace/:id/compare" tone="neutral" />
          <ScreenTag label="Versioned evidence" tone="skill" />
        </div>

        {warning ? (
          <ScreenCallout
            title="You have view-only access to this document. Restoring versions is disabled."
            body="The compare route should keep the diff visible, but restoration stays blocked for viewer access."
            tone="warning"
          />
        ) : identical ? (
          <ScreenCallout
            title="Both versions are identical - no differences found."
            body="The quiet compare state is still a useful outcome. Keep version framing and restore controls visible around the identical result."
            tone="info"
          />
        ) : mutation ? (
          <ScreenCallout
            title="Restore is a named mutation"
            body="Restoration should keep both version labels visible and make it obvious which snapshot becomes current."
            tone="warning"
          />
        ) : (
          <ScreenCallout
            title="Rich-text formatting is not shown in diff view. Comparing plain-text content only."
            body="Diff-mode warnings should be explicit about what the operator is and is not seeing."
            tone="info"
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          <VersionCard label="v8" note="Current draft with tightened systems narrative and portfolio evidence." selected />
          <VersionCard label="v7" note="Previous draft before the last rewrite pass and imported-source cleanup." />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <div style={{ padding: "12px 14px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
            <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 22, color: T.success, margin: "0 0 4px" }}>{identical ? "0" : "5"}</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Added</p>
          </div>
          <div style={{ padding: "12px 14px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
            <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 22, color: T.error, margin: "0 0 4px" }}>{identical ? "0" : "3"}</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Removed</p>
          </div>
          <div style={{ padding: "12px 14px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
            <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 22, color: T.info, margin: "0 0 4px" }}>{identical ? "0" : "2"}</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Changed blocks</p>
          </div>
          <div style={{ padding: "12px 14px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
            <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 22, color: T.skill, margin: "0 0 4px" }}>{warning ? "Viewer" : "Editable"}</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Restore mode</p>
          </div>
        </div>

        <ScreenPanel kicker="Diff paper" title={identical ? "No differences found" : "Scroll compare view"}>
          {identical ? (
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
              Cell-doc and rich-text compare routes should still tell the operator when two versions are functionally identical.
            </p>
          ) : (
            <div style={{ border: `1px solid ${T.s1}`, borderRadius: T.r2, overflow: "hidden" }}>
              <DiffLine tone="neutral" text="Scaled a design-system migration across MUI shells and candidate-facing workspace routes." />
              <DiffLine tone="error" text="Managed component library refresh across multiple releases with strong attention to system quality." />
              <DiffLine tone="success" text="Turned a mixed MUI shell into a reusable pattern layer without losing feature ownership boundaries." />
              <DiffLine tone="neutral" text="Kept profile, aspiration, and application surfaces legible while adding workspace evidence and operator-commanded agent flows." />
              <DiffLine tone="success" text="Linked the strongest portfolio evidence directly under the systems paragraph." />
            </div>
          )}
        </ScreenPanel>
      </div>

      {mutation && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Restore version"
            subtitle="Restoring a saved version should keep both source snapshots visible and make the consequence explicit."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Restoring..." tone="warning" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenCallout
                title="Restore v7 as the current version"
                body="The route should make it obvious that the current draft changes while prior snapshots remain part of the evidence trail."
                tone="warning"
              />
              <div style={{ display: "grid", gap: 10 }}>
                <VersionCard label="Current · v8" note="Tighter systems narrative with recent portfolio proof." selected />
                <VersionCard label="Restore target · v7" note="Earlier draft with broader architecture framing." />
              </div>
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
