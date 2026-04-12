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
