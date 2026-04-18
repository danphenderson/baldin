import { DARK, LIGHT } from "../op";
import { useTheme } from "../ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// Structural atoms — each calls useTheme() directly
// ─────────────────────────────────────────────────────────────────────────────
function Block({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  const { T } = useTheme();
  return (
    <div style={{ borderLeft: `2px solid ${accent ? T.aStroke : T.s1}`, paddingLeft: 20, marginBottom: 32 }}>
      {children}
    </div>
  );
}

function SectionHead({ n, title }: { n: string; title: string }) {
  const { T } = useTheme();
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.06em", margin: "0 0 6px" }}>// {n}</p>
      <h2 style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 22, color: T.t0, margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>{children}</p>;
}

function HR() {
  const { T } = useTheme();
  return <div style={{ height: 1, background: T.s0, margin: "56px 0" }} />;
}

function FrameTag({ text }: { text: string }) {
  const { T } = useTheme();
  return <p style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.t2, margin: "10px 0 0", letterSpacing: "0.04em" }}>// {text}</p>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 00 · Character
// ─────────────────────────────────────────────────────────────────────────────
function Character() {
  const { T } = useTheme();
  const tenets: [string, string, string][] = [
    ["#", "Near-void substrate",   "Surfaces begin at #181818 — not pure black, not gray. A neutral settled-dark that recedes completely behind content. The void is the canvas; only content illuminates it."],
    ["~", "Signal is earned",      "One accent across both themes: signal blue #339cff. It appears only on interactive intent — actions, active states, focus rings. Every blue pixel means something clickable."],
    [">", "Three roles, one hierarchy", "Space Grotesk sets orientation, Source Sans 3 carries narrative reading, and JetBrains Mono stays reserved for data chrome, labels, and status."],
    ["_", "Precision over polish", "Radii are 2–8px. Borders define depth; shadows appear only at Float and above. Every corner, stroke, and gap is a functional decision — not a styling one."],
    ["$", "The interface recedes", "Chrome is minimal and stable. Motion is sub-120ms and purposeful. When someone is working, they should feel the tool, not see it."],
  ];
  return (
    <div>
      <SectionHead n="00" title="Character" />
      <Block accent>
        <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, margin: "0 0 24px", lineHeight: 1.75, maxWidth: 560 }}>
          OPERATOR is a command-center design language for Baldin&apos;s local-first job-search OS. Not enterprise SaaS. Not a dashboard template. A precision instrument for one operator today, with room for later observability cues that stay proposal-labeled, provenance-aware, and privacy-bounded.
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {tenets.map(([glyph, title, body], i, arr) => (
            <div key={title} style={{ display: "grid", gridTemplateColumns: "28px 200px 1fr", gap: "0 20px", alignItems: "baseline", padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
              <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 15, color: T.accent }}>{glyph}</span>
              <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 13, color: T.t0 }}>{title}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.65 }}>{body}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 01 · Signal & Surface
