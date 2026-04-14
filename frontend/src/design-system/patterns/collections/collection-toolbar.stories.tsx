import type { Meta, StoryObj } from '@storybook/react-vite';
import { Add as AddIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { CollectionToolbar } from './collection-toolbar';
import figmaSource from './CollectionToolbar.figma.ts?raw';
import { SearchField } from '@/design-system';
import { figmaDesignParameters } from '@/design-system/storybook/figma';
import { StorybookSurface } from '@/design-system/storybook/storybook-shell';

const meta = {
  title: 'Design System/Patterns/CollectionToolbar',
  component: CollectionToolbar,
  tags: ['autodocs'],
  parameters: figmaDesignParameters(figmaSource),
  render: (args) => (
    <StorybookSurface>
      <CollectionToolbar {...args} />
    </StorybookSurface>
  ),
} satisfies Meta<typeof CollectionToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    search: <SearchField fullWidth placeholder="Search applicants" />,
    controls: (
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <TextField select label="Status" size="small" defaultValue="active" sx={{ minWidth: 160 }}>
          <MenuItem value="active">Active only</MenuItem>
          <MenuItem value="all">All applicants</MenuItem>
        </TextField>
        <Button startIcon={<FilterListIcon />} variant="outlined">
          Filters
        </Button>
      </Stack>
    ),
    actions: (
      <Button startIcon={<AddIcon />} variant="brand">
        New collection
      </Button>
    ),
    secondary: (
      <Typography variant="body2" color="text.secondary">
        18 active candidates across 4 open pipelines.
      </Typography>
    ),
  },
};
