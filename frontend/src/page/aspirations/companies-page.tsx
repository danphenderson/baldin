import React from 'react';
import { Box } from '@mui/material';
import { BusinessOutlined as CompaniesIcon } from '@mui/icons-material';
import EmptyState from '../../component/common/empty-state';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';

const AspirationCompaniesPage: React.FC = () => {
  usePageToolbarHeader('Aspirations', 'Companies are not available yet');

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <EmptyState
        icon={<CompaniesIcon />}
        title="Company aspirations are not available yet"
        description="Use this space later to track the companies and employers you want Baldin to prioritize in your search."
      />
    </Box>
  );
};

export default AspirationCompaniesPage;
