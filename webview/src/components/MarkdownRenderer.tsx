import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none prose-h1:mb-3 prose-h2:mb-2 prose-li:leading-snug">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold text-blue-300 mb-3 tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold text-blue-200 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold text-blue-200 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-bold text-blue-300 mb-2">{children}</h4>,
          p: ({ children }) => <p className="text-vscode-text mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-3 text-vscode-text">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-3 text-vscode-text">{children}</ol>,
          li: ({ children }) => <li className="text-vscode-text">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-vscode-text">{children}</strong>,
          em: ({ children }) => <em className="italic text-vscode-text">{children}</em>,
          code: ({ children }) => (
            <code className="bg-vscode-bg border border-vscode-border px-2 py-1 rounded text-sm font-mono text-vscode-text">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-vscode-bg border border-vscode-border rounded-lg p-4 overflow-x-auto mb-3">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-vscode-accent pl-4 italic text-vscode-muted mb-3">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-vscode-accent hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
