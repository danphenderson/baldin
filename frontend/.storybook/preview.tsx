import React, { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import ThemeProvider from '../src/theme/theme-provider';
import { useThemeMode } from '../src/theme/theme-provider';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-sans-3/800.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

type StorybookThemeMode = 'light' | 'dark';

function ThemeModeSync({ mode }: { mode: StorybookThemeMode }) {
  const { mode: currentMode, setMode } = useThemeMode();

  useEffect(() => {
    if (currentMode !== mode) {
      setMode(mode);
    }
  }, [currentMode, mode, setMode]);

  return null;
}

const preview: Preview = {
  globalTypes: {
    themeMode: {
      name: 'Theme Mode',
      description: 'Baldin color scheme',
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true,
    },
    chromatic: {
      modes: {
        light: {
          globals: {
            themeMode: 'light',
          },
        },
        dark: {
          globals: {
            themeMode: 'dark',
          },
        },
      },
    },
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider>
        <ThemeModeSync mode={(context.globals.themeMode as StorybookThemeMode | undefined) ?? 'light'} />
        <MemoryRouter>
          <Box
            sx={{
              minHeight: '100vh',
              bgcolor: 'background.default',
              color: 'text.primary',
              p: { xs: 2, md: 4 },
            }}
          >
            <Story />
          </Box>
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
};

export default preview;
