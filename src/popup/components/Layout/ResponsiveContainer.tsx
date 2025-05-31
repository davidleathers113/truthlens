import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = ''
}) => {
  const { themeState } = useTheme();

  const containerStyle = {
    width: `${themeState.dimensions.width}px`,
    height: `${themeState.dimensions.height}px`,
    maxWidth: '100vw',
    maxHeight: '100vh',
  };

  return (
    <div
      className={`popup-container ${className}`}
      style={containerStyle}
      data-popup-size={themeState.popupSize}
      data-theme={themeState.effectiveTheme}
    >
      {children}
    </div>
  );
};
