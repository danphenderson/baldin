import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { DARK, LIGHT, type Theme } from "./op";

// ─────────────────────────────────────────────────────────────────────────────
// CSS custom property sync
// Stroke tokens (s0/s1/s2) use rgba() values that Figma's color parser
// misreads when it finds multiple instances in `border` shorthands across
// the element tree. We expose them as CSS variables instead — the browser
// resolves the actual rgba at paint time; Figma only ever sees var(--op-s*).
// ─────────────────────────────────────────────────────────────────────────────
function syncCSSVars(theme: Theme) {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  r.style.setProperty("--op-s0", theme.s0);
  r.style.setProperty("--op-s1", theme.s1);
  r.style.setProperty("--op-s2", theme.s2);
}

// Set DARK defaults synchronously at module load so borders are correct
// on the very first render (before any useEffect fires).
syncCSSVars(DARK);

// ─────────────────────────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────────────────────────
interface ThemeCtx {
  T:      Theme;
  mode:   "dark" | "light";
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  T:      DARK,
  mode:   "dark",
  toggle: () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const base = mode === "dark" ? DARK : LIGHT;

  // Keep CSS variables in sync whenever the theme changes.
  useEffect(() => {
    syncCSSVars(base);
  }, [base]);

  // Override the stroke tokens so every component receives CSS variable
  // references. All border/divider properties will emit e.g.
  //   border: "1px solid var(--op-s1)"
  // instead of the raw rgba string, avoiding the Figma color-parser issue.
  const T: Theme = {
    ...base,
    s0: "var(--op-s0)",
    s1: "var(--op-s1)",
    s2: "var(--op-s2)",
  };

  return (
    <Ctx.Provider value={{ T, mode, toggle: () => setMode(m => m === "dark" ? "light" : "dark") }}>
      {children}
    </Ctx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — call inside any component inside ThemeProvider
// ─────────────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(Ctx);
}
