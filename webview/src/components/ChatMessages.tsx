import React from 'react';
import { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';

interface ChatMessagesProps {
  messages: ChatMessage[];
  onExecutePlan: () => void;
  onApplyChanges: () => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  onExecutePlan,
  onApplyChanges,
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-vscode-muted">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold mb-2">Welcome to CodeHelper Chat</h3>
          <p className="text-sm">Ask me about changes to your current file and I'll help you implement them!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onExecutePlan={onExecutePlan}
          onApplyChanges={onApplyChanges}
        />
      ))}
    </div>
  );
};
