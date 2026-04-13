import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, CssBaseline, Stack, Typography } from '@mui/material';

import { UserContext } from '../context/user-context';
import AgentEnabledMultilineField from '../component/agent-surface/agent-enabled-multiline-field';

const userContextValue = {
  user: null,
  setUser: () => {},
  token: null,
  setToken: () => {},
  loading: false,
  canAccessTier: () => false,
};

const Harness = () => {
  const [value, setValue] = useState('Initial browser harness value');

  return (
    <UserContext.Provider value={userContextValue}>
      <CssBaseline />
      <Box sx={{ p: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h5">AgentEnabledMultilineField Harness</Typography>
          <Typography variant="body2" color="text.secondary">
            This mounts the field without any router provider.
          </Typography>
          <AgentEnabledMultilineField
            label="Harness Notes"
            multiline
            minRows={3}
            surfaceId="browser-harness-surface"
            fieldKey="browser_harness_notes"
            value={value}
            onChange={setValue}
            helperText="Typing here should work without a router context."
          />
        </Stack>
      </Box>
    </UserContext.Provider>
  );
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Harness root element was not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <Harness />
  </React.StrictMode>,
);
