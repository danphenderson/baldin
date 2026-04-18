import { useState } from "react";
import { OP } from "../op";

const FILES = [
  { id: 1, name: "Q2 Career Map.pdf", type: "pdf", size: "2.4 MB", modified: "Apr 16", owner: "Jordan K.", shared: true },
  { id: 2, name: "Stripe - Staff Frontend Platform.md", type: "md", size: "340 KB", modified: "Apr 12", owner: "Jordan K.", shared: false },
  { id: 3, name: "Follow-Up Draft - Anika Chen.md", type: "md", size: "18 KB", modified: "Apr 10", owner: "Baldin Agent", shared: true },
  { id: 4, name: "Master Resume - Product Infra.docx", type: "docx", size: "86 KB", modified: "Apr 9", owner: "Jordan K.", shared: true },
  { id: 5, name: "Target Companies - Spring.csv", type: "csv", size: "1.1 MB", modified: "Apr 7", owner: "Jordan K.", shared: false },
  { id: 6, name: "Networking Notes - Design Systems.md", type: "md", size: "22 KB", modified: "Apr 5", owner: "Jordan K.", shared: true },
  { id: 7, name: "Application Tracker.xlsx", type: "xlsx", size: "54 KB", modified: "Apr 4", owner: "Workspace", shared: true },
  { id: 8, name: "Portfolio Case Studies.md", type: "md", size: "12 KB", modified: "Apr 3", owner: "Jordan K.", shared: true },
  { id: 9, name: "Comp Targets 2026.pdf", type: "pdf", size: "180 KB", modified: "Mar 28", owner: "Jordan K.", shared: false },
];

const TYPE_COLOR: Record<string, string> = {
  pdf: OP.error,
  md: OP.accent,
  docx: OP.info,
  csv: OP.success,
  xlsx: OP.success,
};

const FOLDERS = ["All files", "Applications", "Outreach", "Research", "Shared"];

function FileIcon({ type }: { type: string }) {
  const color = TYPE_COLOR[type] || OP.t1;
  return (
    <div style={{ width: 36, height: 44, borderRadius: OP.r1, background: `${color}12`, border: `1px solid ${color}22`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6, flexShrink: 0, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 0, height: 0, borderStyle: "solid", borderWidth: "0 10px 10px 0", borderColor: `transparent ${OP.bg} transparent transparent` }} />
      <span style={{ fontFamily: OP.fontMono, fontWeight: 700, fontSize: 8.5, color, letterSpacing: "0.05em" }}>{type.toUpperCase()}</span>
    </div>
  );
}

