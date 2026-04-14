import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchField } from './text-field';
import figmaSource from './SearchField.figma.ts?raw';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Primitives/Fields/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface maxWidth={420}>
      <SearchField {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof SearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Search leads, applications, or companies',
    fullWidth: true,
  },
};

export const Filled: Story = {
  args: {
    placeholder: 'Search leads, applications, or companies',
    defaultValue: 'Product designer',
    fullWidth: true,
  },
};
