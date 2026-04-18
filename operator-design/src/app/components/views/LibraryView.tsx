import { useState } from "react";
import { useTheme } from "../ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────────────────────────
function Frame({ label, children, width, bg }: { label: string; children: React.ReactNode; width?: number | string; bg?: string }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "top" }}>
      <div style={{ width: width || "100%", background: bg || T.bg, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden" }}>
        {children}
      </div>
      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "6px 0 0", letterSpacing: "0.05em" }}>// {label}</p>
    </div>
  );
}

function SectionHead({ title, number }: { title: string; number: string }) {
  const { T } = useTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, margin: "0 0 4px", letterSpacing: "0.1em" }}>PRIMITIVE · {number}</p>
      <h2 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 22, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
    </div>
  );
}

function Canvas({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.s1}`, borderRadius: T.r3, padding: "28px", marginBottom: 48 }}>
      {children}
    </div>
  );
}

function Divider() {
  const { T } = useTheme();
  return <div style={{ height: 1, background: T.s0, margin: "56px 0" }} />;
}

function Annotation({ text }: { text: string }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 4, height: 4, borderRadius: T.rFull, background: T.accent }} />
      <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2, margin: 0 }}>{text}</p>
    </div>
  );
}

function StateLabel({ label, accent }: { label: string; accent?: boolean }) {
  const { T } = useTheme();
  return (
    <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: accent ? T.accent : T.t2, background: accent ? T.accentDim : T.s0, borderRadius: T.r1, padding: "2px 7px" }}>{label}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 01 · Navigation Rail
// ─────────────────────────────────────────────────────────────────────────────
function NavRailPrimitive() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead title="Navigation Rail" number="01" />
      <Canvas>
        <div style={{ display: "flex", gap: 24 }}>
          {/* Collapsed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <StateLabel label="Collapsed · 56px" />
            <Frame label="rail / collapsed" width={56} bg={T.base}>
              <div style={{ width: 56, height: 460, background: T.base, borderRight: `1px solid ${T.s1}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 8, paddingBottom: 12, boxSizing: "border-box" }}>
                <div style={{ width: 28, height: 28, borderRadius: T.r2, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, boxShadow: T.shadowAccent }}>
                  <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 12, color: "#fff" }}>B</span>
                </div>
                <div style={{ width: 36, height: 32, borderRadius: T.r2, background: T.accentDim, border: `1px solid ${T.aStroke}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={T.accent} strokeWidth={1.5} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                </div>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ width: 36, height: 32, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
                    <div style={{ width: 16, height: 16, borderRadius: T.r1, background: T.t1 }} />
                  </div>
                ))}
                <div style={{ width: 20, height: 1, background: T.s1, margin: "2px 0 4px" }} />
                {[0, 1, 2].map(i => (
                  <div key={`user-${i}`} style={{ width: 36, height: 32, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.25 }}>
                    <div style={{ width: 16, height: 16, borderRadius: T.r1, background: T.t1 }} />
                  </div>
                ))}
                <div style={{ marginTop: "auto", width: 26, height: 26, borderRadius: T.rFull, background: T.t2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9, color: T.bg }}>JK</span>
                </div>
              </div>
            </Frame>
          </div>

          {/* Expanded */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <StateLabel label="Expanded · 240px" />
              <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, letterSpacing: "0.09em", textTransform: "uppercase", color: T.warning, background: T.warnDim, borderRadius: T.r1, padding: "2px 7px" }}>PROPOSAL</span>
            </div>
            <Frame label="rail / expanded" width={240} bg={T.base}>
              <div style={{ width: 240, height: 620, background: T.base, borderRight: `1px solid ${T.s1}`, padding: "12px 8px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 12px" }}>
                  <div style={{ width: 24, height: 24, borderRadius: T.r1, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 11, color: "#fff" }}>B</span>
                  </div>
                  <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 15, color: T.t0, letterSpacing: "-0.02em" }}>Baldin</span>
                </div>
                {[
                  { group: "Dashboard",  items: [{ label: "Dashboard", active: true }] },
                  { group: "Job Search", items: [{ label: "Leads" }, { label: "Applications" }] },
                  { group: "Network",    items: [{ label: "Messages" }, { label: "Connections" }, { label: "Discover" }] },
                  { group: "Automation", items: [{ label: "Workflows" }, { label: "Agents" }, { label: "Workspace" }] },
                  { group: "User Rail",  items: [{ label: "Profile" }, { label: "Settings" }, { label: "Aspirations" }] },
                ].map(({ group, items }) => (
                  <div key={group} style={{ marginBottom: 12 }}>
                    <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9.5, letterSpacing: "0.10em", textTransform: "uppercase", color: T.t2, margin: "0 8px 4px" }}>{group}</p>
                    {items.map(({ label, active }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, height: 30, padding: "0 8px", borderRadius: T.r1, background: active ? T.accentDim : "transparent", borderLeft: `2px solid ${active ? T.accent : "transparent"}`, marginBottom: 2 }}>
                        <div style={{ width: 14, height: 14, borderRadius: T.r1, background: active ? T.accent : T.s1, opacity: active ? 1 : 0.4 }} />
                        <span style={{ fontFamily: T.fontMono, fontWeight: active ? 600 : 500, fontSize: 12.5, color: active ? T.accent : T.t1 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, padding: "8px" }}>
                  <div style={{ width: 26, height: 26, borderRadius: T.rFull, background: T.t2 }} />
                  <div>
                    <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.t0, margin: 0 }}>Jordan Kim</p>
                    <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2, margin: 0 }}>Operator</p>
                  </div>
                </div>
              </div>
            </Frame>
          </div>

          {/* Annotations */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 32 }}>
            <Annotation text="Logo mark sits outside route groups" />
            <Annotation text="Active item: Signal dim fill + Signal border-left" />
            <Annotation text="Inactive icons at 30% opacity — no label in collapsed" />
            <Annotation text="Primary route groups and the user rail are labeled in expanded mode" />
            <Annotation text="User rail stays explicit in expanded mode: Profile, Settings, Aspirations" />
            <Annotation text="Collapsed rail separates user-rail icons from the account avatar" />
            <Annotation text="Expanded (240px) is a design proposal — toggled by user" />
          </div>
        </div>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 02 · Command Bar
// ─────────────────────────────────────────────────────────────────────────────
function CommandBarPrimitive() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead title="Command Bar" number="02" />
      <Canvas>
        <div style={{ marginBottom: 16 }}><StateLabel label="Default" /></div>
        <Frame label="command-bar / 48px fixed" bg={T.base}>
          <div style={{ height: 48, background: T.base, boxShadow: `inset 0 -1px 0 ${T.s1}`, display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t1 }}>Applications</span>
              <span style={{ color: T.t2, fontSize: 14 }}>/</span>
              <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.t0 }}>Staff Product Designer</span>
            </div>
            <div style={{ height: 28, width: 200, background: T.s0, boxShadow: `0 0 0 1px ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center", padding: "0 10px", gap: 6 }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={T.t2} strokeWidth={1.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t2, flex: 1 }}>Search</span>
              <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, background: T.raised, borderRadius: T.r1, padding: "1px 5px" }}>⌘K</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: T.r2, background: T.s0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={T.t1} strokeWidth={1.5} strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
                <div style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: T.rFull, background: T.error, border: `1px solid ${T.base}` }} />
              </div>
              <div style={{ width: 28, height: 28, borderRadius: T.r2, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 14, color: "#fff" }}>+</span>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: T.rFull, background: T.t2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9, color: T.bg }}>JK</span>
              </div>
            </div>
          </div>
        </Frame>
        <div style={{ display: "flex", gap: 32, marginTop: 14, marginBottom: 24 }}>
          {[["Left zone", "Breadcrumb — reflects route depth in JetBrains Mono"], ["Center zone", "Global search (⌘K) — not a table filter"], ["Right zone", "Notifications + quick-add + user avatar"]].map(([label, note]) => (
            <div key={label}>
              <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11.5, color: T.t0, margin: "0 0 2px" }}>{label}</p>
              <p style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t2, margin: 0 }}>{note}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}><StateLabel label="Page toolbar — collection" /></div>
        <Frame label="page-toolbar / 40px / collection variant" bg={T.bg}>
          <div style={{ height: 40, background: T.bg, borderBottom: `1px solid ${T.s0}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 6 }}>
            {["All", "Applied", "Ranked", "Follow-Up"].map((f, i) => (
              <div key={f} style={{ height: 24, borderRadius: T.r1, padding: "0 10px", background: i === 0 ? T.accentDim : "transparent", border: `1px solid ${i === 0 ? T.aStroke : T.s1}`, display: "flex", alignItems: "center" }}>
                <span style={{ fontFamily: T.fontMono, fontWeight: i === 0 ? 600 : 400, fontSize: 11.5, color: i === 0 ? T.accent : T.t1 }}>{f}</span>
              </div>
            ))}
            <div style={{ height: 16, width: 1, background: T.s1, margin: "0 4px" }} />
            {["↑ Date applied", "⊞ Card"].map(f => (
              <div key={f} style={{ height: 24, borderRadius: T.r1, padding: "0 10px", background: "transparent", border: `1px solid ${T.s1}`, display: "flex", alignItems: "center" }}>
                <span style={{ fontFamily: T.fontMono, fontSize: 11.5, color: T.t1 }}>{f}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", height: 28, borderRadius: T.r2, padding: "0 14px", background: T.accent, display: "flex", alignItems: "center" }}>
              <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: "#fff" }}>+ Save lead</span>
            </div>
          </div>
        </Frame>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 03 · Summary Band
// ─────────────────────────────────────────────────────────────────────────────
function SummaryBandPrimitive() {
  const { T } = useTheme();
  const cells = [
    { label: "Total",     value: "284", color: T.t0      },
    { label: "Applied",   value: "91",  color: T.success  },
    { label: "Ranked",    value: "23",  color: T.info     },
    { label: "Follow-Up", value: "44",  color: T.warning  },
    { label: "Blocked",   value: "18",  color: T.error    },
  ];
  return (
    <div>
      <SectionHead title="Summary Band" number="03" />
      <Canvas>
        <div style={{ marginBottom: 12 }}><StateLabel label="Default · 5 cells" /></div>
        <Frame label="summary-band / leads collection">
          <div style={{ display: "flex" }}>
            {cells.map(({ label, value, color }, i) => (
              <div key={label} style={{ flex: 1, padding: "14px 20px", borderRight: i < cells.length - 1 ? `1px solid ${T.s0}` : "none" }}>
                <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 22, color, margin: 0 }}>{value}</p>
                <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, color: T.t2, margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
              </div>
            ))}
          </div>
        </Frame>
        <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
          <Annotation text="Always leads the collection view — before filters" />
          <Annotation text="Values in JetBrains Mono, tone-colored" />
          <Annotation text="Labels in JetBrains Mono uppercase overline" />
        </div>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 04 · Table System
// ─────────────────────────────────────────────────────────────────────────────
function TableSystemPrimitive() {
  const { T } = useTheme();
  const rows = [
    { name: "Senior Platform Engineer · Figma",  stage: "Applied",   color: T.success, dim: T.succDim,  score: 96, hover: false, selected: false },
    { name: "Staff Product Designer · Notion",   stage: "Ranked",    color: T.info,    dim: T.infoDim,  score: 92, hover: true,  selected: false },
    { name: "Founding PM · Linear",              stage: "Applied",   color: T.success, dim: T.succDim,  score: 91, hover: false, selected: true  },
    { name: "Growth Analyst · Mercury",          stage: "Rejected",  color: T.error,   dim: T.errDim,   score: 55, hover: false, selected: false },
  ];
  return (
    <div>
      <SectionHead title="Table System" number="04" />
      <Canvas>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start", marginBottom: 24 }}>
          <div>
            <div style={{ marginBottom: 8 }}><StateLabel label="Row states" /></div>
            <Frame label="table / all row states">
              <div style={{ background: T.bg, borderRadius: T.r3, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", height: 32, borderBottom: `1px solid ${T.s1}`, padding: "0 8px" }}>
                  <div style={{ width: 32, display: "flex", justifyContent: "center" }}><div style={{ width: 12, height: 12, borderRadius: T.r1, border: `1px solid ${T.s2}` }} /></div>
                  {["Role", "Status", "Fit", "Updated"].map(h => (
                    <div key={h} style={{ flex: h === "Name" ? 2 : 1, padding: "0 8px" }}>
                      <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9.5, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em" }}>{h}</span>
                    </div>
                  ))}
                </div>
                {rows.map(({ name, stage, color, dim, score, hover, selected }, i) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", height: 40, background: selected ? T.accentMid : hover ? dim : "transparent", borderBottom: i < rows.length - 1 ? `1px solid ${T.s0}` : "none", padding: "0 8px" }}>
                    <div style={{ width: 32, display: "flex", justifyContent: "center" }}>
                      <div style={{ width: 12, height: 12, borderRadius: T.r1, border: `1px solid ${selected ? T.accent : T.s2}`, background: selected ? T.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selected && <span style={{ color: "#fff", fontSize: 8 }}>✓</span>}
                      </div>
                    </div>
                  <div style={{ flex: 2, padding: "0 8px" }}><span style={{ fontFamily: T.fontBody, fontWeight: 600, fontSize: 13, color: T.t0 }}>{name}</span></div>
                    <div style={{ flex: 1, padding: "0 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: color }} />
                        <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color }}>{stage}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: "0 8px" }}><span style={{ fontFamily: T.fontMono, fontSize: 12, color: score >= 85 ? T.accent : score >= 70 ? T.warning : T.error }}>{score}</span></div>
                    <div style={{ flex: 1, padding: "0 8px" }}><span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2 }}>Apr {10 + i * 2}</span></div>
                  </div>
                ))}
              </div>
            </Frame>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 40, minWidth: 180 }}>
            {[
              { label: "Default",  note: "Transparent bg"        },
              { label: "Hover",    note: "Status tone dim tint"  },
              { label: "Selected", note: "Signal · Subtle fill"  },
              { label: "Disabled", note: "40% opacity all"       },
            ].map(({ label, note }) => (
              <div key={label} style={{ padding: "8px 12px", background: T.raised, borderRadius: T.r2, border: `1px solid ${T.s1}` }}>
                <p style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.t0, margin: "0 0 1px" }}>{label}</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 11, color: T.t2, margin: 0 }}>{note}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <Annotation text="38–40px row height (dense default)" />
          <Annotation text="Row dividers: stroke-faint (5%) — no full borders" />
          <Annotation text="Header: JetBrains Mono uppercase 9.5px · sticky top" />
        </div>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 05 · Status Markers — 6 tones including Skill
// ─────────────────────────────────────────────────────────────────────────────
function StatusMarkers() {
  const { T } = useTheme();
  const tones = [
    { tone: "Success", color: T.success, dim: T.succDim,  labels: ["Ready",       "Applied",     "Complete"     ] },
    { tone: "Info",    color: T.info,    dim: T.infoDim,  labels: ["In Progress", "Ranked",      "Scheduled"    ] },
    { tone: "Warning", color: T.warning, dim: T.warnDim,  labels: ["Pending",     "Follow-Up",   "Stalled"      ] },
    { tone: "Error",   color: T.error,   dim: T.errDim,   labels: ["Rejected",    "Blocked",     "Failed"       ] },
    { tone: "Skill",   color: T.skill,   dim: T.skillDim, labels: ["TypeScript",  "React",       "System Design"] },
    { tone: "Neutral", color: T.t1,      dim: T.s0,       labels: ["Draft",       "Archived",    "Unknown"      ] },
  ];

  return (
    <div>
      <SectionHead title="Status Markers" number="05" />
      <Canvas>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Dot + text */}
          <div>
            <div style={{ marginBottom: 10 }}><StateLabel label="Dot + text — 6 tones" /></div>
            <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden" }}>
              {tones.map(({ tone, color, dim, labels }) => (
                <div key={tone} style={{ padding: "10px 14px", borderBottom: `1px solid ${T.s0}`, background: dim, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 110px" }}>
                    <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: color }} />
                    <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 12, color }}>{labels[0]}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {labels.slice(1).map(l => (
                      <span key={l} style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t2 }}>{l}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "6px 0 0" }}>// status-markers / dot+text / 6 tones</p>
          </div>
          {/* Tint tag */}
          <div>
            <div style={{ marginBottom: 10 }}><StateLabel label="Tint tag — contextual use" /></div>
            <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, overflow: "hidden" }}>
              {tones.map(({ tone, color, dim, labels }) => (
                <div key={tone} style={{ padding: "10px 14px", borderBottom: `1px solid ${T.s0}`, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {labels.map(l => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", background: dim, borderRadius: T.r1 }}>
                      <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: color }} />
                      <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 11, color }}>{l}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "6px 0 0" }}>// status-markers / tint-tag / skill as first-class</p>
          </div>
        </div>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 06 · Dialogs — opaqueWindows: false · backdrop-filter
// ─────────────────────────────────────────────────────────────────────────────
function DialogsPrimitive() {
  const { T } = useTheme();
  const blur20 = "blur(20px)";
  const blur24 = "blur(24px)";
  return (
    <div>
      <SectionHead title="Dialogs" number="06" />
      <Canvas>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Form sheet */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 8 }}><StateLabel label="Form sheet" /></div>
            <Frame label="dialog / form-sheet / backdrop-filter: blur(20px)" width={320}>
              <div style={{ position: "relative", background: T.raised, borderRadius: T.r3, overflow: "hidden", minHeight: 220 }}>
                {/* Simulated backdrop content */}
                <div style={{ position: "absolute", inset: 0, opacity: 0.3, display: "flex", gap: 2 }}>
                  <div style={{ flex: 1, background: T.success }} />
                  <div style={{ flex: 2, background: T.accent }} />
                  <div style={{ flex: 1, background: T.skill }} />
                </div>
                {/* Glass dialog */}
                <div style={{ position: "relative", margin: 12, background: T.floatGlass, border: `1px solid ${T.s2}`, borderTop: `2px solid ${T.aStroke}`, borderRadius: T.r4, boxShadow: T.shadow3, backdropFilter: blur20, WebkitBackdropFilter: blur20, overflow: "hidden" }}>
                  <div style={{ padding: "16px 18px", borderBottom: `1px solid ${T.s1}` }}>
                    <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, color: T.t0, margin: 0 }}>Save lead</p>
                    <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, margin: "2px 0 0" }}>Capture a new job opportunity</p>
                  </div>
                  <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {["Role title", "Company", "Source link"].map(f => (
                      <div key={f}>
                        <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, color: T.t2, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{f}</p>
                        <div style={{ height: 30, background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.s1}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <div style={{ height: 30, padding: "0 12px", border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center" }}>
                      <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t1 }}>Cancel</span>
                    </div>
                    <div style={{ height: 30, padding: "0 12px", background: T.accent, borderRadius: T.r2, display: "flex", alignItems: "center" }}>
                      <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: "#fff" }}>Save lead</span>
                    </div>
                  </div>
                </div>
              </div>
            </Frame>
          </div>

          {/* Confirm gate */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 8 }}><StateLabel label="Confirm gate — destructive" /></div>
            <Frame label="dialog / confirm-gate / backdrop-filter: blur(24px)" width={300}>
              <div style={{ position: "relative", background: T.raised, borderRadius: T.r3, overflow: "hidden", minHeight: 200 }}>
                {/* Backdrop */}
                <div style={{ position: "absolute", inset: 0, opacity: 0.25, display: "flex", gap: 2 }}>
                  <div style={{ flex: 2, background: T.error }} />
                  <div style={{ flex: 1, background: T.warning }} />
                </div>
                {/* Glass confirm */}
                <div style={{ position: "relative", margin: 12, background: T.overlayGlass, border: `1px solid ${T.s2}`, borderTop: `2px solid ${T.error}55`, borderRadius: T.r4, boxShadow: T.shadow3, backdropFilter: blur24, WebkitBackdropFilter: blur24, overflow: "hidden" }}>
                  <div style={{ padding: "16px 18px", borderBottom: `1px solid ${T.s1}` }}>
                    <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, color: T.t0, margin: 0 }}>Delete workspace doc</p>
                  </div>
                  <div style={{ padding: "12px 18px 14px" }}>
                    <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, margin: 0, lineHeight: 1.6 }}>This will permanently delete <strong style={{ color: T.t0 }}>Resume v4</strong> from workspace. This action cannot be undone.</p>
                  </div>
                  <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.s1}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <div style={{ height: 30, padding: "0 12px", border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center" }}>
                      <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.t1 }}>Cancel</span>
                    </div>
                    <div style={{ height: 30, padding: "0 12px", background: T.error, borderRadius: T.r2, display: "flex", alignItems: "center" }}>
                      <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: "#fff" }}>Delete Resume v4</span>
                    </div>
                  </div>
                </div>
              </div>
            </Frame>
          </div>

          {/* Annotations */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 28 }}>
            <Annotation text="opaqueWindows: false — glass surfaces only" />
            <Annotation text="Float: blur(20px) · Overlay: blur(24px)" />
            <Annotation text="Top border: Signal at 32% (form) · Error at 33% (confirm)" />
            <Annotation text="Confirm label = verb + entity name" />
            <Annotation text="Cancel is always left. Confirm is always right." />
            <Annotation text="Destructive uses error red — never Signal blue" />
          </div>
        </div>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 07 · Forms — input states
// ─────────────────────────────────────────────────────────────────────────────
function FormsPrimitive() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead title="Form Inputs" number="07" />
      <Canvas>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { state: "default",  label: "Default",  border: T.s1,      bg: T.base,    value: "",                       placeholder: "Type here…"     },
            { state: "focus",    label: "Focus",    border: T.aStroke, bg: T.base,    value: "Staff Product Designer", placeholder: "",             shadow: T.shadowAccent },
            { state: "error",    label: "Error",    border: T.error,   bg: T.errDim,  value: "Staff Product Designer", placeholder: "",             },
            { state: "disabled", label: "Disabled", border: T.s0,      bg: T.s0,      value: "",              placeholder: "Disabled",   opacity: 0.5 },
          ].map(({ state, label, border, bg, value, placeholder, shadow, opacity }) => (
            <div key={state} style={{ width: 200, opacity: opacity ?? 1 }}>
              <div style={{ marginBottom: 8 }}><StateLabel label={label} accent={state === "focus"} /></div>
              <div>
                <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10, color: T.t2, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Role title</p>
                <div style={{ height: 36, background: bg, border: `1px solid ${border}`, borderRadius: T.r2, display: "flex", alignItems: "center", padding: "0 12px", boxSizing: "border-box", boxShadow: shadow }}>
                  <span style={{ fontFamily: T.fontMono, fontSize: 13, color: value ? T.t0 : T.t2 }}>{value || placeholder}</span>
                  {state === "focus" && <span style={{ fontFamily: T.fontMono, fontSize: 13, color: T.accent, marginLeft: 1 }}>|</span>}
                </div>
                {state === "error" && <p style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.error, margin: "4px 0 0" }}>Lead already exists in queue</p>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: T.s0, margin: "24px 0" }} />

        <div style={{ display: "flex", gap: 40 }}>
          <div>
            <div style={{ marginBottom: 8 }}><StateLabel label="Checkbox" /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ checked: false, label: "Option unchecked" }, { checked: true, label: "Option checked" }].map(({ checked, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: T.r1, border: `1px solid ${checked ? T.accent : T.s2}`, background: checked ? T.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {checked && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: T.fontMono, fontSize: 12.5, color: T.t0 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 8 }}><StateLabel label="Buttons" /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { bg: T.accent,       border: "none",                      color: "#fff",    label: "Primary"     },
                { bg: "transparent",  border: `1px solid ${T.s2}`,         color: T.t0,      label: "Secondary"   },
                { bg: "transparent",  border: `1px solid ${T.error}44`,    color: T.error,   label: "Destructive" },
              ].map(({ bg, border, color, label }) => (
                <div key={label} style={{ height: 32, padding: "0 16px", background: bg, border, borderRadius: T.r2, display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12.5, color }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, margin: "16px 0 0" }}>// forms / input-states / buttons / checkboxes</p>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 08 · Empty · Loading · Error states
// ─────────────────────────────────────────────────────────────────────────────
function StatePrimitive() {
  const { T } = useTheme();
  return (
    <div>
      <SectionHead title="Empty · Loading · Error" number="08" />
      <Canvas>
        <div style={{ display: "flex", gap: 16 }}>
          {/* Empty */}
          <Frame label="state / empty" width={280} bg={T.bg}>
            <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "24px" }}>
              <div style={{ width: 40, height: 40, borderRadius: T.r2, border: `1px dashed ${T.s2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.t2} strokeWidth={1.5} strokeLinecap="round"><path d="M3 7h18M3 12h18M3 17h10" /></svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px" }}>No leads yet</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: "0 0 12px", lineHeight: 1.5 }}>Save your first opportunity to start the queue.</p>
                <div style={{ height: 30, padding: "0 14px", background: T.accent, borderRadius: T.r2, display: "inline-flex", alignItems: "center" }}>
                  <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: "#fff" }}>+ Save lead</span>
                </div>
              </div>
            </div>
          </Frame>

          {/* Loading skeleton */}
          <Frame label="state / skeleton-loading" width={280} bg={T.bg}>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12, height: 200, boxSizing: "border-box" }}>
              {[100, 80, 92, 65, 88].map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: T.s1, flexShrink: 0 }} />
                  <div style={{ height: 12, borderRadius: T.r1, background: `linear-gradient(90deg, ${T.s0} 0%, ${T.s1} 50%, ${T.s0} 100%)`, width: `${w}%` }} />
                  <div style={{ width: 40, height: 12, borderRadius: T.r1, background: T.s0, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </Frame>

          {/* Error */}
          <Frame label="state / error" width={280} bg={T.bg}>
            <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "24px" }}>
              <div style={{ width: 40, height: 40, borderRadius: T.r2, background: T.errDim, border: `1px solid ${T.error}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.error} strokeWidth={1.5} strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px" }}>Failed to load</p>
                <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, margin: "0 0 12px", lineHeight: 1.5 }}>There was a problem fetching this data.</p>
                <div style={{ height: 30, padding: "0 14px", border: `1px solid ${T.s2}`, borderRadius: T.r2, display: "inline-flex", alignItems: "center" }}>
                  <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 12, color: T.t0 }}>Retry</span>
                </div>
              </div>
            </div>
          </Frame>
        </div>
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────
const PRIMITIVES = [
  { id: "rail",    label: "Rail",                    Comp: NavRailPrimitive     },
  { id: "bar",     label: "Command Bar",             Comp: CommandBarPrimitive  },
  { id: "band",    label: "Summary Band",            Comp: SummaryBandPrimitive },
  { id: "table",   label: "Table System",            Comp: TableSystemPrimitive },
  { id: "status",  label: "Status Markers",          Comp: StatusMarkers        },
  { id: "dialogs", label: "Dialogs",                 Comp: DialogsPrimitive     },
  { id: "forms",   label: "Forms",                   Comp: FormsPrimitive       },
  { id: "states",  label: "Empty · Loading · Error", Comp: StatePrimitive       },
];

export function LibraryView() {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
      {/* TOC */}
      <div style={{ flex: "0 0 160px", position: "sticky", top: 0 }}>
        <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.t2, margin: "0 0 10px" }}>Primitives</p>
        {PRIMITIVES.map(({ id, label }) => (
          <a key={id} href={`#lib-${id}`} style={{ display: "block", fontFamily: T.fontMono, fontSize: 12, color: T.t1, textDecoration: "none", padding: "4px 0" }}>{label}</a>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: T.fontMono, fontSize: 11, color: T.accent, margin: "0 0 6px", letterSpacing: "0.1em" }}>BALDIN-LIBRARY · OPERATOR</p>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 40, color: T.t0, margin: "0 0 12px", letterSpacing: "-0.03em" }}>Component Library</h1>
          <p style={{ fontFamily: T.fontBody, fontSize: 15, color: T.t1, maxWidth: 540, lineHeight: 1.7, margin: 0 }}>
            Core primitives for OPERATOR. Each frame shows the component in context with annotated states. Dialogs use backdrop-filter for the OPERATOR glass treatment with <code style={{ fontFamily: T.fontMono, fontSize: 13, color: T.accent }}>opaqueWindows: false</code>.
          </p>
        </div>
        {PRIMITIVES.map(({ id, Comp }, i) => (
          <div key={id} id={`lib-${id}`}>
            <Comp />
            {i < PRIMITIVES.length - 1 && <Divider />}
          </div>
        ))}
      </div>
    </div>
  );
}
