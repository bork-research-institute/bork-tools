import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import { Analytics } from '@vercel/analytics/next';
import { LandingPage } from './index';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <LandingPage />
    </HelmetProvider>
    <Analytics />
  </React.StrictMode>,
);
