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

  it('allows new legacy files when they are pure re-export shims', () => {
    const violations = lintFileContent({
      relPath: 'component/common/text.tsx',
      content: 'export * from "../../design-system/tokens/typography";',
      addedLegacyPaths: new Set(['component/common/text.tsx']),
    });

    expect(violations).toHaveLength(0);
  });
});
