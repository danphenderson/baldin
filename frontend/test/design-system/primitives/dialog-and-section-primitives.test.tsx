import React from 'react';
import { Button, CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, FormDialogShell, SectionCard, SectionHeader } from '@/design-system';
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

describe('dialog and section primitives', () => {
  it('renders SectionHeader slots and optional divider content', () => {
    const { container } = renderWithTheme(
      <SectionHeader
        icon={<span data-testid="section-icon">I</span>}
        title="Saved roles"
        count={4}
        supportingText="Pinned roles from the current v2.1 profile."
        action={<Button type="button">Manage</Button>}
        divider
      />,
    );

    expect(screen.getByTestId('section-icon')).toBeInTheDocument();
    expect(screen.getByText('Saved roles')).toBeInTheDocument();
    expect(screen.getByText('Pinned roles from the current v2.1 profile.')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument();
    expect(container.querySelector('.MuiDivider-root')).not.toBeNull();
  });

  it('renders SectionCard header and body content inside the shared shell', () => {
    renderWithTheme(
      <SectionCard
        id="saved-searches"
        data-testid="section-card"
        density="compact"
        header={<SectionHeader title="Saved searches" />}
      >
        <div>Search body</div>
      </SectionCard>,
    );

    expect(screen.getByTestId('section-card')).toHaveAttribute('id', 'saved-searches');
    expect(screen.getByText('Saved searches')).toBeInTheDocument();
    expect(screen.getByText('Search body')).toBeInTheDocument();
  });

  it('keeps FormDialogShell dismiss controls disabled while busy', () => {
    renderWithTheme(
      <FormDialogShell
        open
        onClose={() => {}}
        title="Edit preferences"
        subtitle="Keep the shared dialog shell stable."
        busy
        headerActions={<Button type="button">Pin</Button>}
        actions={<Button type="button">Save</Button>}
      >
        <div>Dialog content</div>
      </FormDialogShell>,
    );

    expect(screen.getByRole('dialog', { name: /Edit preferences/ })).toBeInTheDocument();
    expect(screen.getByText('Keep the shared dialog shell stable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeDisabled();
  });

  it('fires ConfirmDialog callbacks through the shared action buttons', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    renderWithTheme(
      <ConfirmDialog
        open
        title="Archive the legacy shell?"
        message="This removes the old wrapper from active use."
        confirmLabel="Archive"
        cancelLabel="Keep"
        destructive={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Archive the legacy shell?' })).toBeInTheDocument();
    expect(screen.getByText('This removes the old wrapper from active use.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    await user.click(screen.getByRole('button', { name: 'Archive' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
