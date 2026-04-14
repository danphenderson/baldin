import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckCircleOutline as CheckCircleOutlineIcon, PendingActions as PendingActionsIcon, Stars as StarsIcon } from '@mui/icons-material';
import { MetricStrip } from './metric-strip';
import figmaSource from './MetricStrip.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface, noop } from '@/design-system/storybook/storybook-shell';

const items = [
  {
    label: 'Open leads',
    value: 24,
    icon: <PendingActionsIcon fontSize="small" />,
    onClick: noop,
  },
  {
    label: 'Qualified',
    value: 8,
    color: 'var(--mui-palette-success-main)',
    icon: <CheckCircleOutlineIcon fontSize="small" />,
    onClick: noop,
  },
  {
    label: 'Signal score',
    value: '92%',
    color: 'var(--mui-palette-secondary-main)',
    icon: <StarsIcon fontSize="small" />,
  },
];

const meta = {
  title: 'Design System/Patterns/MetricStrip',
  component: MetricStrip,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface>
      <MetricStrip {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof MetricStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  args: {
    variant: 'inline',
    items,
  },
};

export const Card: Story = {
  args: {
    variant: 'card',
    items,
  },
};
