import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '@mui/material';
import {
  Caption,
  CardTitle,
  Label,
  Mono,
  Overline,
  PageTitle,
  SectionTitle,
} from './text';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Typography/Text',
  tags: ['autodocs'],
  render: () => (
    <StorybookSurface maxWidth={720}>
      <Stack spacing={2}>
        <Overline>Library typography</Overline>
        <PageTitle>Design-system source of truth</PageTitle>
        <SectionTitle>Shared headings map back to exported token roles</SectionTitle>
        <CardTitle>Card-level emphasis stays neutral and reusable</CardTitle>
        <Label>Section label</Label>
        <Caption>Caption copy stays on the token-backed body scale.</Caption>
        <Mono>frontend/src/design-system/primitives/typography/text.tsx</Mono>
      </Stack>
    </StorybookSurface>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