// ─────────────────────────────────────────────────────────────────────────────
function SurfaceRamp({ theme, label, spec }: { theme: typeof DARK; label: string; spec: string }) {
  const { T } = useTheme();
  const swatches = [
    { name: "Void",    hex: theme.bg      },
    { name: "Shell",   hex: theme.base    },
    { name: "Surface", hex: theme.raised  },
    { name: "Float",   hex: theme.float   },
    { name: "Overlay", hex: theme.overlay },
  ];
  const roles = ["Page bg", "Nav / bars", "Cards", "Popovers", "Dialogs"];
  const isThemeDark = theme.t0 === "#ffffff";
  const inkFaint   = isThemeDark ? "rgba(255,255,255,0.28)" : "rgba(26,28,31,0.32)";
  const inkDefault = isThemeDark ? "rgba(255,255,255,0.54)" : "rgba(26,28,31,0.58)";
  const border     = isThemeDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";
  const rowDiv     = isThemeDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  return (
    <div style={{ flex: 1, background: theme.bg, border: `1px solid ${T.s1}`, borderRadius: T.r3, padding: "16px", overflow: "hidden" }}>
      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: theme.accent, letterSpacing: "0.06em", margin: "0 0 4px" }}>// {label}</p>
      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: inkFaint, margin: "0 0 14px" }}>{spec}</p>
      <div style={{ display: "flex", gap: 2, marginBottom: 12, alignItems: "flex-end" }}>
        {swatches.map(({ name, hex }, i) => (
          <div key={name} style={{ flex: 1, height: 32 + i * 10, background: hex, border: `1px solid ${border}`, borderRadius: 2 }} />
        ))}
      </div>
      {swatches.map(({ name, hex }, i) => (
        <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${rowDiv}` }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: theme.t0, fontWeight: 600 }}>{name}</span>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: inkFaint }}>{hex}</span>
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: inkFaint }}>{roles[i]}</span>
        </div>
      ))}
    </div>
  );
}

function ColorSystem() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead n="01" title="Signal & Surface" />

      {/* Theme variants */}
      <Block>
        <Label>Theme variants — dark + light · same accent across both</Label>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <SurfaceRamp theme={DARK}  label="dark"  spec="surface #181818 · ink #ffffff · contrast 60" />
          <SurfaceRamp theme={LIGHT} label="light" spec="surface #ffffff · ink #1a1c1f · contrast 45" />
        </div>
        <FrameTag text="operator-v2.1 / two variants / one accent" />
      </Block>

      {/* Signal */}
      <Block>
        <Label>Signal — Baldin blue · shared across both variants</Label>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: "0 0 200px", height: 80, background: T.bg, border: `1px solid ${T.aStroke}`, borderRadius: T.r3, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 16px", boxShadow: T.shadowAccent, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(51,156,255,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
            <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 22, color: T.accent, margin: "0 0 2px", letterSpacing: "-0.02em" }}>#339cff</p>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>HSL 210° 100% 60%</p>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { name: "Signal · Full",   bg: T.accent,    border: "none",                    fg: "#fff",    note: "Primary actions · active states"   },
              { name: "Signal · Subtle", bg: T.accentMid, border: `1px solid ${T.aStroke}`,  fg: T.accent,  note: "Active fill · selected bg"          },
              { name: "Signal · Tint",   bg: T.accentDim, border: `1px solid ${T.s1}`,       fg: T.accent,  note: "Hover · badge bg"                   },
            ].map(({ name, bg, border, fg, note }) => (
              <div key={name} style={{ height: 32, padding: "0 12px", background: bg, border, borderRadius: T.r2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11.5, color: fg }}>{name}</span>
                <span style={{ fontFamily: T.fontBody, fontSize: 11.5, color: fg === "#fff" ? "rgba(255,255,255,0.55)" : T.t2 }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
        <FrameTag text="signal / #339cff / earned-color rule" />
      </Block>

      {/* Semantic palette */}
      <Block>
        <Label>Semantic palette — OPERATOR semantic tones + current-workspace usage</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 110px 110px 80px 1fr", gap: "0 12px", padding: "4px 0 8px", borderBottom: `1px solid ${T.s1}` }}>
            {["Token", "Dark", "Light", "Source", "Usage in Baldin"].map(h => (
              <span key={h} style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
            ))}
          </div>
          {[
            { token: "success", dark: "#40c977", light: "#00a240", src: "diffAdded",   usage: "Ready · Applied · Complete · Connected"         },
            { token: "error",   dark: "#fa423e", light: "#ba2623", src: "diffRemoved", usage: "Rejected · Failed · Blocked · Expired"           },
            { token: "skill",   dark: "#ad7bf9", light: "#924ff7", src: "skill",       usage: "Skill badges · capability tags · AI score"       },
            { token: "warning", dark: "#e8a020", light: "#c47700", src: "derived",     usage: "Pending · Stalled · Follow-Up · Needs Review"    },
            { token: "info",    dark: "#339cff", light: "#339cff", src: "accent",      usage: "Ranked · In Progress · Scheduled · Tracking"     },
          ].map(({ token, dark, light, src, usage }, i, arr) => (
            <div key={token} style={{ display: "grid", gridTemplateColumns: "140px 110px 110px 80px 1fr", gap: "0 12px", alignItems: "center", padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: dark, flexShrink: 0 }} />
                <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12, color: dark }}>{token}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: dark, flexShrink: 0 }} />
                <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>{dark}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: light, border: `1px solid ${T.s1}`, flexShrink: 0 }} />
                <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>{light}</span>
              </div>
              <span style={{ fontFamily: T.fontMono, fontSize: 10, color: src === "derived" ? T.t2 : T.accent, background: src === "derived" ? "transparent" : T.accentDim, borderRadius: T.r1, padding: src === "derived" ? 0 : "1px 5px" }}>{src}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2 }}>{usage}</span>
            </div>
          ))}
        </div>
        <FrameTag text="semantic / 5 tones / operator contract + product usage" />
      </Block>

      {/* Text + stroke */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <Block>
          <Label>Text — dark / light ink</Label>
          {[
            { role: "Primary",   dark: "#ffffff",               light: "#1a1c1f",               note: "Headings · key values"   },
            { role: "Secondary", dark: "rgba(255,255,255,0.54)", light: "rgba(26,28,31,0.58)",   note: "Labels · metadata"       },
            { role: "Muted",     dark: "rgba(255,255,255,0.30)", light: "rgba(26,28,31,0.36)",   note: "Disabled · overlines"    },
          ].map(({ role, dark, light, note }, i, arr) => (
            <div key={role} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
              <div style={{ display: "flex", gap: 5, flex: "0 0 52px" }}>
                <div style={{ width: 18, height: 18, borderRadius: 2, background: "#181818", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 9, height: 2, background: dark, borderRadius: 1 }} />
                </div>
                <div style={{ width: 18, height: 18, borderRadius: 2, background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 9, height: 2, background: light, borderRadius: 1 }} />
                </div>
              </div>
              <span style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t0, flex: "0 0 72px" }}>{role}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.t2 }}>{note}</span>
            </div>
          ))}
        </Block>
        <Block>
          <Label>Stroke — contrast 60 (dark) / 45 (light)</Label>
          {[
            { name: "Faint",    dv: "rgba(255,255,255,0.05)", lv: "rgba(0,0,0,0.05)", note: "Row dividers"        },
            { name: "Default",  dv: "rgba(255,255,255,0.09)", lv: "rgba(0,0,0,0.10)", note: "Borders · inputs"    },
            { name: "Emphasis", dv: "rgba(255,255,255,0.15)", lv: "rgba(0,0,0,0.17)", note: "Active · focused"    },
            { name: "Signal",   dv: "rgba(51,156,255,0.32)",  lv: "rgba(51,156,255,0.40)", note: "Focus ring"     },
          ].map(({ name, dv, lv, note }, i, arr) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
              <div style={{ display: "flex", gap: 4, flex: "0 0 52px" }}>
                <div style={{ flex: 1, height: 18, background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: dv }} />
                </div>
                <div style={{ flex: 1, height: 18, background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 2, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: lv }} />
                </div>
              </div>
              <span style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t0, flex: "0 0 64px" }}>{name}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2 }}>{note}</span>
            </div>
          ))}
        </Block>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 02 · Typography
// ─────────────────────────────────────────────────────────────────────────────
function Typography() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead n="02" title="Typography" />
      <Block>
        <Label>Three-role contract — display, body, mono</Label>
        <div>
          <div style={{ paddingBottom: 24, borderBottom: `1px solid ${T.s1}`, marginBottom: 24 }}>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.06em", margin: "0 0 14px" }}>// Space Grotesk · display + headings · structural hierarchy</p>
            <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 48, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.03em", lineHeight: 1 }}>Command Center</p>
            <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 26, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Profile & Aspirations</p>
            <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 17, color: T.t0, margin: "0 0 16px", letterSpacing: "-0.015em" }}>Direction themes</p>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 30, color: T.accent, margin: "0 0 2px", letterSpacing: "-0.02em" }}>284</p>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>metric</p>
              </div>
              <div>
                <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 13, color: T.t0, margin: "0 0 2px" }}>Apr 17, 2026 · 09:41</p>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>timestamp</p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.success }} />
                  <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.success, margin: 0 }}>Active</p>
                </div>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>status label</p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.skill }} />
                  <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.skill, margin: 0 }}>TypeScript</p>
                </div>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>skill tag</p>
              </div>
              <div>
                <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>CURRENT FOCUS</p>
                <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: 0 }}>overline</p>
              </div>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.06em", margin: "0 0 14px" }}>// Source Sans 3 · reading surfaces · narrative + explanation</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.t0, lineHeight: 1.75, margin: "0 0 8px", maxWidth: 560 }}>This lead aligns with the user's design-systems aspiration set and already has a tailored resume draft in workspace.</p>
            <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: 0 }}>Prose only. Qualitative notes, descriptions, paragraph content.</p>
          </div>
        </div>
        <FrameTag text="type-roles / Space Grotesk · Source Sans 3 · JetBrains Mono" />
      </Block>

      <Block>
        <Label>Scale — 7 steps</Label>
        {[
          { role: "Display",  w: 700, sz: 52, sample: "OPERATOR",                                note: "Space Grotesk · hero moments"       },
          { role: "Heading",  w: 700, sz: 30, sample: "Profile & Aspirations",                    note: "Space Grotesk · route title"        },
          { role: "Title",    w: 600, sz: 22, sample: "Staff Product Designer",                   note: "Space Grotesk · entity title"       },
          { role: "Subtitle", w: 600, sz: 16, sample: "Workspace Comparison",                     note: "Space Grotesk · section heading"    },
          { role: "Body",     w: 400, sz: 14, sample: "Strong fit for platform and design-systems roles.", note: "Source Sans 3 · prose" },
          { role: "Label",    w: 500, sz: 12, sample: "Apr 12, 2026 · Fit: 92",                  note: "JetBrains Mono · data label"        },
          { role: "Overline", w: 700, sz: 10, sample: "CURRENT FOCUS",                            note: "JetBrains Mono · uppercase cue"     },
        ].map(({ role, w, sz, sample, note }, i, arr) => {
          const family = role === "Body"
            ? T.fontBody
            : role === "Display" || role === "Heading" || role === "Title" || role === "Subtitle"
              ? T.fontHead
              : T.fontMono;
          return (
            <div key={role} style={{ display: "grid", gridTemplateColumns: "80px 1fr 200px", gap: "0 16px", alignItems: "center", padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent }}>{role}</span>
              <span style={{ fontFamily: family, fontWeight: w, fontSize: Math.min(sz, 26), color: T.t0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: role === "Overline" ? "uppercase" : "none", letterSpacing: role === "Overline" ? "0.1em" : sz > 28 ? "-0.02em" : sz > 18 ? "-0.015em" : "0" }}>{sample}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2, textAlign: "right" }}>{note}</span>
            </div>
          );
        })}
        <FrameTag text="type-scale / 7 steps / display + body + mono" />
      </Block>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 03 · Space & Grid
// ─────────────────────────────────────────────────────────────────────────────
function SpaceGrid() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead n="03" title="Space & Grid" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <Block>
          <Label>Spacing — 4px base · 8 steps</Label>
          {[
            [4,  "Icon gap · tight padding"       ],
            [8,  "Button inner · row gap"          ],
            [12, "Chip padding · field label gap"  ],
            [16, "Dense card · form field gap"     ],
            [24, "Card padding"                    ],
            [32, "Section gap"                     ],
            [48, "Page section breathing"          ],
            [64, "Spacious layout (auth only)"     ],
          ].map(([px, label]) => (
            <div key={px} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2, flex: "0 0 22px" }}>{px}</span>
              <div style={{ width: Math.min((px as number) * 2.4, 140), height: 12, background: T.accentMid, borderLeft: `2px solid ${T.accent}`, flexShrink: 0 }} />
              <span style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2 }}>{label}</span>
            </div>
          ))}
          <FrameTag text="spacing / 4px base" />
        </Block>
        <Block>
          <Label>Grid — 12-column · 24px gutter</Label>
          <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 40, background: T.accentDim, border: `1px solid ${T.aStroke}`, borderRadius: 2, opacity: 0.7 }} />
            ))}
          </div>
          {[["Columns", "12"], ["Gutter", "24px"], ["Margin", "20px"], ["Max width", "1440px"], ["Rail", "56px collapsed"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.s0}` }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t2 }}>{k}</span>
              <span style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t0 }}>{v}</span>
            </div>
          ))}
          <FrameTag text="grid / 12-col / 24px gutter" />
        </Block>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 04 · Surfaces & Elevation
