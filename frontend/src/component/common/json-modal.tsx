import React from 'react';
import { JSONTree } from 'react-json-tree';
import ErrorMessage from './error-message';
import { Paper, Box } from '@mui/material'; // Import necessary Material UI components

interface RichJsonDisplayProps {
  jsonString: string;
}

function RichJsonDisplay({ jsonString }: RichJsonDisplayProps): React.ReactElement {
  let json: unknown;
  try {
    json = JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return <ErrorMessage message="Error parsing JSON. Please check the console for more details" />;
  }

  // Define a theme or use a predefined one
  const theme = {
    scheme: 'monokai',
    author: 'wimer hazenberg (http://www.monokai.nl)',
    base00: '#272822',
    base01: '#383830',
    base02: '#49483e',
    base03: '#75715e',
    base04: '#a59f85',
    base05: '#f8f8f2',
    base06: '#f5f4f1',
    base07: '#f9f8f5',
    base08: '#f92672',
    base09: '#fd971f',
    base0A: '#f4bf75',
    base0B: '#a6e22e',
    base0C: '#a1efe4',
    base0D: '#66d9ef',
    base0E: '#ae81ff',
    base0F: '#cc6633',
  };

  return (
    <Paper elevation={3} style={{ maxHeight: '400px', overflow: 'auto' }}> {/* Paper component with scroll */}
      <Box p={2}> {/* Padding around the JSON viewer */}
        <JSONTree data={json} theme={theme} invertTheme={false} />
      </Box>
    </Paper>
  );
}

export default RichJsonDisplay;
