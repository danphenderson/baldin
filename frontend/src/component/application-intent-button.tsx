import React, { useId, useState } from 'react';
import {
  Button,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  type ButtonProps,
  type MenuProps,
} from '@mui/material';
import {
  ArrowOutward as ApplyNowIcon,
  PersonAddAlt1 as RegisterInterestIcon,
} from '@mui/icons-material';
import { type ApplicationCreationIntent } from '../service/applications';

const INTENT_OPTIONS: Array<{
  value: ApplicationCreationIntent;
  label: string;
  description: string;
  icon: React.ReactElement;
}> = [
  {
    value: 'registered',
    label: 'Register interest',
    description: 'Track the lead first and move it into the active pipeline later.',
    icon: <RegisterInterestIcon fontSize="small" />,
  },
  {
    value: 'applied',
    label: 'Apply now',
    description: 'Create the application directly in the active pipeline.',
    icon: <ApplyNowIcon fontSize="small" />,
  },
];

interface ApplicationIntentButtonProps {
  label?: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onSelect: (intent: ApplicationCreationIntent) => void;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  startIcon?: ButtonProps['startIcon'];
  endIcon?: ButtonProps['endIcon'];
  sx?: ButtonProps['sx'];
}

const stopPropagation = (event: React.SyntheticEvent) => {
  event.stopPropagation();
};

const ApplicationIntentButton: React.FC<ApplicationIntentButtonProps> = ({
  label = 'Create Application',
  loadingLabel = 'Creating...',
  loading = false,
  disabled = false,
  ariaLabel,
  onSelect,
  variant = 'contained',
  size = 'medium',
  startIcon,
  endIcon,
  sx,
}) => {
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopPropagation(event);
    setAnchorEl(event.currentTarget);
  };

  const handleClose: NonNullable<MenuProps['onClose']> = (event) => {
    if (typeof (event as { stopPropagation?: () => void }).stopPropagation === 'function') {
      (event as { stopPropagation?: () => void }).stopPropagation?.();
    }
    setAnchorEl(null);
  };

  const handleSelect = (intent: ApplicationCreationIntent) => (event: React.MouseEvent<HTMLLIElement>) => {
    stopPropagation(event);
    setAnchorEl(null);
    onSelect(intent);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={startIcon}
        endIcon={endIcon}
        sx={sx}
        aria-label={ariaLabel ?? label}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open ? 'true' : undefined}
        disabled={disabled || loading}
        onMouseDown={stopPropagation}
        onClick={handleOpen}
      >
        {loading ? loadingLabel : label}
      </Button>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-label': 'Application creation intent choices',
          onClick: stopPropagation,
        }}
      >
        {INTENT_OPTIONS.map((option) => (
          <MenuItem key={option.value} onClick={handleSelect(option.value)}>
            <ListItemText
              primary={
                <Typography component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  {option.icon}
                  {option.label}
                </Typography>
              }
              secondary={option.description}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ApplicationIntentButton;
