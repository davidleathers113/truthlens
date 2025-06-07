import React from 'react';
import { ExtensionProvider } from '../contexts/ExtensionContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { PopupRouter } from './Layout/PopupRouter';
import { ResponsiveContainer } from './Layout/ResponsiveContainer';

export const PopupApp: React.FC = () => {
  return (
    <ThemeProvider>
      <ExtensionProvider>
        <ResponsiveContainer>
          <PopupRouter />
        </ResponsiveContainer>
      </ExtensionProvider>
    </ThemeProvider>
  );
};
