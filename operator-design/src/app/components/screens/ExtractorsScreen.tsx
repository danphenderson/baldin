import { useTheme } from "../ThemeContext";
import {
  ScreenBadge,
  ScreenButton,
  ScreenCallout,
  ScreenDialog,
  ScreenField,
  ScreenPanel,
  ScreenSearch,
  ScreenTag,
} from "./flagship-primitives";

export type ExtractorsScreenState = "populated" | "empty" | "warning" | "mutation";

const EXTRACTORS = [
  { id: "ext-1", name: "Resume Evidence Extractor", description: "Pulls structured role, skill, and proof blocks from uploaded resume files.", instruction: "Normalize career proof into reusable workspace sections.", review: "Enabled" },
  { id: "ext-2", name: "Interview Notes Extractor", description: "Converts messy meeting notes into follow-up cues and action items.", instruction: "Preserve uncertainty and flag missing evidence.", review: "Disabled" },
  { id: "ext-3", name: "Company Signal Extractor", description: "Extracts employer-specific context from saved research and public materials.", instruction: "Keep source links and strip speculative claims.", review: "Enabled" },
];

function ExtractorRow({
  name,
  description,
  instruction,
  active = false,
}: {
  name: string;
  description: string;
  instruction: string;
  active?: boolean;
}) {
  const { T } = useTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 14, padding: "12px 14px", background: active ? T.accentDim : T.base, borderBottom: `1px solid ${T.s0}` }}>
      <div>
        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{name}</p>
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{description}</p>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{instruction}</p>
    </div>
  );
}

export function ExtractorsScreen({
  state = "populated",
}: {
  state?: ExtractorsScreenState;
  mobile?: boolean;
}) {
  const { T } = useTheme();
  const empty = state === "empty";
  const warning = state === "warning";
  const mutation = state === "mutation";

  return (
    <div style={{ position: "relative", height: "100%", background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 6px", letterSpacing: "0.08em" }}>WORKFLOWS / EXTRACTORS</p>
            <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Extractor library</h1>
            <p style={{ fontFamily: T.fontBody, fontSize: 13.5, color: T.t1, lineHeight: 1.65, margin: 0, maxWidth: 760 }}>
              Extractors stay operational and review-aware. The route keeps instructions, schema, examples, version history, and run results visible without pretending extraction quality is magic.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <ScreenBadge label={empty ? "Grid empty" : warning ? "Warning state" : mutation ? "Mutation state" : "Populated"} tone={warning || mutation ? "warning" : "accent"} />
            <div style={{ display: "flex", gap: 8 }}>
              <ScreenButton label="Create Extractor" />
              <ScreenButton label="Run Extractor" kind="secondary" />
            </div>
          </div>
        </div>

        {warning ? (
          <ScreenCallout
            title="Content was too long and may have been truncated."
            body="Warnings and failures should stay visible near the result surface, not disappear into a generic global toast."
            tone="warning"
          />
        ) : empty ? (
          <ScreenCallout
            title="No extractors yet"
            body="The shipped route does not have a bespoke page-level empty illustration. Keep the create action and the grid shell visible even when the data set is empty."
            tone="info"
          />
        ) : mutation ? (
          <ScreenCallout
            title="Run and create stay modal"
            body="Running or creating an extractor should preserve the grid, details, and result context behind the dialog."
            tone="warning"
          />
        ) : (
          <ScreenCallout
            title="Require human review remains explicit"
            body="Version history, example creation, and run results should all reinforce that extraction output is inspectable and revisable."
            tone="info"
          />
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ScreenSearch label="Search extractors" />
          <ScreenTag label="Name" tone="neutral" />
          <ScreenTag label="Description" tone="neutral" />
          <ScreenTag label="Instruction" tone="neutral" />
          <ScreenTag label="Run result" tone="skill" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(340px, 0.95fr)", gap: 16, alignItems: "start" }}>
          <ScreenPanel kicker="Extractor table" title={empty ? "Empty grid shell" : "Available extractors"}>
            {empty ? (
              <div style={{ padding: "28px", background: T.base, border: `1px dashed ${T.s1}`, borderRadius: T.r3 }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: "0 0 8px", letterSpacing: "-0.01em" }}>No extractor rows yet</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "0 0 14px" }}>
                  The empty route still preserves the table frame and the Create Extractor action instead of swapping in a decorative blank state.
                </p>
                <ScreenButton label="Create Extractor" />
              </div>
            ) : (
              <div style={{ border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 14, padding: "10px 14px", background: T.raised, borderBottom: `1px solid ${T.s1}` }}>
                  {["Name", "Description", "Instruction"].map((label) => (
                    <span key={label} style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
                  ))}
                </div>
                {EXTRACTORS.map((item, index) => (
                  <ExtractorRow key={item.id} active={index === 0} {...item} />
                ))}
              </div>
            )}
          </ScreenPanel>

          <div style={{ display: "grid", gap: 16 }}>
            <ScreenPanel kicker="Extractor Details" title="Resume Evidence Extractor">
              <div style={{ display: "grid", gap: 10 }}>
                <ScreenField label="ID" value="ext-1" />
                <ScreenField label="Name" value="Resume Evidence Extractor" />
                <ScreenField label="Description" value="Pulls structured role, skill, and proof blocks from uploaded resume files." multiline />
                <ScreenField label="Instruction" value="Normalize career proof into reusable workspace sections." multiline />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ScreenTag label="Require human review" tone="warning" />
                  <ScreenTag label="Examples · 3" tone="info" />
                  <ScreenTag label="Json Schema" tone="skill" />
                </div>
                <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }}>
                  <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>Version History</p>
                  <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>
                    v12 · short hash 91a2 · today
                  </p>
                </div>
              </div>
            </ScreenPanel>

            <ScreenPanel kicker="Run Result" title={warning ? "Extraction completed (content was truncated)" : "Extraction completed"}>
              <div style={{ padding: "12px 14px", background: T.base, border: `1px solid ${warning ? `${T.warning}44` : T.s1}`, borderRadius: T.r2 }}>
                <pre style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t0, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{`{
  "skills": ["Design Systems", "Platform"],
  "proof_blocks": [
    "Turned a mixed MUI shell into a reusable pattern layer.",
    "Kept evidence and application drafting aligned."
  ]
}`}</pre>
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: "10px 0 0" }}>
                {warning ? "Truncation is visible in the result surface itself." : "No data returned is its own empty result state when the extractor succeeds without structured output."}
              </p>
            </ScreenPanel>
          </div>
        </div>
      </div>

      {mutation && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,18,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ScreenDialog
            title="Run Extractor"
            subtitle="The run modal keeps the instruction, sample input, and result framing visible without leaving the route."
            footer={(
              <>
                <ScreenButton label="Cancel" kind="ghost" />
                <ScreenButton label="Running..." tone="warning" />
              </>
            )}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <ScreenField label="Extractor" value="Resume Evidence Extractor" />
              <ScreenField label="Sample input" value="platform-resume-v7.pdf" />
              <ScreenCallout
                title="Create Extractor is a sibling mutation"
                body="Success and failure copy such as Example added, Human review enabled, or Failed to create extractor should stay local to this route family."
                tone="info"
              />
            </div>
          </ScreenDialog>
        </div>
      )}
    </div>
  );
}
