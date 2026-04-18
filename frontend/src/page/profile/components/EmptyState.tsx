import React from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import { EmptyState as DesignSystemEmptyState } from '../../../design-system';

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  section: string;
  onAdd: () => void;
}> = ({ icon, section, onAdd }) => {
  return (
    <DesignSystemEmptyState
      icon={icon}
      title={`No ${section.toLowerCase()} yet`}
      description={
        section === 'Skills'
          ? 'Add skills manually or use the AI resume import above.'
          : `Add your ${section.toLowerCase()} to build a stronger profile.`
      }
      primaryAction={{
        label: `Add ${section.replace(/s$/, '')}`,
        onClick: onAdd,
        icon: <AddIcon />,
        buttonProps: { size: 'small' },
      }}
      layout="section"
      compact
    />
  );
};
