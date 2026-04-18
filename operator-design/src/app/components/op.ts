// ─── OPERATOR · foundations v2.1 ─────────────────────────────────────────────
// Two variants — dark (#181818) + light (#ffffff).
// One accent across both: signal blue #339cff.
// Semantic colors derived from OPERATOR status language for Baldin's local-first
// job-search OS surfaces.

// ─── Dark / variant: dark / contrast: 60 ────────────────────
export const DARK = {

  // ── Surface ramp — neutral warm-dark ──────────────────────────────────────
  bg:       "#181818",   // Void    — page background          (surface)
  base:     "#1e1e1e",   // Shell   — rail, command bar, bars
  raised:   "#242424",   // Surface — cards, panels, table rows
  float:    "#2d2d2d",   // Float   — popovers, dropdowns
  overlay:  "#363636",   // Overlay — dialogs

  // ── Accent — signal blue · earned color rule ───────────────────────────────
  accent:    "#339cff",
  accentDim: "rgba(51,156,255,0.09)",   // Tint   — hover, badge bg
  accentMid: "rgba(51,156,255,0.16)",   // Subtle — active fill
  aStroke:   "rgba(51,156,255,0.32)",   // Stroke — focus ring, active border

  // ── Semantic ───────────────────────────────────────────────────────────────
  success:  "#40c977",                  // Ready, Connected, Sent, Completed
  succDim:  "rgba(64,201,119,0.09)",
  error:    "#fa423e",                  // Rejected, Failed, Blocked
  errDim:   "rgba(250,66,62,0.09)",
  warning:  "#e8a020",                  // Pending, Stale, Needs Follow-Up
  warnDim:  "rgba(232,160,32,0.09)",
  info:     "#339cff",                  // Applied, In Progress, Scheduled
  infoDim:  "rgba(51,156,255,0.09)",
  skill:    "#ad7bf9",                  // Skill badges, capability tags
  skillDim: "rgba(173,123,249,0.09)",

  // ── Text — white ink · contrast 60 ────────────────────────────────────────
  t0: "#ffffff",
  t1: "rgba(255,255,255,0.54)",
  t2: "rgba(255,255,255,0.30)",

  // ── Stroke ────────────────────────────────────────────────────────────────
  s0: "rgba(255,255,255,0.05)",
  s1: "rgba(255,255,255,0.09)",
  s2: "rgba(255,255,255,0.15)",

  // ── Typography ────────────────────────────────────────────────────────────
  fontHead: "'Space Grotesk', sans-serif",
  fontBody: "'Source Sans 3', sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  // ── Radius ────────────────────────────────────────────────────────────────
  r1: 2, r2: 3, r3: 5, r4: 8, rFull: 9999,

  // ── Shadow ────────────────────────────────────────────────────────────────
  shadow3:      "0 32px 64px rgba(0,0,0,0.80)",
  shadowAccent: "0 0 0 1px rgba(51,156,255,0.22), 0 0 20px rgba(51,156,255,0.08)",

  // ── Glass surfaces — opaqueWindows: false ─────────────────────────────────
  floatGlass:   "rgba(45,45,45,0.88)",    // Float + backdrop-filter: blur(20px)
  overlayGlass: "rgba(54,54,54,0.92)",    // Overlay + backdrop-filter: blur(24px)
};

// ─── Light v2.1 / variant: light / contrast: 45 ─────────────────────────────
export const LIGHT: typeof DARK = {

  bg:       "#ffffff",
  base:     "#f6f6f6",
  raised:   "#f0f0f0",
  float:    "#e8e8e8",
  overlay:  "#e0e0e0",

  accent:    "#339cff",
  accentDim: "rgba(51,156,255,0.08)",
  accentMid: "rgba(51,156,255,0.15)",
  aStroke:   "rgba(51,156,255,0.40)",

  success:  "#00a240",
  succDim:  "rgba(0,162,64,0.08)",
  error:    "#ba2623",
  errDim:   "rgba(186,38,35,0.08)",
  warning:  "#c47700",
  warnDim:  "rgba(196,119,0,0.08)",
  info:     "#339cff",
  infoDim:  "rgba(51,156,255,0.08)",
  skill:    "#924ff7",
  skillDim: "rgba(146,79,247,0.08)",

  // Dark ink · contrast 45
  t0: "#1a1c1f",
  t1: "rgba(26,28,31,0.58)",
  t2: "rgba(26,28,31,0.36)",

  s0: "rgba(0,0,0,0.05)",
  s1: "rgba(0,0,0,0.10)",
  s2: "rgba(0,0,0,0.17)",

  fontHead: "'Space Grotesk', sans-serif",
  fontBody: "'Source Sans 3', sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  r1: 2, r2: 3, r3: 5, r4: 8, rFull: 9999,

  shadow3:      "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
  shadowAccent: "0 0 0 1px rgba(51,156,255,0.32), 0 0 16px rgba(51,156,255,0.12)",

  // Glass surfaces
  floatGlass:   "rgba(248,248,248,0.88)",
  overlayGlass: "rgba(240,240,240,0.92)",
};

export type Theme = typeof DARK;

// Default: dark
export const OP = DARK;

// ─── Status dot helper ────────────────────────────────────────────────────────
export type StatusTone = "success" | "warning" | "error" | "info" | "skill" | "neutral";

export const STATUS_TONE: Record<StatusTone, { color: string; dim: string; label: string }> = {
  success: { color: OP.success, dim: OP.succDim,  label: "success" },
  warning: { color: OP.warning, dim: OP.warnDim,  label: "warning" },
  error:   { color: OP.error,   dim: OP.errDim,   label: "error"   },
  info:    { color: OP.info,    dim: OP.infoDim,  label: "info"    },
  skill:   { color: OP.skill,   dim: OP.skillDim, label: "skill"   },
  neutral: { color: OP.t1,      dim: "rgba(255,255,255,0.08)", label: "neutral" },
};

// ─── Status label → tone ──────────────────────────────────────────────────────
export const STATUS_MAP: Record<string, StatusTone> = {
  Active:        "success",
  Approved:      "success",
  Connected:     "success",
  Completed:     "success",
  Hired:         "success",
  Ready:         "success",
  Following:     "success",
  Sent:          "success",
  Interview:     "info",
  "In Progress": "info",
  Processing:    "info",
  Screening:     "info",
  Scheduled:     "info",
  Applied:       "info",
  Ranked:        "info",
  Pending:       "warning",
  Review:        "warning",
  Stale:         "warning",
  "Reply Due":   "warning",
  "Follow-Up":   "warning",
  "Needs Reply": "warning",
  "Needs Review":"warning",
  "Needs Attention": "warning",
  Offer:         "success",
  Rejected:      "error",
  Failed:        "error",
  Blocked:       "error",
  Expired:       "error",
  New:           "neutral",
  Draft:         "neutral",
  Archived:      "neutral",
  Tracking:      "neutral",
  Saved:         "neutral",
  Queued:        "neutral",
};
