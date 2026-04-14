import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingState } from './loading-state';
import figmaSource from './LoadingState.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Feedback/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface>
      <LoadingState {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof LoadingState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const List: Story = {
  args: {
    kind: 'list',
    count: 4,
    itemHeight: 88,
  },
};

export const Grid: Story = {
  args: {
    kind: 'grid',
    count: 4,
    itemHeight: 180,
    columns: { xs: 1, sm: 2, md: 2 },
  },
};

export const Section: Story = {
  args: {
    kind: 'section',
    count: 3,
    itemHeight: 160,
  },
};
