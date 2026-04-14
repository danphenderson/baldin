import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReadonlyField } from './text-field';
import figmaSource from './ReadonlyField.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Fields/ReadonlyField',
  component: ReadonlyField,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface maxWidth={420}>
      <ReadonlyField {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof ReadonlyField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Primary email',
    value: 'designer@baldin.dev',
    fullWidth: true,
  },
};

export const Empty: Story = {
  args: {
    label: 'Portfolio URL',
    value: '',
    placeholder: 'Not added yet',
    fullWidth: true,
  },
};
