import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsApp } from './components/OptionsApp';
import './styles/options.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
