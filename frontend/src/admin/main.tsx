// Sentry must be initialised before any other imports.
import '../instrument';

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AdminRoutes from './admin-routes';
import AppProviders from '../bootstrap/app-providers';
import { renderApp } from '../bootstrap/render-app';
import { installDevFigmaCaptureScript } from './install-dev-figma-capture';

installDevFigmaCaptureScript();

renderApp(
  <AppProviders>
    <BrowserRouter basename="/admin">
      <AdminRoutes />
    </BrowserRouter>
  </AppProviders>,
);
