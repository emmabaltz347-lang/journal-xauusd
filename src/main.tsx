import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts';
import './index.css';
import App from './App';
import { applyTheme } from './lib/theme';
import { loadSettings } from './lib/storage';

// thème appliqué avant le premier rendu (pas de flash de couleurs)
applyTheme(loadSettings().theme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
