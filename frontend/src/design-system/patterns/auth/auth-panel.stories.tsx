import type { Meta, StoryObj } from '@storybook/react-vite';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import { Button, Link, Stack, TextField, Typography } from '@mui/material';
import { AuthPanel } from './auth-panel';
import figmaSource from './AuthPanel.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookCenteredSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Patterns/AuthPanel',
  component: AuthPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    ...figmaDesignParameters(figmaSource),
  },
  render: (args) => (
    <StorybookCenteredSurface maxWidth={720}>
      <AuthPanel {...args} />
    </StorybookCenteredSurface>
  ),
} satisfies Meta<typeof AuthPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <AutoAwesomeIcon />,
    title: 'Welcome back',
    description: 'Sign in to review the latest leads, applications, and profile tasks.',
    footer: (
      <Typography variant="body2" color="text.secondary">
        Need access? <Link href="/">Request an invite</Link>
      </Typography>
    ),
    children: (
      <Stack component="form" spacing={2.5}>
        <TextField label="Email" type="email" fullWidth />
        <TextField label="Password" type="password" fullWidth />
        <Button type="submit" variant="brand" size="large">
          Continue
        </Button>
      </Stack>
    ),
  },
};
