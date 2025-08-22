import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    // Animate blocks appearing one by one
    blocks.forEach((block, index) => {
      setTimeout(() => {
        setVisibleBlocks(prev => new Set([...prev, block.id]));
        onBlockVisible(block.id);
      }, index * 600); // 600ms delay between each block
    });
  }, [blocks, onBlockVisible]);

  const renderBlock = (block: StructuredBlock) => {
    const isVisible = visibleBlocks.has(block.id);
    
    return (
      <div
        key={block.id}
        className={`transition-all duration-700 ease-out ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="mb-6 p-5 rounded-xl border border-vscode-border bg-vscode-surface/60 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-3 mb-4">
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
          </div>
          
          <div className="ml-13">
            {block.type === 'observations' && block.points ? (
              <ul className="space-y-3">
                {block.points.map((point, index) => (
                  <li key={index} className="flex items-start gap-3 group">
                    <span className="w-2.5 h-2.5 bg-vscode-accent rounded-full mt-2.5 flex-shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="text-vscode-text leading-relaxed text-base">{point}</span>
                  </li>
                ))}
              </ul>
            ) : block.content ? (
              <div className="prose prose-invert max-w-none">
                <MarkdownRenderer content={block.content} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="staggered-fade-in space-y-6">
      {blocks.map(renderBlock)}
    </div>
  );
};
