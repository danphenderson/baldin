import React from "react";
import { Box } from '@mui/material';
import { InlineFeedback } from '../../design-system';


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
    <Box sx={{ mt: 2, mb: 2 }}>
      <InlineFeedback tone={severity} onClose={onClose}>
        {message}
      </InlineFeedback>
    </Box>
  );
};

export default MessageAlert;
