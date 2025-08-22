import React from 'react';
import { ChatMessage } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CodeBlock } from './CodeBlock';
import { StructuredBlockRenderer } from './StructuredBlockRenderer';

interface MessageBubbleProps {
  message: ChatMessage;
  onExecutePlan: () => void;
  onApplyChanges: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onExecutePlan,
  onApplyChanges,
}) => {
  const isUser = message.type === 'user';

  const handleBlockVisible = (blockId: string) => {
    // This can be used to track which blocks are visible
    console.log(`Block ${blockId} is now visible`);
  };

  const renderContent = () => {
    if (message.structuredBlocks && message.structuredBlocks.length > 0) {
      return (
        <div className="space-y-4">
          <StructuredBlockRenderer 
            blocks={message.structuredBlocks} 
            onBlockVisible={handleBlockVisible}
          />
          
          <div className="pt-4 border-t border-vscode-border">
            <button
              onClick={onExecutePlan}
              className="px-6 py-3 bg-vscode-accent text-white rounded-lg font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:ring-offset-2 focus:ring-offset-vscode-surface transition-all"
            >
              Execute Plan
            </button>
          </div>
        </div>
      );
    }

    if (message.plan && message.explanation) {
      return (
        <div className="space-y-4">
          <div>
            <MarkdownRenderer
              content={`# Execution Plan\n\n## Steps\n${message.plan
                .map((s) => `1. ${s.description}`)
                .join('\n')}`}
            />
          </div>
          <div>
            <MarkdownRenderer content={`# Rationale\n\n${message.explanation}`} />
          </div>
          <div className="pt-2">
            <button
              onClick={onExecutePlan}
              className="px-4 py-2 bg-vscode-accent text-white rounded-lg font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:ring-offset-2 focus:ring-offset-vscode-surface transition-all"
            >
              Execute Plan
            </button>
          </div>
        </div>
      );
    }

    if (message.generatedCode) {
      return (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-vscode-success">Generated Code</h3>
          <CodeBlock code={message.generatedCode} language="typescript" />
          <div className="pt-2">
            <button
              onClick={onApplyChanges}
              className="px-4 py-2 bg-vscode-success text-white rounded-lg font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-vscode-success focus:ring-offset-2 focus:ring-offset-vscode-surface transition-all"
            >
              Apply Changes
            </button>
          </div>
        </div>
      );
    }

    return <MarkdownRenderer content={message.content} />;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-4xl rounded-lg p-4 ${
        isUser 
          ? 'ml-auto bg-blue-600 text-white' 
          : 'mr-auto bg-vscode-surface border border-vscode-border'
      }`}>
        <div className="text-xs opacity-70 mb-2">
          {isUser ? 'You' : 'CodeHelper'} • {message.timestamp.toLocaleTimeString()}
        </div>
        {renderContent()}
      </div>
    </div>
  );
};
