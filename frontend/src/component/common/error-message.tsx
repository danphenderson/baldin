import React from "react";
import { Box } from '@mui/material';
import { InlineFeedback } from '../../design-system';

// Define a type for the component's props
interface ErrorMessageProps {
  message: string;
  onClose?: () => void;  // Optional close handler
}

// Use the ErrorMessageProps type for the component's props
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onClose }) => {
  if (!message) {
    return null; // Do not render if there's no message
  }

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <InlineFeedback tone="error" onClose={onClose}>
        {message}
      </InlineFeedback>
    </Box>
  );
};

export default ErrorMessage;