// ─────────────────────────────────────────────────────────────────────────────
function Surfaces() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead n="04" title="Surfaces & Elevation" />
      <Block>
        <Label>Elevation model — borders define depth · shadows only at Float+</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 20 }}>
          {[
            { name: "Void",    bg: T.bg,      bd: T.s0,    h: 48,  sh: "none"                         },
            { name: "Shell",   bg: T.base,    bd: T.s1,    h: 64,  sh: "none"                         },
            { name: "Surface", bg: T.raised,  bd: T.s1,    h: 80,  sh: "none"                         },
            { name: "Float",   bg: T.float,   bd: T.s2,    h: 96,  sh: T.shadow3.replace("0.80", "0.48") },
            { name: "Overlay", bg: T.overlay, bd: T.aStroke, h: 112, sh: T.shadow3               },
          ].map(({ name, bg, bd, h, sh }) => (
            <div key={name} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: h, background: bg, border: `1px solid ${bd}`, borderRadius: T.r3, boxShadow: sh, marginBottom: 8 }} />
              <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t1, margin: 0 }}>{name}</p>
            </div>
          ))}
        </div>
        <FrameTag text="elevation / 5 levels / border-defined" />
      </Block>

      {/* Backdrop glass */}
      <Block>
        <Label>Float + Overlay — opaqueWindows: false · backdrop-filter: blur(20px)</Label>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {[
            { level: "Float",   blur: "blur(20px)", bg: T.floatGlass,   bd: T.s2 },
            { level: "Overlay", blur: "blur(24px)", bg: T.overlayGlass, bd: T.aStroke },
          ].map(({ level, blur, bg, bd }) => (
            <div key={level} style={{ flex: 1, position: "relative", height: 80, borderRadius: T.r3, overflow: "hidden" }}>
              {/* Simulated content behind */}
              <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                <div style={{ flex: 1, background: T.accent, opacity: 0.4 }} />
                <div style={{ flex: 1, background: T.success, opacity: 0.3 }} />
                <div style={{ flex: 1, background: T.skill, opacity: 0.35 }} />
              </div>
              {/* Glass panel */}
              <div style={{ position: "absolute", inset: 8, background: bg, border: `1px solid ${bd}`, borderRadius: T.r2, backdropFilter: blur, WebkitBackdropFilter: blur, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 11, color: T.t0 }}>{level}</span>
                <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>{blur}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: "0 0 8px", lineHeight: 1.6 }}>
          The OPERATOR spec marks <code style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.accent, background: T.accentDim, borderRadius: T.r1, padding: "1px 5px" }}>opaqueWindows: false</code>. Float and Overlay surfaces use a semi-transparent background paired with <code style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.accent, background: T.accentDim, borderRadius: T.r1, padding: "1px 5px" }}>backdrop-filter: blur()</code> — content beneath shows through. Never use solid fills for dialogs or popovers.
        </p>
        <FrameTag text="glass / opaqueWindows: false / backdrop-filter" />
      </Block>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <Block>
          <Label>Radii — precision · 5 steps</Label>
          {[
            [2,    "XS",   "Tags · inline indicators"],
            [3,    "SM",   "Buttons · inputs · chips" ],
            [5,    "MD",   "Cards · panels"           ],
            [8,    "LG",   "Dialogs"                  ],
            [9999, "Full", "Avatars · status dots"    ],
          ].map(([r, name, usage]) => (
            <div key={name as string} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, background: T.accentDim, border: `1px solid ${T.aStroke}`, borderRadius: Math.min(r as number, 10), flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, margin: 0 }}>{name as string} · {r === 9999 ? "∞" : `${r}px`}</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2, margin: 0 }}>{usage as string}</p>
              </div>
            </div>
          ))}
          <FrameTag text="radii / 5 values" />
        </Block>
        <Block>
          <Label>Focus ring — Signal stroke + glow</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <div style={{ height: 34, background: T.bg, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center", padding: "0 12px" }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t2 }}>Input · default</span>
            </div>
            <div style={{ height: 34, background: T.bg, border: `1px solid ${T.aStroke}`, borderRadius: T.r2, display: "flex", alignItems: "center", padding: "0 12px", boxShadow: T.shadowAccent }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0 }}>Input · focus</span>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.accent, marginLeft: 1 }}>|</span>
            </div>
          </div>
          <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: "0 0 8px", lineHeight: 1.6 }}>Signal stroke at 32% (dark) / 40% (light) + subtle blue glow. Border only — no fill change on focus.</p>
          <FrameTag text="focus / signal-stroke / glow" />
        </Block>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 05 · Motion
