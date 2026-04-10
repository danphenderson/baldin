import React from 'react';
import { Box } from '@mui/material';
import { SmartToyOutlined as AgentsIcon } from '@mui/icons-material';
import EmptyState from '../component/common/empty-state';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';

const AgentsPage: React.FC = () => {
  usePageToolbarHeader('Agents', 'Automation copilots are not available yet');

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <EmptyState
        icon={<AgentsIcon />}
        title="Agents are not available yet"
        description="This area is reserved for future Baldin assistants that can help you coordinate network and outreach work."
      />
    </Box>
  );
};

export default AgentsPage;
