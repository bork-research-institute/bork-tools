import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Analytics } from '@vercel/analytics/next';
import { LandingPage } from './index';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LandingPage />
    <Analytics />
  </StrictMode>,
);
