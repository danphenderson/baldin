import React from 'react';
import ReactJson from 'react-json-view';
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

  return (
    <Paper elevation={3} style={{ maxHeight: '400px', overflow: 'auto' }}> {/* Paper component with scroll */}
      <Box p={2}> {/* Padding around the JSON viewer */}
        <ReactJson
          src={json as any}
          theme="google"
          indentWidth={2}
          enableClipboard={true}
          collapsed={false}
          displayDataTypes={false}
          displayObjectSize={false}
        />
      </Box>
    </Paper>
  );
}

export default RichJsonDisplay;
