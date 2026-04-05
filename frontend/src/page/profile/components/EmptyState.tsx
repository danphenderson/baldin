import React from 'react';
import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  section: string;
  onAdd: () => void;
}> = ({ icon, section, onAdd }) => {
  const theme = useTheme();
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Box sx={{
        display: 'inline-flex', p: 2, borderRadius: '50%', mb: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      }}>
        {icon}
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        No {section.toLowerCase()} yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 320, mx: 'auto' }}>
        {section === 'Skills'
          ? 'Add skills manually or use the AI resume import above.'
          : `Add your ${section.toLowerCase()} to build a stronger profile.`}
      </Typography>
      <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>
        Add {section.replace(/s$/, '')}
      </Button>
    </Box>
  );
};
