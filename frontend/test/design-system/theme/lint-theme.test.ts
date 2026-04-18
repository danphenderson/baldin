import { describe, expect, it } from 'vitest';
import { lintFileContent } from '../../../scripts/lint-theme.mjs';

describe('lint-theme', () => {
  it('allows raw theme definitions inside the design-system token layer', () => {
    const violations = lintFileContent({
      relPath: 'design-system/tokens/effects.ts',
      content: 'const gradient = "linear-gradient(90deg, #000000, #ffffff)";',
    });

    expect(violations).toHaveLength(0);
  });

  it('flags raw gradients outside the token helper file', () => {
    const violations = lintFileContent({
      relPath: 'page/login.tsx',
      content: 'const style = { background: "linear-gradient(90deg, red, blue)" };',
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-raw-gradient');
  });

  it('flags raw font-family strings outside the typography token layer', () => {
    const violations = lintFileContent({
      relPath: 'page/crawlers.tsx',
      content: 'const style = { fontFamily: "monospace" };',
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-raw-font-family');
  });

  it('allows token-based font-family references', () => {
    const violations = lintFileContent({
      relPath: 'page/crawlers.tsx',
      content: 'const style = { fontFamily: monoFontFamily };',
    });

    expect(violations).toHaveLength(0);
  });

  it('flags static style object literals outside the legacy compatibility shims', () => {
    const violations = lintFileContent({
      relPath: 'page/settings.tsx',
      content: '<Paper style={{ maxHeight: "400px", overflow: "auto" }} />;',
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-static-style-prop');
  });

  it('allows runtime-computed style objects and legacy compatibility wrappers', () => {
    const runtimeStyleViolations = lintFileContent({
      relPath: 'page/dashboard.tsx',
      content: '<Box style={style} />;',
    });
    const legacyStyleViolations = lintFileContent({
      relPath: 'component/common/json-modal.tsx',
      content: '<Paper style={{ maxHeight: "400px", overflow: "auto" }} />;',
    });

    expect(runtimeStyleViolations).toHaveLength(0);
    expect(legacyStyleViolations).toHaveLength(0);
  });

  it('flags non-zero numeric borderRadius outside the theme and token layers', () => {
    const violations = lintFileContent({
      relPath: 'page/login.tsx',
      content: 'const style = { borderRadius: 2 };',
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-numeric-border-radius');
  });

  it('allows zero-valued numeric borderRadius for flat surfaces', () => {
    const violations = lintFileContent({
      relPath: 'layout/home-layout.tsx',
      content: 'const style = { borderRadius: 0 };',
    });

    expect(violations).toHaveLength(0);
  });

  it('allows explicit pixel string borderRadius values in feature code', () => {
    const violations = lintFileContent({
      relPath: 'page/login.tsx',
      content: "const style = { borderRadius: '12px' };",
    });

    expect(violations).toHaveLength(0);
  });

  it('flags object-typed sx props in canonical design-system files', () => {
    const violations = lintFileContent({
      relPath: 'design-system/primitives/surfaces/brand-card.tsx',
      content: 'interface Props { sx?: object; }',
    });

    expect(violations.map((violation) => violation.rule)).toContain('prefer-typed-sx-prop');
  });

  it('allows typed sx props in canonical design-system files', () => {
    const violations = lintFileContent({
      relPath: 'design-system/primitives/surfaces/brand-card.tsx',
      content: 'interface Props { sx?: SxProps<Theme>; }',
    });

    expect(violations).toHaveLength(0);
  });

  it('flags legacy InputProps and PaperProps escapes in new shared surfaces', () => {
    const violations = lintFileContent({
      relPath: 'design-system/primitives/surfaces/brand-dialog.tsx',
      content: '<Dialog PaperProps={{ sx: { mt: 1 } }} />;',
    });

    expect(violations.map((violation) => violation.rule)).toContain('prefer-slot-props');
  });

  it('allows the existing shared-surface slot-prop exceptions while they are still being migrated', () => {
    const violations = lintFileContent({
      relPath: 'design-system/primitives/surfaces/surface-dialog.tsx',
      content: '<Dialog PaperProps={{ sx: { mt: 1 } }} />;',
    });

    expect(violations).toHaveLength(0);
  });

  it('allows percentage borderRadius values for circles', () => {
    const violations = lintFileContent({
      relPath: 'page/dashboard.tsx',
      content: "const style = { borderRadius: '50%' };",
    });

    expect(violations).toHaveLength(0);
  });

  it('allows toRadiusPx(...) in feature code and numeric radii in the theme layer', () => {
    const featureViolations = lintFileContent({
      relPath: 'page/dashboard.tsx',
      content: 'const style = { borderRadius: toRadiusPx(radiusTokens.lg) };',
    });
    const themeViolations = lintFileContent({
      relPath: 'design-system/theme/components.ts',
      content: 'const style = { borderRadius: 2 };',
    });

    expect(featureViolations).toHaveLength(0);
    expect(themeViolations).toHaveLength(0);
  });

  it('flags new legacy shared files that are not re-export shims', () => {
    const violations = lintFileContent({
      relPath: 'component/common/new-banner.tsx',
      content: 'export default function Banner() { return null; }',
      addedLegacyPaths: new Set(['component/common/new-banner.tsx']),
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-new-legacy-shared-ui');
  });

  it('allows a pure re-export shim when a temporary bridge is explicitly needed', () => {
    const violations = lintFileContent({
      relPath: 'component/common/temporary-bridge.tsx',
      content: 'export * from "../../design-system/tokens/typography";',
      addedLegacyPaths: new Set(['component/common/temporary-bridge.tsx']),
    });

    expect(violations).toHaveLength(0);
  });

  it('flags legacy wrapper imports in feature code', () => {
    const violations = lintFileContent({
      relPath: 'page/dashboard.tsx',
      content: 'import EmptyState from "../component/common/empty-state";',
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-legacy-shared-import');
  });

  it('flags deleted theme shim imports in feature code', () => {
    const violations = lintFileContent({
      relPath: 'page/dashboard.tsx',
      content: 'import { brandGradient } from "../theme/effects";',
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-legacy-shared-import');
  });

  it('flags direct MUI shell imports outside the shared layer', () => {
    const violations = lintFileContent({
      relPath: 'page/connections.tsx',
      content: 'import { Box, Card, Chip, Dialog } from "@mui/material";',
    });

    expect(violations.map((violation) => violation.rule)).toContain('no-direct-mui-shell-import');
  });

  it('allows direct MUI shell imports inside design-system files', () => {
    const violations = lintFileContent({
      relPath: 'design-system/primitives/surfaces/surface-dialog.tsx',
      content: 'import { Dialog, DialogContent, DialogTitle, DialogActions } from "@mui/material";',
    });

    expect(violations).toHaveLength(0);
  });

  it('allows direct MUI shell imports in notification context', () => {
    const violations = lintFileContent({
      relPath: 'context/notification-context.tsx',
      content: 'import { Chip } from "@mui/material";',
    });

    expect(violations).toHaveLength(0);
  });
});
