import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeProvider from '@/theme/theme-provider';
import { THEME_STORAGE_KEY } from '@/design-system/theme';
import { useThemeMode } from '@/theme/theme-provider';

const storage = new Map<string, string>();

const ThemeModeProbe: React.FC = () => {
  const { mode, toggleMode, setMode } = useThemeMode();

  return (
    <div>
      <span data-testid="theme-mode">{mode}</span>
      <button type="button" onClick={toggleMode}>
        Toggle
      </button>
      <button type="button" onClick={() => setMode('light')}>
        Set Light
      </button>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          storage.delete(key);
        }),
        clear: vi.fn(() => {
          storage.clear();
        }),
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('defaults to dark mode and keeps the Baldin storage key in sync', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeModeProbe />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId('theme-mode')).toHaveTextContent('dark');

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    });

    expect(storage.get(THEME_STORAGE_KEY)).toBe('light');
  });

  it('respects a stored light mode value', async () => {
    storage.set(THEME_STORAGE_KEY, 'light');

    render(
      <ThemeProvider>
        <ThemeModeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    });
  });
});
