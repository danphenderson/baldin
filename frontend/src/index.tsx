// Sentry must be initialised before any other imports.
import Sentry from './instrument';

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppProviders from './bootstrap/app-providers';
import { renderApp } from './bootstrap/render-app';
import AppRoutes from './route/app-routes';

void Sentry;

renderApp(
  <AppProviders>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProviders>,
);
