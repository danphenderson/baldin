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

export type WorkspaceListScreenState =
  | "populated_personal_collection"
  | "first_document_empty"
  | "shared_filter_quiet"
  | "upload_delete_mutation";

type Tone = "accent" | "success" | "warning" | "error" | "info" | "skill" | "neutral";

type WorkspaceCard = {
  id: string;
  title: string;
  kind: string;
  kindTone: Tone;
  status: string;
  statusTone: Tone;
  summary: string;
  note: string;
  pdfImport?: boolean;
  sharedRole?: "Viewer" | "Editor";
};

const PERSONAL_DOCS: WorkspaceCard[] = [
  {
    id: "w1",
    title: "Platform Resume / Systems v8",
    kind: "Resume",
    kindTone: "info",
    status: "Active",
    statusTone: "accent",
    summary: "Primary evidence set for platform-facing applications with recent proof points pulled forward.",
    note: "v8 · 18 min ago",
    pdfImport: true,
  },
  {
    id: "w2",
    title: "Stripe Onsite Brief",
    kind: "Cell Doc",
    kindTone: "skill",
    status: "Draft",
    statusTone: "neutral",
    summary: "Private working brief that ties interview prompts, source notes, and likely decision pressure into one packet.",
    note: "v12 · today",
  },
  {
    id: "w3",
    title: "Portfolio Evidence Map",
    kind: "Notes",
    kindTone: "accent",
    status: "Review",
    statusTone: "warning",
    summary: "Links shipped work, reusable systems decisions, and proof snippets before they get compressed into an application draft.",
    note: "v4 · yesterday",
  },
];

