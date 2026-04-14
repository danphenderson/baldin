import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@mui/material';
import {
  SurfaceDialog,
  SurfaceDialogActions,
  SurfaceDialogContent,
  SurfaceDialogTitle,
} from './surface-dialog';
import figmaSource from './SurfaceDialog.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { noop } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Surfaces/SurfaceDialog',
  component: SurfaceDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    ...figmaDesignParameters(figmaSource),
  },
  args: {
    open: true,
    onClose: noop,
    children: null,
  },
  subcomponents: {
    SurfaceDialogTitle,
    SurfaceDialogContent,
    SurfaceDialogActions,
  },
  render: () => (
    <SurfaceDialog open onClose={noop}>
      <SurfaceDialogTitle
        icon={<span aria-hidden="true">i</span>}
        subtitle="The shared dialog frame owns surface, padding, and section boundaries."
        actions={<Button size="small">Preview</Button>}
      >
        Review linked Figma update
      </SurfaceDialogTitle>
      <SurfaceDialogContent>
        Shared dialog content stays presentation-only. Feature modules still own routing, data loading, and mutation logic.
      </SurfaceDialogContent>
      <SurfaceDialogActions>
        <Button onClick={noop}>Cancel</Button>
        <Button onClick={noop} variant="contained">
          Accept changes
        </Button>
      </SurfaceDialogActions>
    </SurfaceDialog>
  ),
} satisfies Meta<typeof SurfaceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
