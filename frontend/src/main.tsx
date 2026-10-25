import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

try {
  document.documentElement.dataset.theme = localStorage.getItem('robogarage_theme') || 'dark';
} catch {
  /* noop */
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
