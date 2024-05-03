import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './context/user-context';
import AppRoutes from './route/app-routes';
import ThemeProvider from './theme/theme-provider';
import reportWebVitals from './report-web-vitals';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const logVitals = (vitals: any) => console.log(vitals);
root.render(
  // Strict mode being to disabled to ensure log statements aren't cleared from the console
  // <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  // </React.StrictMode>
);
reportWebVitals(logVitals);
