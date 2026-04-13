import React, { useEffect, useRef } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { Search as SearchIcon, KeyboardReturn as EnterIcon } from '@mui/icons-material';

export type CommandPaletteDisplaySection = 'recent' | 'actions' | 'navigation';

export interface CommandPaletteDisplayItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  renderSection: CommandPaletteDisplaySection;
}

export interface CommandPaletteDialogProps {
  open: boolean;
  query: string;
  items: CommandPaletteDisplayItem[];
  activeIndex: number;
  shortcutLabel: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: CommandPaletteDisplayItem) => void | Promise<void>;
}

const SECTION_LABELS: Record<CommandPaletteDisplaySection, string> = {
  recent: 'Recent',
  actions: 'Actions',
  navigation: 'Navigation',
};

const CommandPaletteDialog: React.FC<CommandPaletteDialogProps> = ({
  open,
  query,
  items,
  activeIndex,
  shortcutLabel,
  inputRef,
  onClose,
  onQueryChange,
  onActiveIndexChange,
  onSelect,
}) => {
  const optionRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handle = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(handle);
  }, [inputRef, open]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }

    const activeOption = optionRefs.current[activeIndex];
    if (activeOption && typeof activeOption.scrollIntoView === 'function') {
      activeOption.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (items.length === 0) {
        return;
      }
      onActiveIndexChange(activeIndex >= 0 ? (activeIndex + 1) % items.length : 0);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length === 0) {
        return;
      }
      onActiveIndexChange(activeIndex >= 0 ? (activeIndex - 1 + items.length) % items.length : items.length - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[activeIndex] ?? items[0];
      if (item) {
        await onSelect(item);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  let lastSection: CommandPaletteDisplaySection | null = null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        'data-command-palette-dialog': 'true',
        sx: {
          mt: { xs: 4, sm: 8 },
          alignSelf: 'flex-start',
          borderRadius: '12px',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Search routes and commands…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            inputProps={{ 'data-testid': 'command-palette-input' }}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              },
            }}
          />
        </Box>

        <Divider />

        <List
          role="listbox"
          aria-label="Command palette results"
          data-testid="command-palette-listbox"
          sx={{ py: 0, maxHeight: 420, overflowY: 'auto' }}
        >
          {items.length === 0 ? (
            <Box sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
              <Typography variant="body1" fontWeight={600}>
                No commands match
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Try another keyword or shortcut.
              </Typography>
            </Box>
          ) : (
            items.map((item, index) => {
              const sectionHeading = item.renderSection !== lastSection ? item.renderSection : null;
              lastSection = item.renderSection;

              return (
                <React.Fragment key={item.id}>
                  {sectionHeading && (
                    <Box sx={{ px: 2.5, pt: index === 0 ? 1.25 : 2, pb: 0.75 }}>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}
                      >
                        {SECTION_LABELS[sectionHeading]}
                      </Typography>
                    </Box>
                  )}
                  <ListItemButton
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    role="option"
                    aria-selected={index === activeIndex}
                    selected={index === activeIndex}
                    data-command-id={item.id}
                    onMouseEnter={() => onActiveIndexChange(index)}
                    onClick={() => void onSelect(item)}
                    sx={(theme) => ({
                      mx: 1,
                      mb: 0.5,
                      borderRadius: '8px',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      },
                    })}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 34,
                        color: 'primary.main',
                        mt: 0.25,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={item.subtitle}
                      primaryTypographyProps={{ fontWeight: 600 }}
                      secondaryTypographyProps={{ color: 'text.secondary' }}
                    />
                  </ListItemButton>
                </React.Fragment>
              );
            })
          )}
        </List>

        <Divider />

        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Open from anywhere with {shortcutLabel}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
            <Typography variant="caption">↑↓ move</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EnterIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption">run</Typography>
            </Box>
            <Typography variant="caption">Esc close</Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPaletteDialog;