// ─────────────────────────────────────────────────────────────────────────────
function Motion() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead n="05" title="Motion" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <Block>
          <Label>Command latency — 4 durations</Label>
          {[
            [60,  "Micro",    "Hover · icon state · dot pulse"    ],
            [100, "Fast",     "Button press · tab switch"         ],
            [160, "Standard", "Dialog entrance · sidebar expand"  ],
            [280, "Slow",     "Toast entry · page mount"          ],
          ].map(([ms, label, usage]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "8px 0", borderBottom: `1px solid ${T.s0}` }}>
              <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 18, color: T.accent, flex: "0 0 40px" }}>{ms}</span>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t0, flex: "0 0 72px" }}>{label}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2 }}>{usage}</span>
            </div>
          ))}
          <FrameTag text="motion / 4 durations / ms" />
        </Block>
        <Block>
          <Label>Rules</Label>
          {[
            ["Data is instant",   "Sort · filter · status update — zero animation. Information appears; it does not travel."],
            ["No physics",        "No spring, bounce, or momentum. Standard cubic ease only."],
            ["120ms ceiling",     "No UI transition exceeds 120ms."],
            ["Errors are static", "Error states do not animate. An error is a fact, not an event."],
          ].map(([rule, note]) => (
            <div key={rule as string} style={{ padding: "8px 0", borderBottom: `1px solid ${T.s0}` }}>
              <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.t0, margin: "0 0 3px" }}>
                <span style={{ color: T.accent, marginRight: 8 }}>›</span>{rule}
              </p>
              <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2, margin: 0, lineHeight: 1.55 }}>{note}</p>
            </div>
          ))}
        </Block>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 06 · Status Language
