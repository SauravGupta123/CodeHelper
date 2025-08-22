import React from 'react';

interface HeaderProps {
  status: string;
}

export const Header: React.FC<HeaderProps> = ({ status }) => {
  return (
    <header className="flex items-center justify-between p-4 border-b border-vscode-border bg-vscode-surface">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-vscode-accent rounded-full flex items-center justify-center">
          <span className="text-white text-lg font-bold">⚡</span>
        </div>
        <h1 className="text-xl font-semibold text-vscode-accent">CodeHelper Chat</h1>
      </div>
      <div className="text-sm text-vscode-warn font-medium">
        {status}
      </div>
    </header>
  );
};
