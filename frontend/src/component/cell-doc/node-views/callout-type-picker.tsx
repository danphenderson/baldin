import React, { useState } from 'react';
import {
  ErrorOutline,
  InfoOutlined,
  TipsAndUpdatesOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';

import type { CalloutType } from '../extensions/callout-types';
import { CALLOUT_TYPES } from '../extensions/callout-types';

const CALLOUT_META: Record<CalloutType, { icon: React.ReactElement; label: string }> = {
  info: { icon: <InfoOutlined fontSize="small" />, label: 'Info' },
  warning: { icon: <WarningAmberOutlined fontSize="small" />, label: 'Warning' },
  tip: { icon: <TipsAndUpdatesOutlined fontSize="small" />, label: 'Tip' },
  danger: { icon: <ErrorOutline fontSize="small" />, label: 'Danger' },
};

interface CalloutTypePickerProps {
  value: CalloutType;
  color: string;
  disabled?: boolean;
  onChange: (nextType: CalloutType) => void;
}

export const CalloutTypePicker: React.FC<CalloutTypePickerProps> = ({
  value,
  color,
  disabled = false,
  onChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const meta = CALLOUT_META[value] ?? CALLOUT_META.info;
  const isOpen = !!anchorEl;

  const handleSelect = (nextType: CalloutType) => {
    onChange(nextType);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={`Type: ${meta.label}`} arrow>
        <span>
          <IconButton
            size="small"
            onClick={(event) => setAnchorEl(event.currentTarget)}
            disabled={disabled}
            aria-label={`Callout type: ${meta.label}`}
            data-testid="callout-type-picker"
            sx={{ alignSelf: 'flex-start', color }}
          >
            {meta.icon}
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{ 'aria-label': 'Callout type menu' }}
      >
        {CALLOUT_TYPES.map((calloutType) => {
          const option = CALLOUT_META[calloutType];
          return (
            <MenuItem
              key={calloutType}
              selected={calloutType === value}
              onClick={() => handleSelect(calloutType)}
            >
              <ListItemIcon>{option.icon}</ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
