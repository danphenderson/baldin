import type { Meta, StoryObj } from '@storybook/react-vite';
import { Add as AddIcon, SearchOff as SearchOffIcon } from '@mui/icons-material';
import { EmptyState } from './empty-state';
import figmaSource from './EmptyState.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookCenteredSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookCenteredSurface>
      <EmptyState {...args} />
    </StorybookCenteredSurface>
  ),
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Page: Story = {
  args: {
    icon: <SearchOffIcon />,
    title: 'No matches yet',
    description: 'Tighten your profile signal or broaden filters to surface more relevant opportunities.',
    layout: 'page',
    primaryAction: {
      label: 'Add preferences',
      onClick: () => {},
      icon: <AddIcon />,
    },
  },
};

export const Section: Story = {
  args: {
    icon: <SearchOffIcon />,
    title: 'Nothing to review',
    description: 'This section will repopulate as soon as new candidate signals arrive.',
    layout: 'section',
    compact: true,
  },
};
