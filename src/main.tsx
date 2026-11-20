import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts';
import './index.css';
import App from './App';
import { applyTheme } from './lib/theme';
import { loadSettings } from './lib/storage';
import { setupPwa } from './lib/pwa';

// thème appliqué avant le premier rendu (pas de flash de couleurs)
applyTheme(loadSettings().theme);
setupPwa();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
