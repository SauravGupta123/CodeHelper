import React, { useEffect, useState, useMemo } from 'react';
import { StructuredBlock } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StructuredBlockRendererProps {
  blocks: StructuredBlock[];
  onBlockVisible: (blockId: string) => void;
}

export const StructuredBlockRenderer: React.FC<StructuredBlockRendererProps> = ({ 
  blocks, 
  onBlockVisible 
}) => {
  const [visibleBlocks, setVisibleBlocks] = useState<Set<string>>(new Set());
  const [expandedByType, setExpandedByType] = useState<Record<string, boolean>>({});

  // Maintain a stable order by agent type
  const orderedBlocks = useMemo(() => {
    const order: Array<StructuredBlock['type']> = ['thinking', 'observations', 'approach', 'plan'];
    const byType: Record<string, StructuredBlock | undefined> = {};
    blocks.forEach(b => { byType[b.type] = b; });
    return order.map(t => byType[t]).filter(Boolean) as StructuredBlock[];
  }, [blocks]);

  useEffect(() => {
    // Animate blocks appearing one by one (keep existing behavior)
    orderedBlocks.forEach((block, index) => {
      setTimeout(() => {
        setVisibleBlocks(prev => new Set([...prev, block.id]));
        onBlockVisible(block.id);
      }, index * 200);
    });
  }, [orderedBlocks, onBlockVisible]);

  useEffect(() => {
    // Auto-open the most relevant block and collapse others when updates arrive
    if (orderedBlocks.length === 0) { return; }

    // Prefer a block that is currently streaming; otherwise the last non-empty block
    const streaming = orderedBlocks.find(b => b.isStreaming);
    const target = streaming || [...orderedBlocks].reverse().find(b => (b.streamedContent || b.content || b.streamedPoints?.length));

    if (!target) { return; }

    setExpandedByType(prev => {
      const next: Record<string, boolean> = { ...prev };
      orderedBlocks.forEach(b => { next[b.type] = b.type === target.type; });
      return next;
    });
  }, [orderedBlocks.map(b => ({ type: b.type, isStreaming: b.isStreaming, len: (b.streamedContent || b.content || '').length, pts: b.streamedPoints?.length })).toString()]);

  const toggleBlock = (type: StructuredBlock['type']) => {
    setExpandedByType(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const renderStreamingContent = (block: StructuredBlock) => {
    if (block.type === 'observations' && block.streamedPoints) {
      return (
        <ul className="space-y-3">
          {block.streamedPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-3 group animate-fadeIn">
              <span className="w-2.5 h-2.5 bg-vscode-accent rounded-full mt-2.5 flex-shrink-0 group-hover:scale-125 transition-transform" />
              <span className="text-vscode-text leading-relaxed text-base">{point}</span>
            </li>
          ))}
          {block.isStreaming && (
            <li className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 bg-vscode-accent rounded-full mt-2.5 flex-shrink-0 animate-pulse" />
              <span className="text-vscode-text leading-relaxed text-base opacity-70">
                <span className="inline-block w-2 h-2 bg-vscode-accent rounded-full animate-pulse mr-2" />
                Thinking...
              </span>
            </li>
          )}
        </ul>
      );
    }

    if (block.content || block.streamedContent) {
      const content = block.streamedContent || block.content || '';
      return (
        <div className="prose prose-invert max-w-none">
          <MarkdownRenderer content={content} />
          {block.isStreaming && (
            <span className="inline-block w-2 h-2 bg-vscode-accent rounded-full animate-pulse ml-2" />
          )}
        </div>
      );
    }

    return null;
  };

  const renderBlock = (block: StructuredBlock) => {
    const isVisible = visibleBlocks.has(block.id);
    const isExpanded = !!expandedByType[block.type];
    
    return (
      <div
        key={block.id}
        className={`transition-all duration-500 ease-out ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="mb-4 rounded-xl border border-vscode-border bg-vscode-surface/60 backdrop-blur-sm shadow-lg">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            onClick={() => toggleBlock(block.type)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg ${
                block.type === 'thinking' ? 'bg-blue-500' :
                block.type === 'observations' ? 'bg-green-500' :
                block.type === 'approach' ? 'bg-purple-500' :
                'bg-vscode-accent'
              }`}>
                {block.type === 'thinking' ? '🧠' :
                 block.type === 'observations' ? '🔍' :
                 block.type === 'approach' ? '🎯' :
                 '📋'}
              </div>
              <h3 className="text-xl font-semibold text-vscode-accent tracking-tight">{block.heading}</h3>
              {block.isStreaming && (
                <span className="text-sm text-vscode-muted animate-pulse">Streaming...</span>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExpanded && (
            <div className="px-5 pb-5">
              {renderStreamingContent(block)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {orderedBlocks.map(renderBlock)}
    </div>
  );
};
