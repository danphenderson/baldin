import { describe, expect, it } from 'vitest';
import { brandGradient } from '../../../src/design-system/tokens/effects';
import { createBaldinTheme } from '../../../src/design-system/theme/create-baldin-theme';

describe('createBaldinTheme', () => {
  it('builds a CSS variable theme with both color schemes and a dark default', () => {
    const theme = createBaldinTheme();
    const lightScheme = theme.colorSchemes?.light as (typeof theme & { baldin: typeof theme.baldin }) | undefined;
    const darkScheme = theme.colorSchemes?.dark as (typeof theme & { baldin: typeof theme.baldin }) | undefined;

    expect(theme.defaultColorScheme).toBe('dark');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.baldin.surface.canvas).toBe('#07111d');
    expect(theme.baldin.surface.raised).toBe('#132235');
    expect(lightScheme?.palette.mode).toBe('light');
    expect(darkScheme?.palette.mode).toBe('dark');
    expect(lightScheme?.baldin.surface.canvas).toBe('#f3f7fb');
    expect(darkScheme?.baldin.surface.canvas).toBe('#07111d');
  });

  it('allows the default color scheme to be set to light for tests and embedded surfaces', () => {
    const theme = createBaldinTheme('light');

    expect(theme.defaultColorScheme).toBe('light');
    expect(theme.palette.mode).toBe('light');
    expect(theme.baldin.surface.canvas).toBe('#f3f7fb');
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
    const brandVariant = theme.components?.MuiButton?.variants?.find((variant) => {
      const props = variant.props;

      return typeof props !== 'function' && props.variant === 'brand';
    }) as { style?: Record<string, unknown> } | undefined;

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
    expect(brandVariant?.style?.background).toBe(brandGradient(theme));

    expect(
      (listItemButton?.['&.Mui-selected'] as { backgroundColor?: string } | undefined)?.backgroundColor,
    ).toBe(theme.baldin.state.selected);
  });
});
