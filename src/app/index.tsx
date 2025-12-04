import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import { setupLogging } from '../utils/logger';

console.info('[Bootstrap] Step: setupLogging begin');
setupLogging();
document.addEventListener('DOMContentLoaded', function () {
  console.info('[Bootstrap] Step: DOMContentLoaded');
  const container = document.getElementById('react-page');
  const root = createRoot(container);
  root.render(<App />);
  console.info('[Bootstrap] Step: root.render completed');
});
