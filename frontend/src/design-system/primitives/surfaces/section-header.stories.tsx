import type { Meta, StoryObj } from '@storybook/react-vite';
import { Insights as InsightsIcon } from '@mui/icons-material';
import { Button } from '@mui/material';
import { SectionHeader } from './section-header';
import figmaSource from './SectionHeader.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Surfaces/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface maxWidth={760}>
      <SectionHeader {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof SectionHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <InsightsIcon />,
    title: 'Signal overview',
    supportingText: 'Track the components, stories, and route adopters tied back to the library source of truth.',
    count: '12',
    action: <Button size="small">Inspect</Button>,
    divider: true,
  },
};

export const Compact: Story = {
  args: {
    title: 'Recent updates',
    supportingText: 'Compact headers fit denser admin sections and side panels.',
    size: 'compact',
  },
};
