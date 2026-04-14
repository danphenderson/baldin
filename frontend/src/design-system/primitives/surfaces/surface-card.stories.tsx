import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack, Typography } from '@mui/material';
import { SurfaceCard, SurfaceCardContent } from './surface-card';
import figmaSource from './SurfaceCard.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Surfaces/SurfaceCard',
  component: SurfaceCard,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: () => (
    <StorybookSurface maxWidth={520}>
      <SurfaceCard>
        <SurfaceCardContent density="comfortable">
          <Stack spacing={1.5}>
            <Typography variant="h6" fontWeight={700}>
              Shared shell ready
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SurfaceCard carries the canonical border, radius, and surface token treatment for feature-owned card bodies.
            </Typography>
            <Button variant="outlined" sx={{ alignSelf: 'flex-start' }}>
              Review contract
            </Button>
          </Stack>
        </SurfaceCardContent>
      </SurfaceCard>
    </StorybookSurface>
  ),
} satisfies Meta<typeof SurfaceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = {
  render: () => (
    <StorybookSurface maxWidth={520}>
      <SurfaceCard>
        <SurfaceCardContent density="spacious" centered>
          <Stack spacing={1.5} alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              No pending approvals
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Centered content stays available for empty and confirmation-ready surfaces.
            </Typography>
          </Stack>
        </SurfaceCardContent>
      </SurfaceCard>
    </StorybookSurface>
  ),
};
