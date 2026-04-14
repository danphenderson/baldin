import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack, Typography } from '@mui/material';
import { CardShell } from './card-shell';
import figmaSource from './CardShell.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface, noop } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Surfaces/CardShell',
  component: CardShell,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface maxWidth={560}>
      <CardShell {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof CardShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tone: 'primary',
    surface: 'raised',
    density: 'comfortable',
    children: (
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Surface migration review
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Reusable shells stay in `frontend/src/design-system/*` so route families can migrate without duplicating layout chrome.
        </Typography>
      </Stack>
    ),
  },
};

export const Interactive: Story = {
  args: {
    tone: 'success',
    surface: 'raised',
    interactive: true,
    onClick: noop,
    children: (
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Open design review
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Keyboard and hover treatment are part of the shared primitive, not reimplemented per feature.
        </Typography>
        <Button variant="text" sx={{ alignSelf: 'flex-start' }}>
          Inspect
        </Button>
      </Stack>
    ),
  },
};
