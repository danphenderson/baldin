import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

interface ContentDisplayProps {
  formatted_string: string; // String that should be embedded into a PDF.
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({ formatted_string }) => {
  // Optionally, handle the conversion of the string to a Blob URL if necessary
  return (
    <Paper elevation={3} style={{ maxHeight: '500px', overflow: 'auto' }}>
      <Box p={2}>
        <Typography variant="body1">
          {formatted_string}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ContentDisplay;
