import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack, Typography } from '@mui/material';
import { SectionCard } from './section-card';
import figmaSource from './SectionCard.figma.ts?raw';
import { SectionHeader } from '@/design-system';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Patterns/SectionCard',
  component: SectionCard,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface maxWidth={760}>
      <SectionCard {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof SectionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    header: (
      <SectionHeader
        title="Profile readiness"
        count="3"
        supportingText="Finish the remaining setup steps to unlock more tailored matches."
        action={<Button size="small">Review</Button>}
        divider
      />
    ),
    children: (
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          Add a preferred role, verify your profile summary, and upload a tailored resume.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Shared shells stay in the design system while feature copy and workflow state remain local.
        </Typography>
      </Stack>
    ),
  },
};
