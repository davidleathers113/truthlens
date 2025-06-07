import React from 'react';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  showSettings?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'TruthLens',
  onBack,
  showSettings = false
}) => {
  return (
    <header className="popup-header">
      {onBack && (
        <button className="header-back-button" onClick={onBack}>
          ←
        </button>
      )}
      <h1>{title}</h1>
      {showSettings && (
        <button className="header-settings-button">
          ⚙️
        </button>
      )}
    </header>
  );
};
