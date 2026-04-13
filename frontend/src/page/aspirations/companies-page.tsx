import React, { useMemo } from 'react';
import { BusinessOutlined as CompaniesIcon } from '@mui/icons-material';
import AspirationsCollection from '../../component/aspirations-collection';
import { createInMemoryAdapter } from '../../service/aspirations';

const AspirationCompaniesPage: React.FC = () => {
  const adapter = useMemo(() => createInMemoryAdapter(), []);

  return (
    <AspirationsCollection
      kind="company"
      adapter={adapter}
      kindLabel="Company"
      kindIcon={<CompaniesIcon />}
      emptyTitle="No company aspirations yet"
      emptyDescription="Track the companies and employers you want Baldin to prioritize in your search."
    />
  );
};

export default AspirationCompaniesPage;
