import React, { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-vscode-border bg-vscode-surface">
      <div className="flex gap-3">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CodeHelper about changes to the current file..."
          className="flex-1 resize-none h-12 max-h-32 p-3 rounded-lg border border-vscode-border bg-vscode-bg text-vscode-warn placeholder-vscode-muted focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:border-transparent transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="px-6 py-3 bg-vscode-accent text-white rounded-lg font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:ring-offset-2 focus:ring-offset-vscode-surface disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
};