export function DocumentsScreen() {
  const [view, setView] = useState<"grid" | "list">("list");
  const [activeFolder, setActiveFolder] = useState("All files");
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", height: "100%", background: OP.bg }}>
      {/* Left sidebar */}
      <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${OP.s1}`, background: OP.base, padding: "16px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ padding: "0 12px 12px", borderBottom: `1px solid ${OP.s0}`, marginBottom: 4 }}>
          <button style={{ width: "100%", fontFamily: OP.fontBody, fontWeight: 600, fontSize: 12, padding: "7px 12px", background: OP.accent, border: "none", borderRadius: OP.r2, color: OP.bg, cursor: "pointer", textAlign: "left" }}>+ New document</button>
        </div>
        {FOLDERS.map(f => (
          <button key={f} onClick={() => setActiveFolder(f)} style={{ fontFamily: OP.fontBody, fontWeight: activeFolder === f ? 600 : 400, fontSize: 13, padding: "7px 16px", background: activeFolder === f ? OP.accentDim : "transparent", border: "none", borderLeft: `2px solid ${activeFolder === f ? OP.accent : "transparent"}`, color: activeFolder === f ? OP.accent : OP.t1, cursor: "pointer", textAlign: "left", width: "100%" }}>{f}</button>
        ))}
        <div style={{ marginTop: 16, padding: "0 12px" }}>
          <p style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: OP.t2, margin: "0 0 8px" }}>Recent</p>
          {FILES.slice(0, 4).map(f => (
            <div key={f.id} style={{ padding: "5px 4px", cursor: "pointer" }}>
              <p style={{ fontFamily: OP.fontBody, fontSize: 11.5, color: OP.t1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{ height: 44, borderBottom: `1px solid ${OP.s0}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: OP.fontHead, fontWeight: 600, fontSize: 15, color: OP.t0 }}>{activeFolder}</span>
          <span style={{ fontFamily: OP.fontMono, fontSize: 11, color: OP.t2 }}>{FILES.length} files</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {(["list", "grid"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ fontFamily: OP.fontBody, fontSize: 12, padding: "4px 10px", borderRadius: OP.r1, background: view === v ? OP.accentDim : "transparent", border: `1px solid ${view === v ? OP.accent + "33" : OP.s1}`, color: view === v ? OP.accent : OP.t1, cursor: "pointer" }}>
                {v === "list" ? "▤" : "⊞"}
              </button>
            ))}
          </div>
        </div>

        {/* File list */}
        <div style={{ flex: 1, overflowY: "auto", padding: view === "grid" ? "16px 20px" : 0 }}>
          {view === "list" ? (
            <>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", height: 32, borderBottom: `1px solid ${OP.s1}`, padding: "0 20px", background: OP.bg, position: "sticky", top: 0 }}>
                {[["Name", "flex: 1"], ["Type", "80px"], ["Size", "80px"], ["Modified", "80px"], ["Owner", "100px"], ["Shared", "60px"]].map(([h, w]) => (
                  <div key={h} style={{ flex: h === "Name" ? 1 : undefined, width: h !== "Name" ? w : undefined }}>
                    <span style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 10.5, color: OP.t2, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>
                  </div>
                ))}
              </div>
              {FILES.map(f => (
                <div key={f.id} onMouseEnter={() => setHovered(f.id)} onMouseLeave={() => setHovered(null)} style={{ display: "flex", alignItems: "center", height: 40, borderBottom: `1px solid ${OP.s0}`, padding: "0 20px", background: hovered === f.id ? OP.raised : "transparent", cursor: "pointer", transition: "background 0.1s", gap: 0 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: OP.rFull, background: TYPE_COLOR[f.type] || OP.t1, flexShrink: 0 }} />
                    <span style={{ fontFamily: OP.fontBody, fontSize: 13, color: OP.t0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  </div>
                  <div style={{ width: 80 }}><span style={{ fontFamily: OP.fontMono, fontSize: 11, color: TYPE_COLOR[f.type] || OP.t1 }}>{f.type.toUpperCase()}</span></div>
                  <div style={{ width: 80 }}><span style={{ fontFamily: OP.fontMono, fontSize: 11, color: OP.t2 }}>{f.size}</span></div>
                  <div style={{ width: 80 }}><span style={{ fontFamily: OP.fontMono, fontSize: 11, color: OP.t2 }}>{f.modified}</span></div>
                  <div style={{ width: 100 }}><span style={{ fontFamily: OP.fontBody, fontSize: 12, color: OP.t1 }}>{f.owner}</span></div>
                  <div style={{ width: 60 }}>
                    {f.shared && (
                      <div style={{ padding: "2px 6px", background: OP.accentDim, borderRadius: OP.r1, display: "inline-flex", alignItems: "center" }}>
                        <span style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 10, color: OP.accent }}>Shared</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {FILES.map(f => (
                <div key={f.id} onMouseEnter={() => setHovered(f.id)} onMouseLeave={() => setHovered(null)} style={{ padding: "14px 14px 12px", background: hovered === f.id ? OP.float : OP.raised, border: `1px solid ${hovered === f.id ? OP.s2 : OP.s1}`, borderRadius: OP.r3, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.1s" }}>
                  <FileIcon type={f.type} />
                  <div>
                    <p style={{ fontFamily: OP.fontBody, fontSize: 12.5, color: OP.t0, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                    <p style={{ fontFamily: OP.fontMono, fontSize: 10, color: OP.t2, margin: 0 }}>{f.size} · {f.modified}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
