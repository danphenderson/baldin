import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Typography } from '@mui/material';
import { InlineFeedback } from './inline-feedback';
import figmaSource from './InlineFeedback.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Feedback/InlineFeedback',
  component: InlineFeedback,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface maxWidth={720}>
      <InlineFeedback {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof InlineFeedback>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    tone: 'info',
    variant: 'soft',
    children: 'Figma-linked stories are the fastest way to catch design drift before route-level work ships.',
  },
};

export const RichContent: Story = {
  args: {
    tone: 'success',
    variant: 'outlined',
    children: (
      <Stack spacing={0.5}>
        <Typography variant="body2" fontWeight={700}>
          Library component updated
        </Typography>
        <Typography variant="body2">
          The latest `SectionCard` change is ready to publish from `Baldin-Library` and link back to Storybook.
        </Typography>
      </Stack>
    ),
  },
};
