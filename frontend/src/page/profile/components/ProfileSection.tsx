import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, useTheme, alpha,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { motion } from 'motion/react';
import { stagger } from '../constants';

const MotionBox = motion.create(Box);

interface ProfileSectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  id,
  icon,
  title,
  count,
  onAdd,
  children,
}) => {
  const theme = useTheme();

  return (
    <MotionBox {...stagger} transition={{ duration: 0.25 }}>
      <Card id={id} sx={{ borderRadius: 3, overflow: 'visible' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {title}
          </Typography>
          <Chip
            label={count}
            size="small"
            sx={{
              height: 22,
              minWidth: 22,
              fontSize: '0.72rem',
              fontWeight: 700,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          />
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Add
          </Button>
        </Box>

        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {children}
        </CardContent>
      </Card>
    </MotionBox>
  );
};
