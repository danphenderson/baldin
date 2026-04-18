import React from 'react';
import { Paper, Box } from '@mui/material';
import { monoFontFamily } from '../../design-system/tokens/typography';

interface ContentDisplayProps {
  formatted_string: string; // String that should be embedded into a PDF.
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({ formatted_string }) => {
  // Optionally, handle the conversion of the string to a Blob URL if necessary
  return (
    <Paper>
      <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: monoFontFamily }}>
        {formatted_string}
      </Box>
    </Paper>
  );
};

export default ContentDisplay;
