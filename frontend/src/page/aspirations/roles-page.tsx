import React from 'react';
import { Box } from '@mui/material';
import { Badge as RolesIcon } from '@mui/icons-material';
import EmptyState from '../../component/common/empty-state';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';

const AspirationRolesPage: React.FC = () => {
  usePageToolbarHeader('Aspirations', 'Roles are not available yet');

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <EmptyState
        icon={<RolesIcon />}
        title="Role aspirations are not available yet"
        description="Use this space later to track the job titles and role profiles you want Baldin to optimize for."
      />
    </Box>
  );
};

export default AspirationRolesPage;
