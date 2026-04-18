import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Tab, Tabs, useTheme, alpha } from '@mui/material';
import type { SecondaryNavItem } from '../../route/navigation';
import { navigateInBrowser } from '../../util/browser-navigation';

export interface SecondaryNavBarProps {
  items: SecondaryNavItem[];
}

/**
 * Horizontal tab-bar rendered below the AppBar for group-level wayfinding.
 *
 * Scrollable on narrow viewports; hidden entirely when `items` is empty.
 */
const SecondaryNavBar: React.FC<SecondaryNavBarProps> = ({ items }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (items.length === 0) return null;

  // Determine the active tab by longest-prefix match against the current path.
  const activeIndex = items.reduce<number>((best, item, idx) => {
    const matches =
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`);
    if (!matches) return best;
    // Prefer longer (more specific) path.
    if (best === -1) return idx;
    return item.path.length > items[best].path.length ? idx : best;
  }, -1);

  // Fall back to first tab when nothing matches (shouldn't happen in practice).
  const value = activeIndex === -1 ? 0 : activeIndex;
  const handleNavigate = (item: SecondaryNavItem) => {
    if (item.navigationMode === 'browser') {
      navigateInBrowser(item.path);
      return;
    }

    navigate(item.path);
  };

  return (
    <Box
      component="nav"
      aria-label="Section navigation"
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(
          theme.palette.background.default,
          theme.palette.mode === 'dark' ? 0.6 : 0.85,
        ),
        backdropFilter: 'blur(8px)',
      }}
    >
      <Tabs
        value={value}
        onChange={(_e, newValue: number) => handleNavigate(items[newValue])}
        variant="scrollable"
        scrollButtons="auto"
        textColor="primary"
        indicatorColor="primary"
        sx={{
          minHeight: 40,
          px: 2,
          '& .MuiTab-root': {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8125rem',
            py: 0,
          },
        }}
      >
        {items.map((item) => (
          <Tab key={item.path} label={item.label} />
        ))}
      </Tabs>
    </Box>
  );
};

export default SecondaryNavBar;
