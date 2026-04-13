import React, { useMemo } from 'react';
import { Badge as RolesIcon } from '@mui/icons-material';
import AspirationsCollection from '../../component/aspirations-collection';
import { createInMemoryAdapter } from '../../service/aspirations';

const AspirationRolesPage: React.FC = () => {
  const adapter = useMemo(() => createInMemoryAdapter(), []);

  return (
    <AspirationsCollection
      kind="role"
      adapter={adapter}
      kindLabel="Role"
      kindIcon={<RolesIcon />}
      emptyTitle="No role aspirations yet"
      emptyDescription="Track the job titles and role profiles you want Baldin to optimize for."
    />
  );
};

export default AspirationRolesPage;
