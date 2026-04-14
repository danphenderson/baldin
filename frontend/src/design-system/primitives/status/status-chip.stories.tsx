import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '@mui/material';
import { StatusChip } from './status-chip';
import figmaSource from './StatusChip.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Status/StatusChip',
  component: StatusChip,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  args: {
    label: 'Ready',
    tone: 'success',
    emphasis: 'soft',
    size: 'small',
  },
  render: (args) => (
    <StorybookSurface>
      <StatusChip {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof StatusChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const ToneMatrix: Story = {
  render: () => (
    <StorybookSurface>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <StatusChip label="Neutral" tone="neutral" emphasis="soft" />
        <StatusChip label="Primary" tone="primary" emphasis="soft" />
        <StatusChip label="Success" tone="success" emphasis="soft" />
        <StatusChip label="Warning" tone="warning" emphasis="outline" />
        <StatusChip label="Danger" tone="danger" emphasis="solid" />
        <StatusChip label="Info" tone="info" emphasis="soft" />
      </Stack>
    </StorybookSurface>
  ),
};
