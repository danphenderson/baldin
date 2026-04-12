import React from 'react';
import {
  EmptyState as DesignSystemEmptyState,
  type EmptyStateAction,
} from '../../design-system';

export interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <DesignSystemEmptyState
      icon={icon}
      title={title}
      description={description}
      primaryAction={action}
      layout="page"
    />
  );
};

export default EmptyState;
