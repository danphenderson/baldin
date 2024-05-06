import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

interface ContentDisplayProps {
  formatted_string: string; // String that should be embedded into a PDF.
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({ formatted_string }) => {
  // Optionally, handle the conversion of the string to a Blob URL if necessary
  return (
    <Paper>
      <Box component="pre" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {formatted_string}
      </Box>
    </Paper>
  );
};

export default ContentDisplay;
