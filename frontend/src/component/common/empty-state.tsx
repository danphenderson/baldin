import React from 'react';
import { Box, Typography, Button, SvgIcon } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

export interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactElement };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const theme = useTheme();

  return (
    <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 10 } }}>
      {React.cloneElement(icon as React.ReactElement<React.ComponentProps<typeof SvgIcon>>, {
        sx: {
          fontSize: { xs: 40, sm: 56 },
          color: alpha(theme.palette.primary.main, 0.3),
          mb: 2,
          ...((icon.props as Record<string, unknown>).sx ?? {}),
        },
      })}
      <Typography variant="h6" color="text.secondary" fontWeight={600}>
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: action ? 3 : 0, maxWidth: 360, mx: 'auto', mt: 0.5 }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant="outlined"
          startIcon={action.icon}
          onClick={action.onClick}
          sx={{ mt: description ? 0 : 3 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
