import React, { useContext, useMemo } from 'react';
import { Badge as RolesIcon } from '@mui/icons-material';
import AspirationsCollection from '../../component/aspirations-collection';
import { UserContext } from '../../context/user-context';
import { createApiAdapter } from '../../service/aspirations';

const AspirationRolesPage: React.FC = () => {
  const { token } = useContext(UserContext);
  const adapter = useMemo(() => (token ? createApiAdapter(token) : null), [token]);

  if (!adapter) {
    return null;
  }

  return (
    <AspirationsCollection
      kind="role"
      adapter={adapter}
      kindLabel="Role"
      kindIcon={<RolesIcon />}
      emptyTitle="No role aspirations yet"
      emptyDescription="Track the job titles and role profiles you want Baldin to optimize for."
      showSuggestions
    />
  );
};

export default AspirationRolesPage;