const SHARED_DOCS: WorkspaceCard[] = [
  {
    id: "s1",
    title: "Figma Narrative Draft",
    kind: "Cover Letter",
    kindTone: "accent",
    status: "Review",
    statusTone: "warning",
    summary: "Shared draft focused on systems leadership language and portfolio sequencing.",
    note: "v5 · 2h ago",
    sharedRole: "Viewer",
  },
  {
    id: "s2",
    title: "Platform Resume / Shared Packet",
    kind: "Resume",
    kindTone: "info",
    status: "Active",
    statusTone: "accent",
    summary: "Editable shared packet used to align proof points before a final private fork.",
    note: "v9 · yesterday",
    pdfImport: true,
    sharedRole: "Editor",
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

function WorkspaceCardTile({
  item,
  pendingDelete = false,
}: {
  item: WorkspaceCard;
  pendingDelete?: boolean;
}) {
  const { T } = useTheme();
  const tone = resolveTone(item.kindTone, T);

  return (
    <div style={{ padding: "16px 16px 14px", background: T.raised, border: `1px solid ${pendingDelete ? `${T.error}44` : T.s1}`, borderRadius: T.r3, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 16, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{item.title}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <ScreenTag label={item.kind} tone={item.kindTone} />
            <ScreenTag label={item.status} tone={item.statusTone} />
            {item.pdfImport && <ScreenTag label="PDF Import" tone="info" />}
            {item.sharedRole && <ScreenTag label={`Shared · ${item.sharedRole}`} tone="info" />}
            {pendingDelete && <ScreenTag label="Delete pending" tone="error" />}
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: T.r2, background: tone.dim, border: `1px solid ${tone.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: tone.color }}>{item.kind.slice(0, 3).toUpperCase()}</span>
        </div>
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.65, margin: 0 }}>{item.summary}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2 }}>{item.note}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <ScreenButton label="Open" kind="ghost" compact />
          <ScreenButton label={item.sharedRole === "Viewer" ? "View only" : "Edit"} kind="secondary" compact />
        </div>
      </div>
    </div>
  );
}

export function WorkspaceListScreen({
  state = "populated_personal_collection",
}: {
  state?: WorkspaceListScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const empty = state === "first_document_empty";
  const sharedQuiet = state === "shared_filter_quiet";
  const mutation = state === "upload_delete_mutation";
  const cards = sharedQuiet ? SHARED_DOCS : PERSONAL_DOCS;

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>WORKSPACE / LIST</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Evidence workspace</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 740 }}>
              User-owned documents, imported PDFs, and shared packets stay in one local-first collection so the operator can inspect provenance before editing, comparing, or handing anything to an agent.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={empty ? "First document" : sharedQuiet ? "Shared quiet" : mutation ? "Mutation state" : "Personal collection"} tone={sharedQuiet || mutation ? "warning" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Upload PDF" kind="secondary" tone="info" />
              <ScreenButton label="New document" />
            </div>
          </div>
        </div>

        {empty ? (
          <ScreenCallout
            title="No documents yet"
            body="Create your first document or import a PDF to start a versioned evidence trail. The first useful step is owned material, not a generic automation flow."
            tone="info"
          />
        ) : sharedQuiet ? (
          <ScreenCallout
            title="No matching documents"
            body="Shared documents appear only when another person grants access. Filtered quiet states should stay calm and operational rather than reading as a broken collection."
            tone="warning"
          />
        ) : mutation ? (
          <ScreenCallout
            title="Imports create inspectable source evidence before any rewrite happens"
            body="Uploading a PDF should show where the source file will live, which document kind it becomes, and how the import preserves an original artifact for later review."
            tone="warning"
          />
        ) : (
          <ScreenCallout
            title="Decision quality starts with material you can inspect"
            body="The workspace list should make provenance, status, and access level obvious at a glance so users can decide what is worth editing or comparing next."
            tone="info"
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <ScreenMetric label="Owned docs" value={empty ? "0" : "18"} tone={empty ? "neutral" : "accent"} note="Private drafts and working packets" />
          <ScreenMetric label="Shared with me" value={sharedQuiet ? "0" : "2"} tone={sharedQuiet ? "warning" : "info"} note="Viewer and editor grants stay explicit" />
          <ScreenMetric label="PDF imports" value={empty ? "0" : mutation ? "7" : "6"} tone="info" note={mutation ? "One import is currently running" : "Original source remains reachable"} />
          <ScreenMetric label="Ready to compare" value={empty ? "0" : "5"} tone="skill" note="Versioned evidence before editing" />
        </div>

        <ScreenPanel kicker="Collection controls" title={sharedQuiet ? "Shared with Me" : "My Documents"}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <ScreenTag label={`My Documents · ${empty ? "0" : "18"}`} tone={!sharedQuiet ? "accent" : "neutral"} />
                <ScreenTag label={`Shared with Me · ${sharedQuiet ? "0" : "2"}`} tone={sharedQuiet ? "accent" : "neutral"} />
                <ScreenSearch label={sharedQuiet ? "Search: narrative draft" : "Search documents"} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ScreenTag label="All kinds" tone="accent" />
                <ScreenTag label={sharedQuiet ? "Draft" : "Active"} tone={sharedQuiet ? "warning" : "info"} />
                <ScreenTag label="Sort · Updated" tone="neutral" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ScreenTag label="PDF Import" tone="info" />
              <ScreenTag label="Shared · Viewer" tone={sharedQuiet ? "info" : "neutral"} />
              <ScreenTag label="Shared · Editor" tone="neutral" />
              <ScreenTag label="Archived" tone="neutral" />
            </div>
          </div>
        </ScreenPanel>

        <ScreenPanel kicker="Card grid" title={empty ? "No documents yet" : sharedQuiet ? "No matching documents" : "Private working collection"}>
          {empty ? (
            <div style={{ padding: "30px 26px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 20, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.01em" }}>Create your first evidence record</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 14px" }}>
                The base personal empty state keeps a direct CTA and treats the workspace as useful from day one.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <ScreenButton label="New document" compact />
                <ScreenButton label="Upload PDF" kind="secondary" compact />
              </div>
            </div>
          ) : sharedQuiet ? (
            <div style={{ padding: "30px 26px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
              <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 20, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.01em" }}>No matching documents</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 14px" }}>
                Keep filtered quiet states explicit so they do not feel like load failures.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <ScreenButton label="Clear filters" compact />
                <ScreenButton label="Review my documents" kind="secondary" compact />
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
              {cards.map((item, index) => (
                <WorkspaceCardTile key={item.id} item={item} pendingDelete={mutation && index === cards.length - 1} />
              ))}
            </div>
          )}
        </ScreenPanel>
      </div>

      {mutation && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Upload PDF"
            subtitle="Import a source document into the workspace, keep the original PDF reachable, and name the resulting evidence record before any agent task runs."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Importing..." tone="warning" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="Source file" value="platform-onsite-evidence.pdf · 2.4 MB" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ScreenField label="Document kind" value="Resume" />
                <ScreenField label="Initial title" value="Platform Resume / Systems v9" />
              </div>
              <ScreenField
                label="Import note"
                value="Keep the imported PDF attached as an original source so later compare and detail routes can show provenance without guessing."
                multiline
              />
              <ScreenCallout
                title="Delete remains explicit"
                body="The collection also owns document deletion. Keep that path as a named confirm state because deleting a card removes every saved version in the local evidence trail."
                tone="error"
              />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
