import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenField,
  ScreenPanel,
  ScreenTag,
} from "./flagship-primitives";

export type WorkspaceEditorScreenState = "create" | "edit" | "warning" | "mutation";

const VERSION_NOTES = [
  { id: "v8", label: "v8", note: "Current draft" },
  { id: "v7", label: "v7", note: "Expanded architecture narrative" },
  { id: "v6", label: "v6", note: "Imported-source baseline" },
];

function EditorSurface({ warning = false }: { warning?: boolean }) {
  const { T } = useTheme();
  return (
    <div style={{ minHeight: 360, padding: "18px 18px 22px", background: T.base, border: `1px solid ${warning ? `${T.warning}44` : T.s1}`, borderRadius: T.r3 }}>
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 20, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Platform systems work that scaled cleanly without flattening the candidate story.
          </p>
          <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.75, margin: 0 }}>
            Reframed the resume around reusable system decisions, operating constraints, and the portfolio evidence that best supports a platform-facing job search.
          </p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ padding: "11px 12px", borderRadius: T.r2, background: T.raised, border: `1px solid ${T.s0}` }}>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>Body block</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>
              Capture the strongest evidence first. Keep the draft readable enough for human editing even when agent task suggestions are attached.
            </p>
          </div>
          <div style={{ padding: "11px 12px", borderRadius: T.r2, background: T.raised, border: `1px solid ${T.s0}` }}>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>Evidence note</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>
              Imported PDF provenance, shared-access warnings, and version history should remain visible around the editor rather than hidden behind an agent surface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceEditorScreen({
  state = "create",
}: {
  state?: WorkspaceEditorScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const create = state === "create";
  const edit = state === "edit";
  const warning = state === "warning";
  const mutation = state === "mutation";

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>WORKSPACE / EDITOR</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              {create ? "Create workspace document" : "Edit workspace document"}
            </h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 760 }}>
              {create
                ? "The create route starts with a blank editor scaffold, typed metadata, and a sticky footer. There is no decorative empty state, only the first useful drafting surface."
                : "The edit route adds imported-source provenance, shared-access boundaries, version history, and optional agent-task cues around the same core editor scaffold."}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={create ? "Create state" : edit ? "Edit state" : warning ? "Warning state" : "Mutation state"} tone={warning || mutation ? "warning" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Back" kind="ghost" />
              <ScreenButton label={create ? "Create" : "Save Version"} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ScreenButton label="Back to workspace" kind="ghost" compact />
          {!create && <ScreenTag label="Imported from PDF" tone="info" />}
          {!create && <ScreenTag label="Shared · Editor" tone="info" />}
          {!create && <ScreenTag label="Rich text" tone="skill" />}
        </div>

        {warning ? (
          <ScreenCallout
            title="You have view-only access to this document."
            body="The shipped editor still renders the scaffold underneath a warning. Operator-design preserves that tension instead of inventing a separate blocking route."
            tone="warning"
          />
        ) : mutation ? (
          <ScreenCallout
            title="Agent task and save states are inline, not detached"
            body="Running, preview-ready, applied, dismissed, and failed task states should stay visible next to the edit surface and sticky footer."
            tone="warning"
          />
        ) : edit ? (
          <ScreenCallout
            title="This document was imported from the PDF platform-resume-v7.pdf."
            body="The original upload is available from the document detail page, and shared access stays visible while the operator edits the current version."
            tone="info"
          />
        ) : (
          <ScreenCallout
            title="Blank create is already the real surface"
            body="Creation starts with title, kind, content type, and the editor body. No illustration or onboarding layer is needed before the operator can type."
            tone="info"
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 0.8fr)", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <ScreenPanel kicker="Editor header" title={create ? "Document metadata" : "Document metadata and draft context"}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
                <ScreenField label="Title" value={create ? "Untitled resume draft" : "Platform Resume / Systems v8"} />
                <ScreenField label="Kind" value={create ? "Resume" : "Resume"} />
                <ScreenField label="Content type" value={create ? "Rich text" : "Rich text"} />
                <ScreenField label="Format" value={create ? "Editable draft" : "Versioned draft"} />
              </div>
              {!create && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ padding: "11px 12px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                    <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>Shared access</p>
                    <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t0, margin: "0 0 2px" }}>Shared access · Editor</p>
                    <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: 0 }}>Collaborative editing active - changes sync in real time as Jordan Kim.</p>
                  </div>
                </div>
              )}
            </ScreenPanel>

            <ScreenPanel kicker="Editor canvas" title={create ? "Blank draft surface" : "Current draft"}>
              <EditorSurface warning={warning} />
            </ScreenPanel>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {!create && (
              <ScreenPanel kicker="Version History" title="Sticky version sidebar">
                <div style={{ display: "grid" }}>
                  {VERSION_NOTES.map((item) => (
                    <div key={item.id} style={{ padding: "12px 0", borderBottom: `1px solid ${T.s0}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{item.label}</p>
                        <ScreenButton label="Load version" kind="ghost" compact />
                      </div>
                      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{item.note}</p>
                    </div>
                  ))}
                </div>
              </ScreenPanel>
            )}

            <ScreenPanel kicker="Sticky footer" title={create ? "Create flow" : "Save Version flow"}>
              <div style={{ display: "grid", gap: 10 }}>
                <ScreenField label={create ? "Footer action" : "Change summary (optional)"} value={create ? "Create" : "Tightened systems proof and reduced duplicate bullets."} multiline={!create} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenButton label="Cancel" kind="ghost" compact />
                  <ScreenButton label={create ? "Create" : warning ? "Save disabled" : mutation ? "Saving..." : "Save Version"} compact />
                </div>
              </div>
            </ScreenPanel>

            {!create && (
              <ScreenPanel kicker="Inline agent task" title="Task status stays local to the editor">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <ScreenTag label={mutation ? "Running" : "Preview ready"} tone={mutation ? "warning" : "info"} />
                  <ScreenTag label="Applied" tone="success" />
                  <ScreenTag label="Dismissed" tone="neutral" />
                  <ScreenTag label="Failed" tone="error" />
                </div>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                  Agent tasks should suggest draft changes without replacing the surrounding provenance, version, or access context.
                </p>
              </ScreenPanel>
            )}
          </div>
        </div>
      </div>

      {mutation && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Agent task running"
            subtitle="Keep running, preview-ready, applied, dismissed, and failed states attached to the same draft the operator is editing."
            footer={(
              <>
                <ScreenButton label="Dismiss" kind="ghost" />
                <ScreenButton label="Running..." tone="warning" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="Task" value="Rewrite the summary for a staff-level platform role and keep the imported-source proof intact." multiline />
              <ScreenCallout
                title="Preview ready, applied, dismissed, and failed are sibling states"
                body="The route should never imply that a running agent replaces the editor. Suggestions are scoped to the same local draft."
                tone="info"
              />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
