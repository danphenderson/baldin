/**
 * Global notification system (Snackbar toasts).
 *
 * Wrap the app in <NotificationProvider> and call the `useNotification()`
 * hook from any component to show consistent success / error / warning /
 * info toasts. Replaces per-page Snackbar boilerplate.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  message: string;
  severity: AlertColor;
  /** Auto-hide duration in ms. Defaults to 4 000. */
  duration?: number;
}

interface NotificationAPI {
  /** Show a success toast. */
  success: (message: string) => void;
  /** Show an error toast. */
  error: (message: string) => void;
  /** Show a warning toast. */
  warning: (message: string) => void;
  /** Show an informational toast. */
  info: (message: string) => void;
  /** Show a toast with an explicit severity and optional duration. */
  notify: (message: string, severity?: AlertColor, duration?: number) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationContext = createContext<NotificationAPI | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((message: string, severity: AlertColor = 'success', duration?: number) => {
    setNotification({ message, severity, duration });
    setOpen(true);
  }, []);

  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  const api: NotificationAPI = {
    success: useCallback((m: string) => show(m, 'success'), [show]),
    error: useCallback((m: string) => show(m, 'error'), [show]),
    warning: useCallback((m: string) => show(m, 'warning'), [show]),
    info: useCallback((m: string) => show(m, 'info'), [show]),
    notify: show,
  };

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={notification?.duration ?? 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification ? (
          <Alert
            onClose={handleClose}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotification(): NotificationAPI {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within <NotificationProvider>');
  return ctx;
}
