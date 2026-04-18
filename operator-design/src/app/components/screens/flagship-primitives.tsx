import type { ReactNode } from "react";
import { useTheme } from "../ThemeContext";

type Tone = "accent" | "success" | "warning" | "error" | "info" | "skill" | "neutral";

function resolveTone(colorTone: Tone, T: ReturnType<typeof useTheme>["T"]) {
  switch (colorTone) {
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

export function ScreenBadge({
  label,
  tone = "accent",
}: {
  label: string;
  tone?: Tone;
}) {
  const { T } = useTheme();
  const palette = resolveTone(tone, T);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: palette.dim,
        border: `1px solid ${palette.border}`,
        borderRadius: T.rFull,
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: T.rFull, background: palette.color }} />
      <span style={{ fontFamily: T.fontMono, fontWeight: 600, fontSize: 10.5, color: palette.color, letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}

export function ScreenTag({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  const { T } = useTheme();
  const palette = resolveTone(tone, T);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: T.r1,
        background: palette.dim,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        fontFamily: T.fontMono,
        fontSize: 10.5,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

export function ScreenButton({
  label,
  kind = "primary",
  tone = "accent",
  compact = false,
}: {
  label: string;
  kind?: "primary" | "secondary" | "ghost";
  tone?: Tone;
  compact?: boolean;
}) {
  const { T } = useTheme();
  const palette = resolveTone(tone, T);

  const background = kind === "primary"
    ? palette.color
    : kind === "secondary"
      ? palette.dim
      : "transparent";

  const border = kind === "ghost"
    ? T.s1
    : kind === "secondary"
      ? palette.border
      : "transparent";

  const color = kind === "primary" ? T.bg : kind === "ghost" ? T.t0 : palette.color;

  return (
    <button
      type="button"
      style={{
        height: compact ? 28 : 34,
        padding: compact ? "0 10px" : "0 12px",
        borderRadius: T.r2,
        border: `1px solid ${border}`,
        background,
        color,
        fontFamily: T.fontMono,
        fontSize: compact ? 10.5 : 11.5,
        fontWeight: 600,
        cursor: "default",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      {label}
    </button>
  );
}

export function ScreenMetric({
  label,
  value,
  tone = "accent",
  note,
}: {
  label: string;
  value: string;
  tone?: Tone;
  note?: string;
}) {
  const { T } = useTheme();
  const palette = resolveTone(tone, T);
  return (
    <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, padding: "14px 16px" }}>
      <p style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 24, color: palette.color, margin: "0 0 4px" }}>{value}</p>
      <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 3px" }}>{label}</p>
      {note && <p style={{ fontFamily: T.fontBody, fontSize: 11.5, color: T.t1, lineHeight: 1.5, margin: 0 }}>{note}</p>}
    </div>
  );
}

export function ScreenCallout({
  title,
  body,
  tone = "accent",
  action,
}: {
  title: string;
  body: string;
  tone?: Tone;
  action?: ReactNode;
}) {
  const { T } = useTheme();
  const palette = resolveTone(tone, T);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        background: palette.dim,
        border: `1px solid ${palette.border}`,
        borderLeft: `2px solid ${palette.color}`,
        borderRadius: T.r2,
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: T.rFull, background: palette.color, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{title}</p>
        <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{body}</p>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

export function ScreenPanel({
  kicker,
  title,
  aside,
  children,
}: {
  kicker?: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.raised, border: `1px solid ${T.s1}`, borderRadius: T.r3, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          {kicker && <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 4px" }}>{kicker}</p>}
          <p style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 18, color: T.t0, margin: 0, letterSpacing: "-0.01em" }}>{title}</p>
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function ScreenField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      <div
        style={{
          minHeight: multiline ? 76 : 36,
          padding: multiline ? "10px 12px" : "0 12px",
          borderRadius: T.r2,
          background: T.base,
          border: `1px solid ${T.aStroke}`,
          display: "flex",
          alignItems: multiline ? "flex-start" : "center",
        }}
      >
        <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t0, lineHeight: 1.6 }}>{value}</span>
      </div>
    </div>
  );
}

