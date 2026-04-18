import React, { useContext, useMemo } from 'react';
import { BusinessOutlined as CompaniesIcon } from '@mui/icons-material';
import AspirationsCollection from '../../component/aspirations-collection';
import { UserContext } from '../../context/user-context';
import { createApiAdapter } from '../../service/aspirations';

const AspirationCompaniesPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const adapter = useMemo(() => (token ? createApiAdapter(token) : null), [token]);

  if (!adapter) {
    return null;
  }

  return (
    <AspirationsCollection
      kind="company"
      adapter={adapter}
      kindLabel="Company"
      kindIcon={<CompaniesIcon />}
      emptyTitle="No company aspirations yet"
      emptyDescription="Track the companies and employers you want Baldin to prioritize in your search."
      showSuggestions
    />
  );
};

export default AspirationCompaniesPage;