// ─────────────────────────────────────────────────────────────────────────────
function StatusLanguage() {
  const { T } = useTheme();
  const STATUS = [
    { tone: "success", labels: ["Ready","Applied","Complete","Connected"]            },
    { tone: "info",    labels: ["In Progress","Ranked","Scheduled","Tracking"]       },
    { tone: "warning", labels: ["Pending","Stalled","Follow-Up","Needs Review"]      },
    { tone: "error",   labels: ["Rejected","Failed","Blocked","Expired"]            },
    { tone: "skill",   labels: ["TypeScript","React","System Design","ML"]          },
    { tone: "neutral", labels: ["Draft","Archived","Paused","Unknown"]              },
  ];
  const color = (tone: string) => ({ success: T.success, info: T.info, warning: T.warning, error: T.error, skill: T.skill, neutral: T.t1 }[tone] ?? T.t1);
  const dim   = (tone: string) => ({ success: T.succDim, info: T.infoDim, warning: T.warnDim, error: T.errDim, skill: T.skillDim, neutral: T.s0 }[tone] ?? T.s0);

  return (
    <div>
      <SectionHead n="06" title="Status Language" />
      <Block>
        <Label>Dot + mono label — 6 tones including Skill</Label>
        <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden", marginBottom: 16 }}>
          {STATUS.map(({ tone, labels }, i, arr) => (
            <div key={tone} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "0 16px", alignItems: "center", padding: "9px 14px", background: dim(tone), borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: color(tone) }} />
                <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12, color: color(tone) }}>{tone}</span>
              </div>
              <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2 }}>{labels.join(" · ")}</span>
            </div>
          ))}
        </div>
        <FrameTag text="status / 6 tones / dot+text / skill as first-class tone" />
      </Block>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <Block>
          <Label>Alert — left-border · persistent condition</Label>
          {[
            [T.warning, T.warnDim, "3 follow-ups have been pending for >7 days" ],
            [T.error,   T.errDim,  "Resume packet is blocked — missing final portfolio link" ],
          ].map(([clr, bg, text]) => (
            <div key={text as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: bg as string, borderLeft: `2px solid ${clr}`, marginBottom: 6, borderRadius: `0 ${T.r1}px ${T.r1}px 0` }}>
              <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: clr as string, flexShrink: 0 }} />
              <span style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t1 }}>{text}</span>
            </div>
          ))}
          <FrameTag text="alert / left-border / no fill at rest" />
        </Block>
        <Block>
          <Label>Tint tag — summary band + Skill badges</Label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              ["Applied",    T.success, T.succDim   ],
              ["Ranked",     T.info,    T.infoDim   ],
              ["Follow-Up",  T.warning, T.warnDim   ],
              ["Rejected",   T.error,   T.errDim    ],
              ["TypeScript", T.skill,   T.skillDim  ],
              ["React",      T.skill,   T.skillDim  ],
              ["Draft",      T.t1,      T.s0        ],
            ].map(([label, clr, bg]) => (
              <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", background: bg as string, borderRadius: T.r1 }}>
                <div style={{ width: 4, height: 4, borderRadius: T.rFull, background: clr as string }} />
                <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11, color: clr as string }}>{label}</span>
              </div>
            ))}
          </div>
          <FrameTag text="tint-tag / summary + skill / no border at rest" />
        </Block>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 07 · Iconography