export function ScreenDialog({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { T } = useTheme();
  return (
    <div
      style={{
        width: "min(520px, calc(100% - 32px))",
        background: T.overlay,
        border: `1px solid ${T.s2}`,
        borderTop: `2px solid ${T.accent}`,
        borderRadius: T.r4,
        boxShadow: T.shadow3,
        padding: "18px 20px",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 22, color: T.t0, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{title}</p>
        <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.t1, lineHeight: 1.6, margin: 0 }}>{subtitle}</p>
      </div>
      {children}
      {footer && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 16 }}>{footer}</div>}
    </div>
  );
}

export function RouteTabs({ active }: { active: "roles" | "companies" }) {
  const { T } = useTheme();
  const tabs = [
    { id: "roles", label: "Roles" },
    { id: "companies", label: "Companies" },
  ] as const;
  return (
    <div style={{ display: "inline-flex", gap: 6, padding: 4, background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.rFull }}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <div
            key={tab.id}
            style={{
              padding: "5px 10px",
              background: isActive ? T.accentDim : "transparent",
              border: `1px solid ${isActive ? T.aStroke : "transparent"}`,
              borderRadius: T.rFull,
            }}
          >
            <span style={{ fontFamily: T.fontMono, fontWeight: isActive ? 700 : 500, fontSize: 10.5, color: isActive ? T.accent : T.t1 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ScreenSearch({ label }: { label: string }) {
  const { T } = useTheme();
  return (
    <div style={{ height: 34, minWidth: 180, background: T.base, border: `1px solid ${T.s1}`, borderRadius: T.r2, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
      <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={T.t2} strokeWidth={1.5} strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t2 }}>{label}</span>
    </div>
  );
}

export function PhoneFrame({
  routeLabel,
  title,
  activeLabel,
  children,
}: {
  routeLabel: string;
  title: string;
  activeLabel: "Profile" | "Aspirations";
  children: ReactNode;
}) {
  const { T } = useTheme();
  const tabs = ["Dashboard", "Profile", "Aspirations", "Workspace"] as const;

  return (
    <div style={{ width: 390, background: T.bg, border: `1px solid ${T.s2}`, borderRadius: 28, overflow: "hidden", boxShadow: T.shadow3 }}>
      <div style={{ padding: "10px 18px 12px", background: T.base, borderBottom: `1px solid ${T.s1}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: T.fontMono, fontWeight: 700, fontSize: 10.5, color: T.t0 }}>09:41</span>
          <div style={{ width: 88, height: 6, borderRadius: T.rFull, background: T.s1 }} />
          <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2 }}>LTE</span>
        </div>
        <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: "0.08em", margin: "0 0 4px" }}>{routeLabel}</p>
        <p style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 22, color: T.t0, margin: 0, letterSpacing: "-0.02em" }}>{title}</p>
      </div>
      <div style={{ padding: "14px 16px 18px", minHeight: 680, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "10px 14px 16px", background: T.base, borderTop: `1px solid ${T.s1}` }}>
        {tabs.map((tab) => {
          const isActive = tab === activeLabel;
          return (
            <div key={tab} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? T.accentDim : "transparent", border: `1px solid ${isActive ? T.aStroke : "transparent"}` }} />
              <span style={{ fontFamily: T.fontMono, fontSize: 9.5, color: isActive ? T.accent : T.t2 }}>{tab}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScreenProposal({
  title,
  body,
  provenance,
  boundary,
}: {
  title: string;
  body: string;
  provenance: string;
  boundary: string;
}) {
  const { T } = useTheme();

  return (
    <div
      style={{
        padding: "12px 14px",
        background: T.warnDim,
        border: `1px solid ${T.warning}44`,
        borderLeft: `2px solid ${T.warning}`,
        borderRadius: T.r2,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ScreenTag label="Proposal" tone="warning" />
        <p
          style={{
            fontFamily: T.fontHead,
            fontWeight: 600,
            fontSize: 15,
            color: T.t0,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </p>
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 12.5, color: T.t1, lineHeight: 1.6, margin: 0 }}>{body}</p>
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>
            Provenance
          </p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, lineHeight: 1.55, margin: 0 }}>{provenance}</p>
        </div>
        <div>
          <p style={{ fontFamily: T.fontMono, fontSize: 10, color: T.t2, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>
            Privacy boundary
          </p>
          <p style={{ fontFamily: T.fontBody, fontSize: 12, color: T.t1, lineHeight: 1.55, margin: 0 }}>{boundary}</p>
        </div>
      </div>
    </div>
  );
}
