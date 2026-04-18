/**
 * Slash-command floating menu for cell-doc editors.
 *
 * Rendered via ReactRenderer (outside main React tree).
 * Positioned with `position: fixed` using the suggestion plugin's clientRect.
 * Keyboard navigation (ArrowUp/Down/Enter/Escape) is forwarded from the
 * suggestion plugin via the imperative handle.
 *
 * data-testid="slash-command-menu" is on the outer Paper for test targeting.
 */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import type { SlashCommandItem } from '../extensions/slash-command-items';

export interface SlashCommandMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  clientRect: (() => DOMRect | null) | null;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  SlashCommandMenuProps
>(({ items, command, clientRect }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset selection when item list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement | undefined;
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent): boolean => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i > 0 ? i - 1 : items.length - 1));
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : 0));
        return true;
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
        return true;
      }
      // Escape: return false so the suggestion plugin handles natural dismissal
      return false;
    },
  }), [command, items, selectedIndex]);

  const rect = clientRect?.() ?? null;
  if (!rect || items.length === 0) return null;

  return (
    <Paper
      elevation={8}
      data-testid="slash-command-menu"
      sx={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        zIndex: 1400,
        maxHeight: 320,
        overflowY: 'auto',
        minWidth: 220,
      }}
    >
      <List
        ref={listRef}
        dense
        disablePadding
        role="listbox"
        aria-label="Slash command palette"
      >
        {items.map((item, index) => (
          <ListItemButton
            key={item.title}
            selected={index === selectedIndex}
            // Prevent the editor from blurring before onClick fires
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(item)}
            role="option"
            aria-selected={index === selectedIndex}
            sx={{ py: 0.75, px: 1.5 }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" fontWeight={500}>
                  {item.title}
                </Typography>
              }
              secondary={
                item.description ? (
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                ) : undefined
              }
              disableTypography
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
