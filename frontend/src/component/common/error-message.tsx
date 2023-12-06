import React from "react";
import { Alert } from '@mui/material';

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
    <Alert
      severity="error"
      onClose={onClose} // Show close button if onClose is provided
      sx={{ width: '100%', marginTop: 2, marginBottom: 2 }} // Some spacing and full width
    >
      {message}
    </Alert>
  );
};

export default ErrorMessage;
