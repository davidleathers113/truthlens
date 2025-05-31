// TruthLens Popup Interface
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from './components/PopupApp';
import './styles/popup.scss';

// Mount React app
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