// ─────────────────────────────────────────────────────────────────────────────
function Iconography() {
  const { T } = useTheme();
  const icons: [string, string][] = [
    ["Dashboard", "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
    ["Leads",     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"],
    ["Messages",  "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
    ["Workspace", "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"],
    ["Search",    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"],
    ["Filter",    "M22 3H2l8 9.46V19l4 2V12.46L22 3z"],
    ["Bell",      "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"],
    ["Settings",  "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"],
  ];
  return (
    <div>
      <SectionHead n="07" title="Iconography" />
      <Block>
        <Label>Glyph set — Lucide · 16px grid · 1.5px stroke · round caps</Label>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
          {icons.map(([label, d]) => (
            <div key={label} style={{ padding: "10px 12px 8px", background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={T.t1} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
              <span style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.t2 }}>{label}</span>
            </div>
          ))}
          <div style={{ padding: "10px 12px 8px", background: T.accentDim, border: `1px solid ${T.aStroke}`, borderRadius: T.r3, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={T.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
            <span style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.accent }}>Active</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 24px" }}>
          {[
            ["Grid",   "16×16px · all icons aligned"       ],
            ["Stroke", "1.5px · round linecap + linejoin"  ],
            ["States", "Default: t1 · Active: Signal"      ],
            ["Size",   "16px rendered · 20px in bars"      ],
            ["Source", "Lucide React — do not hand-draw"   ],
            ["Color",  "Never decorative — always semantic" ],
          ].map(([k, v]) => (
            <div key={k as string} style={{ display: "flex", gap: 8 }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.accent, flex: "0 0 48px" }}>{k}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2 }}>{v}</span>
            </div>
          ))}
        </div>
        <FrameTag text="iconography / lucide / 1.5px / 16px" />
      </Block>
    </div>
  );
}

// ─────────────────────────────────────────────���───────────────────────────────
// 08 · Data Display
// ─────────────────────────────────────────────────────────────────────────────
function DataDisplay() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead n="08" title="Data Display" />
      <Block>
        <Label>Table anatomy — OPERATOR defaults</Label>
        <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", height: 30, background: T.bg, borderBottom: `1px solid ${T.s1}`, padding: "0 10px" }}>
            <div style={{ width: 28, flexShrink: 0 }}><div style={{ width: 11, height: 11, borderRadius: 2, border: `1px solid ${T.s2}` }} /></div>
            {[["Role", 2], ["Status", 1], ["Fit", 1], ["Updated", 1]].map(([h, f]) => (
              <div key={h as string} style={{ flex: f as number, padding: "0 8px" }}>
                <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9.5, color: T.t2, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</span>
              </div>
            ))}
          </div>
          {[
            ["Staff Product Designer · Notion",        "Ranked",    T.info,    T.infoDim,  92, "Apr 12"],
            ["Senior Platform Engineer · Figma",       "Applied",   T.success, T.succDim,  96, "Apr 10"],
            ["Founding Product Manager · Linear",      "Applied",   T.success, T.succDim,  91, "Apr 09"],
            ["Design Systems Lead · Ramp",             "Follow-Up", T.warning, T.warnDim,  74, "Apr 11"],
            ["Growth Analyst · Mercury",               "Rejected",  T.error,   T.errDim,   44, "Apr 07"],
          ].map(([name, stage, clr, dim, sc, app], i, arr) => (
            <div key={name as string} style={{ display: "flex", alignItems: "center", height: 38, background: dim as string, borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none", padding: "0 10px" }}>
              <div style={{ width: 28, flexShrink: 0 }}><div style={{ width: 11, height: 11, borderRadius: 2, border: `1px solid ${T.s1}` }} /></div>
              <div style={{ flex: 2, padding: "0 8px" }}><span style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 13, color: T.t0 }}>{name}</span></div>
              <div style={{ flex: 1, padding: "0 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: clr as string }} />
                  <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11.5, color: clr as string }}>{stage}</span>
                </div>
              </div>
              <div style={{ flex: 1, padding: "0 8px" }}><span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: (sc as number) >= 85 ? T.accent : (sc as number) >= 65 ? T.warning : T.error }}>{sc}</span></div>
              <div style={{ flex: 1, padding: "0 8px" }}><span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2 }}>{app}</span></div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 24px" }}>
          {[
            ["Row height", "38px dense · 44px comfortable"],
            ["Header",     "Mono uppercase · 9.5px · +0.1em"],
            ["Status",     "6px dot + Mono colored — no chip"],
            ["Numbers",    "Mono · tone-colored at threshold"],
            ["Hover",      "Status dim tint — hover only"],
            ["Dividers",   "s0 (5%) — never full border"],
          ].map(([k, v]) => (
            <div key={k as string} style={{ display: "flex", gap: 8 }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.accent, flex: "0 0 72px" }}>{k}</span>
              <span style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2 }}>{v}</span>
            </div>
          ))}
        </div>
        <FrameTag text="table / anatomy / 38px dense default" />
      </Block>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 09 · Responsive & Breakpoints
