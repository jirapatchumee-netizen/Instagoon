import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AnalyticsApp } from './AnalyticsApp';
import './analytics.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing root element in analytics.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <AnalyticsApp />
  </StrictMode>
);
