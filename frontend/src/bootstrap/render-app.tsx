import React from 'react';
import ReactDOM from 'react-dom/client';
import Sentry from '../instrument';

export function renderApp(node: React.ReactNode, elementId = 'root'): void {
  const container = document.getElementById(elementId);

  if (!container) {
    throw new Error(`Expected #${elementId} root element.`);
  }

  const root = ReactDOM.createRoot(container, {
    onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
      console.warn('Uncaught error', error, errorInfo.componentStack);
    }),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  });

  root.render(node);
}
