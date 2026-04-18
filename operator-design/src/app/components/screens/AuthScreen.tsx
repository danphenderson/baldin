import { useState } from "react";
import { OP } from "../op";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    background: OP.base,
    border: `1px solid ${focused === field ? OP.accent : OP.s1}`,
    borderRadius: OP.r2,
    padding: "11px 14px",
    fontFamily: OP.fontBody,
    fontSize: 14,
    color: OP.t0,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.12s",
  });

  return (
    <div style={{ display: "flex", height: "100%", background: OP.bg, alignItems: "center", justifyContent: "center", padding: "32px" }}>
      {/* Grid lines — ambient texture */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${OP.s0} 1px, transparent 1px), linear-gradient(90deg, ${OP.s0} 1px, transparent 1px)`, backgroundSize: "48px 48px", pointerEvents: "none" }} />

      {/* Auth card */}
      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: OP.r2, background: OP.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: OP.fontHead, fontWeight: 800, fontSize: 16, color: OP.bg }}>B</span>
          </div>
          <span style={{ fontFamily: OP.fontHead, fontWeight: 800, fontSize: 22, color: OP.t0, letterSpacing: "-0.02em" }}>Baldin</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily: OP.fontHead, fontWeight: 700, fontSize: 32, color: OP.t0, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Sign in to your local-first career workspace
        </h1>
        <p style={{ fontFamily: OP.fontBody, fontSize: 14, color: OP.t1, margin: "0 0 36px", lineHeight: 1.6 }}>
          Track aspirations, leads, applications, and follow-up from one private control plane.
        </p>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 12, color: OP.t1, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder="you@example.com"
              style={inputStyle("email")}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 12, color: OP.t1, textTransform: "uppercase", letterSpacing: "0.07em" }}>Password</label>
              <a href="#" style={{ fontFamily: OP.fontBody, fontSize: 12, color: OP.accent, textDecoration: "none" }}>Forgot?</a>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              placeholder="••••••••"
              style={inputStyle("password")}
            />
          </div>

          {/* CTA */}
          <button
            style={{ width: "100%", height: 44, background: email && password ? OP.accent : OP.s1, border: "none", borderRadius: OP.r2, fontFamily: OP.fontBody, fontWeight: 600, fontSize: 14, color: email && password ? OP.bg : OP.t2, cursor: email && password ? "pointer" : "default", marginTop: 4, transition: "all 0.12s" }}
          >
            Open workspace →
          </button>

          {/* SSO divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: OP.s0 }} />
            <span style={{ fontFamily: OP.fontBody, fontSize: 12, color: OP.t2 }}>or</span>
            <div style={{ flex: 1, height: 1, background: OP.s0 }} />
          </div>

          <button style={{ width: "100%", height: 42, background: "transparent", border: `1px solid ${OP.s2}`, borderRadius: OP.r2, fontFamily: OP.fontBody, fontWeight: 500, fontSize: 14, color: OP.t0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span>🔐</span> Continue with SSO
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between" }}>
          <p style={{ fontFamily: OP.fontBody, fontSize: 12, color: OP.t2, margin: 0 }}>
            New to Baldin?{" "}
            <a href="#" style={{ color: OP.accent, textDecoration: "none" }}>Register</a>
          </p>
          <p style={{ fontFamily: OP.fontMono, fontSize: 11, color: OP.t2, margin: 0 }}>v2.1 · Operator</p>
        </div>
      </div>

      {/* Right ambient panel */}
      <div style={{ flex: 1, maxWidth: 320, marginLeft: 64, display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
        <p style={{ fontFamily: OP.fontBody, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: OP.accent, margin: "0 0 8px" }}>What v2.1 emphasizes</p>
        {[
          { headline: "Aspirations", body: "Pin your target paths, comp range, and work-style constraints in one place." },
          { headline: "Agent-assisted workflows", body: "Baldin now drafts follow-up, ranks leads, and flags stalled applications inline with visible confidence cues." },
          { headline: "Workspace docs", body: "Resumes, outreach notes, and application context stay attached to the work they support." },
        ].map(({ headline, body }) => (
          <div key={headline} style={{ padding: "14px 16px", background: OP.raised, border: `1px solid ${OP.s1}`, borderRadius: OP.r3, borderLeft: `2px solid ${OP.accent}` }}>
            <p style={{ fontFamily: OP.fontHead, fontWeight: 600, fontSize: 13, color: OP.t0, margin: "0 0 4px" }}>{headline}</p>
            <p style={{ fontFamily: OP.fontBody, fontSize: 12, color: OP.t1, margin: 0, lineHeight: 1.5 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
