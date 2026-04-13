import React from 'react';
import { JSONTree } from 'react-json-tree';
import { Paper, Box, useTheme } from '@mui/material';
import {
  InlineFeedback,
  jsonTreeTheme,
} from '../../design-system';

interface RichJsonDisplayProps {
  jsonString: string;
}

function RichJsonDisplay({ jsonString }: RichJsonDisplayProps): React.ReactElement {
  const muiTheme = useTheme();
  let json: unknown;
  try {
    json = JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return (
      <InlineFeedback tone="error">
        Error parsing JSON. Please check the console for more details
      </InlineFeedback>
    );
  }

  return (
    <Paper elevation={3} sx={{ maxHeight: '400px', overflow: 'auto' }}>
      <Box p={2}>
        <JSONTree data={json} theme={jsonTreeTheme(muiTheme)} invertTheme={false} />
      </Box>
    </Paper>
  );
}

export default RichJsonDisplay;
