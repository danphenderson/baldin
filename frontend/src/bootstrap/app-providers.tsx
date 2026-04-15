import React from 'react';
import { NotificationProvider } from '../context/notification-context';
import { UserProvider } from '../context/user-context';
import ThemeProvider from '../theme/theme-provider';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-sans-3/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <ThemeProvider>
    <NotificationProvider>
      <UserProvider>{children}</UserProvider>
    </NotificationProvider>
  </ThemeProvider>
);

export default AppProviders;
