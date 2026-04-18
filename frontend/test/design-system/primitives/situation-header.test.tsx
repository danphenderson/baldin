import React from 'react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SituationHeader } from '@/design-system';
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

describe('SituationHeader', () => {
  it('renders lead, context, actions, and footer content in stable slots', () => {
    const { container } = renderWithTheme(
      <SituationHeader
        title="Aspirations"
        titleVariant="compact"
        supportingText="Track what Baldin should optimize for next."
        lead={<span data-testid="lead-node">L</span>}
        context={<button type="button">Roles</button>}
        actions={<button type="button">Add role</button>}
        footer={<span>Metric strip placeholder</span>}
        divider
      />,
    );

    expect(screen.getByText('Aspirations')).toBeInTheDocument();
    expect(screen.getByText('Track what Baldin should optimize for next.')).toBeInTheDocument();
    expect(screen.getByTestId('lead-node')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add role' })).toBeInTheDocument();
    expect(screen.getByText('Metric strip placeholder')).toBeInTheDocument();
    expect(container.querySelector('[data-situation-header-slot="connector"]')).not.toBeNull();
  });
});
