import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Analytics } from '@vercel/analytics/next';
import { LandingPage } from './index';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LandingPage />
    <Analytics />
  </React.StrictMode>,
);
