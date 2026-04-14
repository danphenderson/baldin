import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Stack, TextField } from '@mui/material';
import { FormDialogShell } from './form-dialog-shell';
import figmaSource from './FormDialogShell.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { noop } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Surfaces/FormDialogShell',
  component: FormDialogShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    ...figmaDesignParameters(figmaSource),
  },
} satisfies Meta<typeof FormDialogShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onClose: noop,
    title: 'Create saved search',
    subtitle: 'Shared shell, feature-owned body and submit behavior.',
    actions: (
      <>
        <Button onClick={noop}>Cancel</Button>
        <Button onClick={noop} variant="contained">
          Save search
        </Button>
      </>
    ),
    children: (
      <Stack spacing={2}>
        <TextField label="Search name" fullWidth defaultValue="Product design leaders" />
        <TextField label="Keywords" fullWidth defaultValue="design systems, growth, hiring" />
      </Stack>
    ),
  },
};
