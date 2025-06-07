// TruthLens Popup Interface
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from './components/PopupApp';
// Import all component styles (already imported by individual components)

// Mount React app
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
