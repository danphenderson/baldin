import React, { useMemo, useRef, useState } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommandPaletteDialog, { type CommandPaletteDisplayItem } from './command-palette-dialog';

const SAMPLE_ITEMS: CommandPaletteDisplayItem[] = [
  {
    id: 'recent:new-document',
    title: 'New Document',
    subtitle: '/workspace/new',
    icon: <span aria-hidden="true">D</span>,
    renderSection: 'recent',
  },
  {
    id: 'action:new-workflow',
    title: 'New Workflow',
    subtitle: 'Create an orchestration workflow',
    icon: <span aria-hidden="true">W</span>,
    renderSection: 'actions',
  },
  {
    id: 'navigation:messages',
    title: 'Messages',
    subtitle: '/network/messages',
    icon: <span aria-hidden="true">M</span>,
    renderSection: 'navigation',
  },
];

const Harness: React.FC<{
  items?: CommandPaletteDisplayItem[];
  onSelect?: (item: CommandPaletteDisplayItem) => void | Promise<void>;
}> = ({ items = SAMPLE_ITEMS, onSelect = vi.fn() }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredItems = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return items;
    }

    return items.filter((item) => (
      item.title.toLowerCase().includes(trimmedQuery)
      || item.subtitle?.toLowerCase().includes(trimmedQuery)
    ));
  }, [items, query]);

  return (
    <CommandPaletteDialog
      open
      query={query}
      items={filteredItems}
      activeIndex={activeIndex}
      shortcutLabel="Ctrl+K"
      inputRef={inputRef}
      onClose={vi.fn()}
      onQueryChange={(value) => {
        setQuery(value);
        setActiveIndex(0);
      }}
      onActiveIndexChange={setActiveIndex}
      onSelect={onSelect}
    />
  );
};

describe('CommandPaletteDialog', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => 'light'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
  });

  it('renders grouped sections and auto-focuses the search input', async () => {
    render(<Harness />);

    const input = await screen.findByTestId('command-palette-input');
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();

    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('wraps keyboard navigation and executes the highlighted command on Enter', async () => {
    const handleSelect = vi.fn();
    render(<Harness onSelect={handleSelect} />);

    const input = await screen.findByTestId('command-palette-input');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'navigation:messages' }));
  });

  it('updates the active row on hover and keeps filtered groups in the correct order', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<Harness onSelect={handleSelect} />);

    const input = await screen.findByTestId('command-palette-input');
    await user.type(input, 'workflow');

    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.queryByText('Navigation')).not.toBeInTheDocument();

    const item = screen.getByRole('option', { name: /new workflow/i });
    fireEvent.mouseEnter(item);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'action:new-workflow' }));
  });

  it('renders an empty state when no commands match', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = await screen.findByTestId('command-palette-input');
    await user.type(input, 'missing');

    expect(screen.getByText('No commands match')).toBeInTheDocument();
  });
});
