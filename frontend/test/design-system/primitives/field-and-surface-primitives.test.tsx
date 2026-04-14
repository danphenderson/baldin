import React from 'react';
import { Button, CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CollectionToolbar,
  ReadonlyField,
  SearchField,
  SurfaceCard,
  SurfaceCardContent,
  SurfaceDialog,
  SurfaceDialogContent,
  SurfaceDialogTitle,
} from '@/design-system';
import { createBaldinTheme } from '@/design-system/theme';

function renderWithTheme(node: React.ReactElement) {
  const theme = createBaldinTheme('dark');

  return render(
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {node}
    </MuiThemeProvider>,
  );
}

describe('field and surface primitives', () => {
  it('renders SearchField with the shared search adornment and merged slot props', () => {
    const { container } = renderWithTheme(
      <SearchField
        placeholder="Search companies"
        slotProps={{ htmlInput: { 'data-testid': 'search-input' } }}
      />,
    );

    expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Search companies');
    expect(container.querySelector('[data-testid="SearchIcon"]')).not.toBeNull();
  });

  it('renders ReadonlyField with a read-only input', () => {
    renderWithTheme(
      <ReadonlyField
        label="Selected file"
        value="resume.pdf"
      />,
    );

    expect(screen.getByDisplayValue('resume.pdf')).toHaveAttribute('readonly');
  });

  it('supports the spacious centered SurfaceCardContent preset', () => {
    renderWithTheme(
      <SurfaceCard>
        <SurfaceCardContent data-testid="surface-card-content" density="spacious" centered>
          Empty state
        </SurfaceCardContent>
      </SurfaceCard>,
    );

    expect(screen.getByTestId('surface-card-content')).toHaveStyle({
      padding: '28px',
      textAlign: 'center',
      alignItems: 'center',
    });
  });

  it('renders SurfaceDialogTitle slots for icon, subtitle, and actions', () => {
    renderWithTheme(
      <SurfaceDialog open onClose={() => {}}>
        <SurfaceDialogTitle
          icon={<span data-testid="dialog-icon">I</span>}
          subtitle="Shared subtitle"
          actions={<Button type="button">Dismiss</Button>}
        >
          Shared title
        </SurfaceDialogTitle>
        <SurfaceDialogContent>Dialog body</SurfaceDialogContent>
      </SurfaceDialog>,
    );

    expect(screen.getByTestId('dialog-icon')).toBeInTheDocument();
    expect(screen.getByText('Shared title')).toBeInTheDocument();
    expect(screen.getByText('Shared subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('keeps CollectionToolbar search, controls, actions, and secondary content in stable shared slots', () => {
    const { container } = renderWithTheme(
      <CollectionToolbar
        search={<SearchField placeholder="Search applications" />}
        controls={<Button type="button">Filters</Button>}
        actions={<Button type="button">New application</Button>}
        secondary={<span>Secondary filters</span>}
      />,
    );

    const searchSlot = container.querySelector('[data-collection-toolbar-slot="search"]');
    const controlsSlot = container.querySelector('[data-collection-toolbar-slot="controls"]');
    const actionsSlot = container.querySelector('[data-collection-toolbar-slot="actions"]');
    const secondarySlot = container.querySelector('[data-collection-toolbar-slot="secondary"]');

    expect(searchSlot).not.toBeNull();
    expect(searchSlot).toContainElement(screen.getByPlaceholderText('Search applications'));
    expect(controlsSlot).toContainElement(screen.getByRole('button', { name: 'Filters' }));
    expect(actionsSlot).toContainElement(screen.getByRole('button', { name: 'New application' }));
    expect(secondarySlot).toContainElement(screen.getByText('Secondary filters'));
  });
});
