import React from 'react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, InlineFeedback, LoadingState } from '@/design-system';
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

describe('feedback primitives', () => {
  it('renders EmptyState copy and fires the primary action', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    renderWithTheme(
      <EmptyState
        icon={<span data-testid="empty-state-icon">+</span>}
        title="No saved searches yet"
        description="Create the first search to keep the pipeline moving."
        primaryAction={{ label: 'Create search', onClick: onCreate }}
      />,
    );

    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
    expect(screen.getByText('No saved searches yet')).toBeInTheDocument();
    expect(screen.getByText('Create the first search to keep the pipeline moving.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create search' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders InlineFeedback content and routes close actions through the shared alert shell', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = renderWithTheme(
      <InlineFeedback tone="warning" density="compact" transition="none" onClose={onClose}>
        Review the archived design note before migrating this shell.
      </InlineFeedback>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Review the archived design note before migrating this shell.');

    const closeButton = container.querySelector('.MuiAlert-action .MuiIconButton-root');
    expect(closeButton).not.toBeNull();

    await user.click(closeButton as HTMLButtonElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders LoadingState grid placeholders with the requested count and height', () => {
    const { container } = renderWithTheme(
      <LoadingState
        kind="grid"
        count={3}
        itemHeight={120}
        columns={{ xs: 1, sm: 2, md: 3 }}
      />,
    );

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveStyle({ height: '120px' });
  });
});
