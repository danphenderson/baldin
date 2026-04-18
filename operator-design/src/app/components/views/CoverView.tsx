import { useTheme } from "../ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// Cover · handoff intro — BALDIN OPERATOR v2.1
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    n:    "01",
    id:   "foundations",
    name: "Foundations",
    desc: "The DNA of the system. Color ramps, type scale, spacing, elevation model, motion rules, status language, and responsive breakpoints. Start here.",
    tags: ["Color", "Type", "Space", "Motion", "Status", "Responsive"],
  },
  {
    n:    "02",
    id:   "library",
    name: "Component Library",
    desc: "Every reusable primitive with annotated states. Rail, Command Bar, Summary Band, Table, Dialogs, Forms, and Empty / Loading / Error patterns.",
    tags: ["Rail", "Table", "Dialogs", "Forms", "States"],
  },
  {
    n:    "03",
    id:   "screens",
    name: "Route Specimens",
    desc: "State-complete identity, decision-loop, private-messaging, network-trust, workspace-evidence, and automation specimens. Mobile pairing is explicit only where the flagship contract requires it.",
    tags: ["Identity", "Ranking", "Messaging", "Network", "Automation"],
  },
  {
    n:    "04",
    id:   "guide",
    name: "Style Guide",
    desc: "Design rules and language for builders. How layouts are structured, how status is expressed, how typography is applied in context. Written for designers.",
    tags: ["Wayfinding", "Patterns", "Rules", "Language"],
  },
  {
    n:    "05",
    id:   "appendix",
    name: "Engineering Appendix",
    desc: "Token maps, type maps, route coverage, and component↔design term mapping. Written for engineers. Do not use component names in design documents.",
    tags: ["Tokens", "TypeMap", "Routes", "Handoff"],
  },
];

const READING_GUIDE = [
  {
    color: "#339cff",
    dim:   "rgba(51,156,255,0.10)",
    label: "Design rule",
    desc:  "Blue accent marks a confirmed design decision. These apply immediately and must be followed in implementation.",
  },
  {
    color: "#e8a020",
    dim:   "rgba(232,160,32,0.10)",
    label: "Proposal cue",
    desc:  "Amber marks unshipped, confidence-scoped, privacy-bounded proposal treatment. Do not read it as live product behavior.",
  },
  {
    color: "#ad7bf9",
    dim:   "rgba(173,123,249,0.10)",
    label: "Skill / capability",
    desc:  "Purple is reserved exclusively for skill and capability labeling throughout the product and this document.",
  },
];

interface CoverViewProps {
  onNavigate: (id: string) => void;
}

