import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenPanel,
  ScreenTag,
} from "./flagship-primitives";

export type WorkspaceDetailScreenState = "populated" | "quiet" | "warning" | "mutation";

type ActivityItem = {
  id: string;
  message: string;
  actor: string;
  note: string;
  badge?: string;
};

const ACTIVITY: ActivityItem[] = [
  {
    id: "a-1",
    message: "Saved version 8 after trimming the systems summary",
    actor: "Jordan Kim",
    note: "2h ago",
    badge: "v8",
  },
  {
    id: "a-2",
    message: "Granted viewer access for portfolio review",
    actor: "Jordan Kim",
    note: "Yesterday",
    badge: "Viewer access",
  },
  {
    id: "a-3",
    message: "Imported original PDF source",
    actor: "Workspace Import",
    note: "Apr 16",
    badge: "PDF Import",
  },
];

const VERSIONS = [
  { id: "v8", label: "v8", summary: "Tightened systems positioning and linked final portfolio proof.", note: "2h ago" },
  { id: "v7", label: "v7", summary: "Expanded collaboration scope and architecture narrative.", note: "Yesterday" },
  { id: "v6", label: "v6", summary: "First imported-source rewrite from the original PDF.", note: "Apr 16" },
];

function MetaStat({ label, value }: { label: string; value: string }) {
  const { T } = useTheme();
  return (
    <div style={{ padding: "10px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, margin: 0 }}>{value}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "grid", gap: 6, padding: "12px 0", borderBottom: `1px solid ${T.s0}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{item.message}</p>
        {item.badge && <ScreenTag label={item.badge} tone="info" />}
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
        {item.actor} · {item.note}
      </p>
    </div>
  );
}

function VersionRow({ id, label, summary, note }: { id: string; label: string; summary: string; note: string }) {
  const { T } = useTheme();
  return (
    <div key={id} style={{ padding: "12px 0", borderBottom: `1px solid ${T.s0}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{label}</p>
          <ScreenTag label="Compare" tone="skill" />
        </div>
        <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{note}</span>
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 8px" }}>{summary}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <ScreenButton label="Preview" kind="secondary" compact />
        <ScreenButton label="Compare" kind="ghost" compact />
      </div>
    </div>
  );
}

export function WorkspaceDetailScreen({
  state = "populated",
}: {
  state?: WorkspaceDetailScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const quiet = state === "quiet";
  const warning = state === "warning";
  const mutation = state === "mutation";

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>WORKSPACE / DETAIL</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {warning ? "Document not found" : "Platform Resume / Systems v8"}
            </h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 720 }}>
              {warning
                ? "The shipped route falls back to a back button and alert when the record is missing. Operator-design preserves that narrow error posture instead of inventing a rich empty shell."
                : "This route keeps the evidence header, imported-source provenance, activity history, and version history together so the operator can inspect a record before editing or comparing it."}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge
              label={warning ? "Warning state" : quiet ? "Quiet history" : mutation ? "Mutation state" : "Populated evidence"}
              tone={warning || mutation ? "warning" : quiet ? "info" : "accent"}
            />
            {!warning && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <ScreenButton label="Edit" />
                <ScreenButton label="Share" kind="secondary" />
                <ScreenButton label="Original PDF" kind="ghost" />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenButton label="Back to workspace" kind="ghost" compact />
          {!warning && (
            <>
              <ScreenTag label="Resume" tone="info" />
              <ScreenTag label="Active" tone="accent" />
              <ScreenTag label="PDF Import" tone="info" />
              <ScreenTag label="Shared · Editor" tone="info" />
            </>
          )}
        </div>

        {warning ? (
          <ScreenCallout
            title="Document not found"
            body="Keep the failure direct. The real route shows only a back button and alert when the record cannot load."
            tone="error"
            action={<ScreenButton label="Back to workspace" kind="secondary" compact />}
          />
        ) : quiet ? (
          <ScreenCallout
            title="No document activity recorded yet"
            body="Quiet history should still keep the shared context, imported source, and version structure visible. The absence of recent activity is not a broken route."
            tone="info"
          />
        ) : mutation ? (
          <ScreenCallout
            title="Share and delete remain explicit"
            body="The detail view owns sharing, archiving, pinning, and deletion. Mutation handling should stay deliberate and preserve the evidence context behind the dialog."
            tone="warning"
          />
        ) : (
          <ScreenCallout
            title="Imported from PDF: platform-resume-v7.pdf"
            body="The original upload remains available from this document for local-first review and export."
            tone="info"
            action={<ScreenButton label="Open original PDF" kind="secondary" compact />}
          />
        )}

        {!warning && (
          <>
            <ScreenPanel kicker="Header paper" title="Document summary" aside={<ScreenBadge label="Owner actions visible" tone="neutral" />}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
                <MetaStat label="Version" value="v8" />
                <MetaStat label="Updated" value="Today · 2h ago" />
                <MetaStat label="Shared by" value="Jordan Kim" />
                <MetaStat label="Access" value="Editor" />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScreenButton label="Share" kind="secondary" compact />
                <ScreenButton label="Pin" kind="ghost" compact />
                <ScreenButton label="Archive" kind="ghost" compact />
                <ScreenButton label="Delete" kind="ghost" tone="error" compact />
              </div>
            </ScreenPanel>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.86fr)", gap: 16, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 16 }}>
                <ScreenPanel kicker="Shared context" title="Owner, grant, and imported source">
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ padding: "11px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Owner</p>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: "0 0 2px" }}>Jordan Kim</p>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: 0 }}>Access granted Apr 16 · Access updated Today</p>
                    </div>
                    <div style={{ padding: "11px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Imported source</p>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: "0 0 2px" }}>Original PDF: platform-resume-v7.pdf</p>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: 0 }}>The imported file stays attached so compare and review routes never lose the originating artifact.</p>
                    </div>
                  </div>
                </ScreenPanel>

                <ScreenPanel kicker="Activity History" title={quiet ? "No document activity recorded yet." : "Recent activity"}>
                  {quiet ? (
                    <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                      The route keeps the history section visible even when no events have been recorded yet.
                    </p>
                  ) : (
                    <div style={{ display: "grid" }}>
                      {ACTIVITY.map((item) => (
                        <ActivityRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </ScreenPanel>
              </div>

              <ScreenPanel kicker="Version History" title={quiet ? "No versions recorded yet." : "Saved versions"}>
                {quiet ? (
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                    The quiet state preserves the section framing and keeps compare as the next logical route once versions exist.
                  </p>
                ) : (
                  <div style={{ display: "grid" }}>
                    {VERSIONS.map((version) => (
                      <VersionRow key={version.id} {...version} />
                    ))}
                  </div>
                )}
              </ScreenPanel>
            </div>
          </>
        )}
      </div>

      {mutation && !warning && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Share document"
            subtitle="Sharing stays tied to the current evidence record, the access level, and the imported-source history."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Send invite" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ padding: "11px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Document</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: 0 }}>Platform Resume / Systems v8</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "11px 12px", background: T.base, border: `1px solid ${T.aStroke}`, borderRadius: T.r2 }}>
                  <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Invitee</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: 0 }}>maya@figma.com</p>
                </div>
                <div style={{ padding: "11px 12px", background: T.base, border: `1px solid ${T.aStroke}`, borderRadius: T.r2 }}>
                  <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Access</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: 0 }}>Viewer</p>
                </div>
              </div>
              <ScreenCallout
                title="Delete uses the same deliberate framing"
                body="Deletion should keep the document name visible and make it obvious that every saved version disappears with the record."
                tone="error"
              />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
