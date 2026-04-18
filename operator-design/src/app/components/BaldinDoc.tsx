import { useState } from "react";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { CoverView }       from "./views/CoverView";
import { FoundationsView } from "./views/FoundationsView";
import { LibraryView }     from "./views/LibraryView";
import { ScreensView }     from "./views/ScreensView";
import { StyleGuideView }  from "./views/StyleGuideView";
import { AppendixView }    from "./views/AppendixView";

// ─────────────────────────────────────────────────────────────────────────────
// Nav sections
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "cover",       label: "Cover",             sub: "Overview · principles · how to read", lib: "Intro"            },
  { id: "foundations", label: "Foundations",       sub: "Color · Type · Space · Motion",      lib: "Baldin-Library"   },
  { id: "library",     label: "Component Library", sub: "Rail · Table · Dialogs · Forms",     lib: "Baldin-Library"   },
  { id: "screens",     label: "Route Specimens",   sub: "Identity · Network · Messaging · Evidence · Automation",  lib: "Route Specimens"  },
  { id: "guide",       label: "Style Guide",       sub: "Design language · Rules",             lib: "Documentation"    },
  { id: "appendix",    label: "Appendix",          sub: "Engineering handoff · Token map",     lib: "Documentation"    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Inner shell — consumes ThemeProvider
// ─────────────────────────────────────────────────────────────────────────────
function BaldinDocInner() {
  const { T, mode, toggle } = useTheme();
  const [active, setActive] = useState("cover");
  const cur = SECTIONS.find(s => s.id === active)!;

  const renderView = () => {
    switch (active) {
      case "cover":       return <CoverView onNavigate={setActive} />;
      case "foundations": return <FoundationsView />;
      case "library":     return <LibraryView />;
      case "screens":     return <ScreensView />;
      case "guide":       return <StyleGuideView />;
      case "appendix":    return <AppendixView />;
      default:            return null;
    }
  };

  const isDark = mode === "dark";

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, overflow: "hidden", fontFamily: T.fontBody, transition: "background 0.15s" }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div style={{ width: 240, flexShrink: 0, background: T.base, borderRight: `1px solid ${T.s1}`, display: "flex", flexDirection: "column", transition: "background 0.15s" }}>

        {/* Brand */}
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${T.s1}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: T.r2, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: T.shadowAccent }}>
              <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 14, color: "#fff" }}>B</span>
            </div>
            <span style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 17, color: T.t0, letterSpacing: "-0.02em" }}>Baldin</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: T.accentDim, border: `1px solid ${T.aStroke}`, borderRadius: T.r1 }}>
            <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: T.accent }} />
            <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.accent, letterSpacing: "0.05em" }}>OPERATOR · v2.1</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "14px 8px", flex: 1, overflowY: "auto" }}>
          {["Intro", "Baldin-Library", "Route Specimens", "Documentation"].map(group => {
            const items = SECTIONS.filter(s => s.lib === group);
            if (!items.length) return null;
            return (
              <div key={group} style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: T.t2, padding: "0 10px", margin: "0 0 4px" }}>{group}</p>
                {items.map(({ id, label, sub }) => (
                  <NavItem key={id} id={id} label={label} sub={sub} active={active} setActive={setActive} />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Legend */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.s1}` }}>
          {[
            { color: T.accent,  label: "Design rule"       },
            { color: T.warning, label: "Proposal cue"       },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t1 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ height: 44, background: T.base, borderBottom: `1px solid ${T.s1}`, display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", flexShrink: 0, transition: "background 0.15s" }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t2 }}>{cur.lib}</span>
            <span style={{ color: T.t2, fontSize: 14 }}>/</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.t0, fontWeight: 600 }}>{cur.label}</span>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Section dots */}
            <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
              {SECTIONS.map(({ id, label }) => (
                <button key={id} onClick={() => setActive(id)} title={label} style={{ width: 22, height: 22, borderRadius: T.r1, border: `1px solid ${active === id ? T.aStroke : T.s1}`, background: active === id ? T.accentDim : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 5, height: 5, borderRadius: T.rFull, background: active === id ? T.accent : T.t2 }} />
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: T.s1 }} />

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 10px", border: `1px solid ${T.s1}`, borderRadius: T.r2, background: "transparent", cursor: "pointer", transition: "border-color 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = T.aStroke)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = T.s1)}
            >
              {isDark ? (
                /* Sun — switch to light */
                <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke={T.t1} strokeWidth={1.5} strokeLinecap="round">
                  <circle cx="8" cy="8" r="3" />
                  <line x1="8" y1="1" x2="8" y2="2.5" />
                  <line x1="8" y1="13.5" x2="8" y2="15" />
                  <line x1="1" y1="8" x2="2.5" y2="8" />
                  <line x1="13.5" y1="8" x2="15" y2="8" />
                  <line x1="3.2" y1="3.2" x2="4.3" y2="4.3" />
                  <line x1="11.7" y1="11.7" x2="12.8" y2="12.8" />
                  <line x1="12.8" y1="3.2" x2="11.7" y2="4.3" />
                  <line x1="4.3" y1="11.7" x2="3.2" y2="12.8" />
                </svg>
              ) : (
                /* Moon — switch to dark */
                <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke={T.t1} strokeWidth={1.5} strokeLinecap="round">
                  <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z" />
                </svg>
              )}
              <span style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t1 }}>{isDark ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: active === "screens" ? "auto" : "auto",
            padding: active === "screens" ? "28px 40px 60px" : "48px 64px 80px",
            transition: "background 0.15s",
          }}
        >
          {renderView()}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav item
// ─────────────────────────────────────────────────────────────────────────────
function NavItem({ id, label, sub, active, setActive }: {
  id: string; label: string; sub: string;
  active: string; setActive: (id: string) => void;
}) {
  const { T } = useTheme();
  const isActive = active === id;
  return (
    <button
      onClick={() => setActive(id)}
      style={{ width: "100%", textAlign: "left", padding: "7px 12px", borderRadius: T.r2, border: "none", background: isActive ? T.accentDim : "transparent", borderLeft: `2px solid ${isActive ? T.accent : "transparent"}`, cursor: "pointer", marginBottom: 2, transition: "all 0.1s" }}
    >
      <p style={{ fontFamily: T.fontMono, fontWeight: isActive ? 600 : 500, fontSize: 12.5, color: isActive ? T.accent : T.t0, margin: "0 0 1px", letterSpacing: isActive ? "0" : "-0.01em" }}>{label}</p>
      <p style={{ fontFamily: T.fontMono, fontSize: 10.5, color: T.t2, margin: 0 }}>{sub}</p>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — provides theme context
// ─────────────────────────────────────────────────────────────────────────────
export function BaldinDoc() {
  return (
    <ThemeProvider>
      <BaldinDocInner />
    </ThemeProvider>
  );
}