export function CoverView({ onNavigate }: CoverViewProps) {
  const { T, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* ── Identity block ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 64, paddingBottom: 40, borderBottom: `1px solid ${T.s1}` }}>

        {/* Logotype row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: T.r3, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: T.shadowAccent }}>
            <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 20, color: "#fff" }}>B</span>
          </div>
          <div>
            <p style={{ fontFamily: T.fontMono, fontWeight: 800, fontSize: 28, color: T.t0, margin: 0, letterSpacing: "-0.03em" }}>Baldin</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.accent, margin: 0, letterSpacing: "0.08em" }}>OPERATOR direction</p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2, margin: "0 0 2px", letterSpacing: "0.04em" }}>// OPERATOR v2.1 contract · dark + light</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2, margin: 0, letterSpacing: "0.04em" }}>v2.1 · April 2026 · code-first handoff</p>
          </div>
        </div>

        {/* Display heading */}
        <h1 style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 60, color: T.t0, margin: "0 0 12px", letterSpacing: "-0.03em", lineHeight: 1 }}>
          Design<br />
          <span style={{ color: T.accent }}>System</span>
        </h1>

        <p style={{ fontFamily: T.fontBody, fontSize: 16, color: T.t1, maxWidth: 520, lineHeight: 1.7, margin: "0 0 28px" }}>
          A command-center design language for Baldin&apos;s local-first job-search OS. Today it serves a private career control plane for direction, ranked leads, applications, deliberate network reachability, private messaging as the shipped human loop, user-owned workspace evidence, and operator-commanded automation. The target direction remains applicant-side observability, but that layer stays guarded, confidence-scoped, and secondary to the shipped private workflow. This document is a handoff artifact, not a marketing brochure. It is written for builders, not buyers.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
          {[
            ["Today", "Private local-first workspace where direction comes before tracking and private messaging carries the shipped human loop: profile, aspirations, ranked leads, applications, network trust, workspace evidence, and deliberate automation."],
            ["Target", "Applicant-side observability later, but only as a guarded layer after trust rules, provenance, and evidence quality are ready."],
            ["Trust model", "Opt-in discovery, request-based reachability, and confidence-scoped proposal cues instead of public counts, shared market truth, or feed mechanics."],
          ].map(([label, body]) => (
            <div key={label} style={{ padding: "14px 16px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3 }}>
              <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.08em", margin: "0 0 6px", textTransform: "uppercase" }}>{label}</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0, lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>

        {/* Key facts strip */}
        <div style={{ display: "flex", gap: 0, background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden" }}>
          {[
            ["Direction",  "OPERATOR"                    ],
            ["Theme",      "OPERATOR v2.1"               ],
            ["Variants",   "Dark + Light"                ],
            ["Accent",     "#339cff · Signal blue"       ],
            ["Typefaces",  "Space Grotesk · Source Sans 3 · JetBrains Mono"],
            ["Contrast",   "60 (dark) · 45 (light)"      ],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{ flex: 1, padding: "12px 16px", borderRight: i < arr.length - 1 ? `1px solid ${T.s1}` : "none" }}>
              <p style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.t2, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.09em" }}>{k}</p>
              <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.t0, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section map ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 64 }}>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 20px" }}>// document map · 5 sections</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SECTIONS.map(({ n, id, name, desc, tags }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                padding: "20px 22px",
                background: T.raised,
                border: `1px solid ${T.s1}`,
                borderRadius: T.r3,
                textAlign: "left",
                cursor: "pointer",
                transition: "border-color 0.1s, background 0.1s",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = T.aStroke;
                (e.currentTarget as HTMLButtonElement).style.background = T.accentDim;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = T.s1;
                (e.currentTarget as HTMLButtonElement).style.background = T.raised;
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.06em" }}>// {n}</span>
                <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke={T.t2} strokeWidth={1.5} strokeLinecap="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 17, color: T.t0, margin: "0 0 6px", letterSpacing: "-0.01em" }}>{name}</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, margin: 0, lineHeight: 1.6 }}>{desc}</p>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {tags.map(tag => (
                  <span key={tag} style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, background: T.s0, borderRadius: T.r1, padding: "2px 7px" }}>{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── How to read ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 64 }}>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>// how to read this document</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {READING_GUIDE.map(({ color, dim, label, desc }) => (
            <div key={label} style={{ padding: "16px", background: dim, borderLeft: `2px solid ${color}`, borderRadius: T.r2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12, color }}>{label}</span>
              </div>
              <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Principles ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${T.s1}`, paddingTop: 32 }}>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 16px" }}>// five character tenets</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {[
            ["#", "Near-void substrate",   "Surfaces start at #181818. Not black, not gray. The void carries the data."],
            ["~", "Signal is earned",       "#339cff only. Every blue pixel means interactive. Decoration earns nothing."],
            [">", "Three roles, one hierarchy", "Space Grotesk establishes orientation, Source Sans 3 carries narrative reading, and JetBrains Mono keeps data chrome legible."],
            ["_", "The operator owns the loop", "The center of gravity is the user's profile, aspirations, ranked leads, applications, follow-up, workspace evidence, workflows, agents, and deliberate network context. The product works for one operator today; any later shared-signal layer stays secondary to the private workspace."],
            ["$", "Momentum over theater",  "120ms ceiling. Next actions, stale follow-up, and confidence-scoped workflow state stay legible. The product serves the search, not vanity metrics, social-feed theater, or decorative dashboards."],
          ].map(([glyph, title, body]) => (
            <div key={title as string} style={{ padding: "14px 16px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3 }}>
              <span style={{ fontFamily: T.fontMono, fontWeight: 800, fontSize: 18, color: T.accent, display: "block", marginBottom: 6 }}>{glyph}</span>
              <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11.5, color: T.t0, display: "block", marginBottom: 6, letterSpacing: "-0.01em" }}>{title}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2, lineHeight: 1.55, display: "block" }}>{body}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
