import React from "react";
import { Alert } from '@mui/material';


interface MessageAlertProps {
  message: string;
  severity: 'error' | 'info' | 'success' | 'warning';
  onClose?: () => void;  // Optional close handler
}

const MessageAlert: React.FC<MessageAlertProps> = ({ message, onClose, severity }) => {
  if (!message) {
    return null;
  }

  return (
    <Alert
      severity={severity}
      onClose={onClose} // Show close button if onClose is provided
      sx={{ width: '100%', marginTop: 2, marginBottom: 2 }}
    >
      {message}
    </Alert>
  );
};

export default MessageAlert;
