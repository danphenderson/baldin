import { describe, expect, it } from 'vitest';
import { createBaldinTheme } from '../../../src/design-system/theme/create-baldin-theme';

describe('createBaldinTheme', () => {
  it.each(['light', 'dark'] as const)('exposes the extended Baldin token contract in %s mode', (mode) => {
    const theme = createBaldinTheme(mode);

    expect(theme.baldin.surface).toEqual({
      canvas: expect.any(String),
      base: expect.any(String),
      raised: expect.any(String),
      inset: expect.any(String),
      overlay: expect.any(String),
    });
    expect(theme.baldin.border).toEqual({
      subtle: expect.any(String),
      default: expect.any(String),
      strong: expect.any(String),
      accent: expect.any(String),
    });
    expect(theme.baldin.state).toEqual({
      hover: expect.any(String),
      selected: expect.any(String),
      pressed: expect.any(String),
      focusRing: expect.any(String),
    });
    expect(theme.palette.background.default).toBe(theme.baldin.surface.canvas);
    expect(theme.palette.background.paper).toBe(theme.baldin.surface.raised);
  });

  it('ships the dark-first reset palette', () => {
    const theme = createBaldinTheme('dark');

    expect(theme.palette.primary.main).toBe('#06b6d4');
    expect(theme.palette.secondary.main).toBe('#5b7cfa');
    expect(theme.baldin.surface.canvas).toBe('#07111d');
    expect(theme.baldin.surface.raised).toBe('#132235');
  });

  it('applies shared interaction overrides to outlined inputs, buttons, and list items', () => {
    const theme = createBaldinTheme('dark');
    const outlinedInput = theme.components?.MuiOutlinedInput?.styleOverrides?.root as Record<string, unknown> | undefined;
    const outlinedButton = theme.components?.MuiButton?.styleOverrides?.outlined as Record<string, unknown> | undefined;
    const listItemButton = theme.components?.MuiListItemButton?.styleOverrides?.root as Record<string, unknown> | undefined;

    expect(outlinedInput?.backgroundColor).toBe(theme.baldin.surface.inset);
    expect(
      (outlinedInput?.['& .MuiOutlinedInput-notchedOutline'] as { borderColor?: string } | undefined)?.borderColor,
    ).toBe(theme.baldin.border.default);
    expect((outlinedInput?.['&.Mui-focused'] as { boxShadow?: string } | undefined)?.boxShadow).toContain(
      theme.baldin.state.focusRing,
    );

    expect(outlinedButton?.borderColor).toBe(theme.baldin.border.default);
    expect(
      (outlinedButton?.['&:hover'] as { backgroundColor?: string } | undefined)?.backgroundColor,
    ).toBe(theme.baldin.state.hover);

    expect(
      (listItemButton?.['&.Mui-selected'] as { backgroundColor?: string } | undefined)?.backgroundColor,
    ).toBe(theme.baldin.state.selected);
  });
});