// ─────────────────────────────────────────────────────────────────────────────
function Responsive() {
  const { T } = useTheme();

  const breakpoints = [
    { bp: "≥ 1440px", name: "Full canvas",     rail: "Collapsed · 56px", toolbar: "Full",    grid: "12 col · 24px gap", scope: "Primary",      color: T.success },
    { bp: "1280px",   name: "Desktop",         rail: "Collapsed · 56px", toolbar: "Full",    grid: "12 col · 24px gap", scope: "Primary",      color: T.success },
    { bp: "1024px",   name: "Compact",         rail: "Collapsed · 56px", toolbar: "Wraps",   grid: "12 col · 16px gap", scope: "Primary",      color: T.success },
    { bp: "768px",    name: "Tablet",          rail: "Hidden · toggle",  toolbar: "Reduced", grid: "8 col · 16px gap",  scope: "Network note", color: T.warning },
    { bp: "390px",    name: "Flagship mobile", rail: "Bottom tabs",      toolbar: "Stacked", grid: "1 col · 12px gap",  scope: "Required",     color: T.accent  },
  ];

  const rules = [
    ["Max-width container", "1440px centered · 40px side margin at desktop · 20px at tablet"],
    ["Rail default",        "Collapsed 56px rail on desktop. Tablet hides it behind a toggle. Flagship mobile routes switch to bottom tabs."],
    ["Command bar",         "Fixed 48px — never re-mounts between routes. Sticky to viewport top on desktop."],
    ["Page toolbar",        "40px · between command bar and content · per-route, not global."],
    ["Content area",        "Fluid between rail and right edge. Max-width 1440px total canvas."],
    ["Collection collapse", "At tablet and mobile, collection routes stack cards vertically and keep the highest-signal summary first."],
    ["Required mobile",     "Dashboard, Auth, Profile, and Aspirations need explicit 390px compositions. Leads, applications, network-trust, workspace-evidence, and automation routes may stay desktop-primary here, but they still need condensed-behavior notes."],
  ];

  return (
    <div>
      <SectionHead n="09" title="Responsive & Breakpoints" />
      <Block>
        <Label>Breakpoint table — 1440px canvas · flagship mobile required</Label>

        {/* Mini layout diagram */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 20 }}>
          {breakpoints.map(({ bp, name, scope, color }, i) => (
            <div key={bp} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 56 - i * 6, background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6, position: "relative", overflow: "hidden" }}>
                {/* Rail slice */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: i < 3 ? 8 : i === 3 ? 4 : 0, background: T.base, borderRight: `1px solid ${T.s1}` }} />
                <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: color }} />
              </div>
              <p style={{ fontFamily: T.fontMono, fontSize: 9, color: color, margin: "0 0 2px", letterSpacing: "0.04em" }}>{scope}</p>
              <p style={{ fontFamily: T.fontMono, fontSize: 9, color: T.t2, margin: 0 }}>{bp}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 90px 80px 90px 110px 80px", height: 28, background: T.bg, borderBottom: `1px solid ${T.s1}`, alignItems: "center" }}>
            {["Breakpt", "Name", "Rail", "Toolbar", "Grid", "Scope"].map(h => (
              <div key={h} style={{ padding: "0 10px" }}>
                <span style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
              </div>
            ))}
          </div>
          {breakpoints.map(({ bp, name, rail, toolbar, grid, scope, color }, i, arr) => (
            <div key={bp} style={{ display: "grid", gridTemplateColumns: "80px 90px 80px 90px 110px 80px", alignItems: "center", padding: "7px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
              <div style={{ padding: "0 10px" }}><span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11, color: T.t0 }}>{bp}</span></div>
              <div style={{ padding: "0 10px" }}><span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t1 }}>{name}</span></div>
              <div style={{ padding: "0 10px" }}><span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.t2 }}>{rail}</span></div>
              <div style={{ padding: "0 10px" }}><span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.t2 }}>{toolbar}</span></div>
              <div style={{ padding: "0 10px" }}><span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.t2 }}>{grid}</span></div>
              <div style={{ padding: "0 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: color }} />
                  <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 10, color }}>{scope}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <FrameTag text="breakpoints / 5 sizes / flagship mobile required" />
      </Block>

      <Block>
        <Label>Layout rules</Label>
        {rules.map(([k, v], i, arr) => (
          <div key={k as string} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "0 20px", padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.s0}` : "none" }}>
            <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.accent }}>{k}</span>
            <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.55 }}>{v}</span>
          </div>
        ))}
        <FrameTag text="responsive / layout-rules / 7 constraints" />
      </Block>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "char",       label: "Character",           Comp: Character      },
  { id: "color",      label: "Signal & Surface",    Comp: ColorSystem    },
  { id: "type",       label: "Typography",          Comp: Typography     },
  { id: "space",      label: "Space & Grid",        Comp: SpaceGrid      },
  { id: "surface",    label: "Surfaces",            Comp: Surfaces       },
  { id: "motion",     label: "Motion",              Comp: Motion         },
  { id: "status",     label: "Status Language",     Comp: StatusLanguage },
  { id: "icons",      label: "Iconography",         Comp: Iconography    },
  { id: "data",       label: "Data Display",        Comp: DataDisplay    },
  { id: "responsive", label: "Responsive",          Comp: Responsive     },
];

export function FoundationsView() {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>

      {/* Sticky TOC */}
      <div style={{ flex: "0 0 148px", position: "sticky", top: 0, paddingTop: 2 }}>
        <p style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.t2, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 10px" }}>Contents</p>
        {SECTIONS.map(({ id, label }, i) => (
          <a key={id} href={`#f-${id}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "3px 0" }}>
            <span style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.t2 }}>{String(i).padStart(2, "0")}</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t1 }}>{label}</span>
          </a>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* File header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "0 0 2px" }}>// operator/foundations.spec</p>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "0 0 18px" }}>// BALDIN · OPERATOR v2.1 · dark + light</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 44, color: T.t0, margin: "0 0 14px", letterSpacing: "-0.02em" }}>Foundations</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.t1, maxWidth: 520, lineHeight: 1.75, margin: "0 0 20px" }}>
            The design DNA of OPERATOR. Every color, spacing decision, and typographic rule traces here. Built to feel like a precision instrument — not a SaaS product.
          </p>
          <div style={{ borderTop: `1px solid ${T.s1}`, paddingTop: 12 }}>
            {[
              ["direction",   "OPERATOR"                                    ],
              ["theme-spec",  "OPERATOR v2.1 · dark + light"               ],
              ["surface",     "#181818 (dark) · #ffffff (light)"           ],
              ["accent",      "#339cff · Signal blue"                      ],
              ["ink",         "#ffffff (dark) · #1a1c1f (light)"           ],
              ["typefaces",   "Space Grotesk · Source Sans 3 · JetBrains Mono"],
              ["contrast",    "60 (dark) · 45 (light)"                     ],
            ].map(([k, v]) => (
              <div key={k as string} style={{ display: "flex", gap: 16, padding: "4px 0", borderBottom: `1px solid ${T.s0}` }}>
                <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2, flex: "0 0 88px" }}>{k}</span>
                <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t0 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(({ id, Comp }, i) => (
          <div key={id} id={`f-${id}`}>
            <Comp />
            {i < SECTIONS.length - 1 && <HR />}
          </div>
        ))}
      </div>
    </div>
  );
}
