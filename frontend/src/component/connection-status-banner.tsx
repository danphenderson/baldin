import React, { useEffect, useRef, useState } from 'react';
import { Fade } from '@mui/material';
import {
  StatusChip as Chip,
  type StatusChipProps,
} from '../design-system';
import {
  WifiOff as WifiOffIcon,
  Sync as SyncIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import type { ConnectionStatus } from './use-collaborative-editor';

interface ConnectionStatusBannerProps {
  status: ConnectionStatus;
}

const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({ status }) => {
  const previousStatusRef = useRef<ConnectionStatus>(status);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const prev = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === 'connected' && (prev === 'connecting' || prev === 'disconnected')) {
      setShowReconnected(true);
      const timeout = window.setTimeout(() => setShowReconnected(false), 2000);
      return () => window.clearTimeout(timeout);
    }

    setShowReconnected(false);
  }, [status]);

  if (status === 'connected' && !showReconnected) return null;

  let chipProps: Omit<StatusChipProps, 'size' | 'variant' | 'sx'> & { 'data-testid': string };

  if (status === 'disconnected') {
    chipProps = {
      label: 'Offline — reconnecting shortly',
      color: 'error',
      icon: <WifiOffIcon />,
      'data-testid': 'connection-status-disconnected',
    };
  } else if (status === 'connecting') {
    chipProps = {
      label: 'Reconnecting…',
      color: 'warning',
      icon: <SyncIcon />,
      'data-testid': 'connection-status-connecting',
    };
  } else {
    chipProps = {
      label: 'Connected',
      color: 'success',
      icon: <CheckIcon />,
      'data-testid': 'connection-status-connected',
    };
  }

  return (
    <Fade in>
      <Chip
        size="small"
        variant="outlined"
        {...chipProps}
        sx={{ mb: 1 }}
      />
    </Fade>
  );
};

export default ConnectionStatusBanner;
