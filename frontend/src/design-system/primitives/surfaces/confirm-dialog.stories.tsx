import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmDialog } from './confirm-dialog';
import figmaSource from './ConfirmDialog.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { noop } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Surfaces/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    ...figmaDesignParameters(figmaSource),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  args: {
    open: true,
    title: 'Delete generated summary?',
    message: 'This removes the draft summary from the current review queue. You can regenerate it later.',
    confirmLabel: 'Delete draft',
    cancelLabel: 'Keep draft',
    destructive: true,
    onConfirm: noop,
    onCancel: noop,
  },
};

export const Informational: Story = {
  args: {
    open: true,
    title: 'Publish library update?',
    message: 'Consumers will see the new shared surface once they review and accept the published change in Figma.',
    confirmLabel: 'Publish update',
    cancelLabel: 'Not yet',
    destructive: false,
    onConfirm: noop,
    onCancel: noop,
  },
};
