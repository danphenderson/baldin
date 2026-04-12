import React from 'react';
import {
  Box,
  Button,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { motion } from 'motion/react';
import { SectionCard, SectionHeader } from '../../../design-system';
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
  return (
    <MotionBox {...stagger} transition={{ duration: 0.25 }}>
      <SectionCard
        id={id}
        header={(
          <SectionHeader
            icon={icon}
            title={title}
            count={count}
            action={(
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={onAdd}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Add
              </Button>
            )}
            divider
            size="compact"
          />
        )}
      >
        {children}
      </SectionCard>
    </MotionBox>
  );
};
