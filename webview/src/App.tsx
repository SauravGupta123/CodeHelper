import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './types';
import { Header } from './components/Header';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { useVSCodeAPI } from './hooks/useVSCodeAPI';

declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

const vscode = window.acquireVsCodeApi();

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { status, setStatus } = useVSCodeAPI(vscode);
  const chatRef = useRef<HTMLDivElement>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<ChatMessage | null>(null);
  const [isPlanComplete, setIsPlanComplete] = useState(false);
  const [planResponse, setPlanResponse] = useState<any>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage]);

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const updateStreamingMessage = (updates: Partial<ChatMessage>) => {
    if (currentStreamingMessage) {
      setCurrentStreamingMessage(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setStatus('Thinking...');
    setIsPlanComplete(false);
    setPlanResponse(null);
    
    vscode.postMessage({ type: 'userChatSubmit', prompt: content });
  };

  // Listen for messages from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from extension:', event.data);
      const message = event.data;
      
      switch (message.type) {
        case 'streamingStart':
          console.log('Starting streaming response');
          const streamingMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'assistant',
            content: 'Generating response...',
            timestamp: new Date(),
            isStreaming: true,
            structuredBlocks: []
          };
          setCurrentStreamingMessage(streamingMessage);
          break;

        case 'streamingAgentResponse':
          console.log('Processing streaming agent response:', message);
          if (currentStreamingMessage) {
            const { agentType, content, isComplete, points } = message;
            
            // Update status based on agent type
            if (agentType === 'thinking') {
              setStatus('Generating key observations...');
            } else if (agentType === 'observations') {
              setStatus('Generating strategic approach...');
            } else if (agentType === 'approach') {
              setStatus('Generating implementation plan...');
            } else if (agentType === 'plan') {
              setStatus('Generating implementation plan...'); // Keep status until streaming is complete
              // Don't set isPlanComplete here, wait for streamingComplete
            }
            
            // Update or create structured block
            const existingBlockIndex = currentStreamingMessage.structuredBlocks?.findIndex(b => b.type === agentType);
            
            if (existingBlockIndex !== undefined && existingBlockIndex >= 0) {
              // Update existing block
              const updatedBlocks = [...(currentStreamingMessage.structuredBlocks || [])];
              updatedBlocks[existingBlockIndex] = {
                ...updatedBlocks[existingBlockIndex],
                streamedContent: content,
                streamedPoints: points,
                isStreaming: !isComplete
              };
              updateStreamingMessage({ structuredBlocks: updatedBlocks });
              console.log(`Updated existing ${agentType} block:`, updatedBlocks[existingBlockIndex]);
            } else {
              // Create new block
              const newBlock = {
                id: `${agentType}-${Date.now()}`,
                type: agentType,
                heading: agentType === 'thinking' ? 'Thinking Process' :
                         agentType === 'observations' ? 'Key Observations' :
                         agentType === 'approach' ? 'Strategic Approach' :
                         'Implementation Plan',
                visible: true,
                isStreaming: !isComplete,
                streamedContent: content,
                streamedPoints: points
              };
              
              const updatedBlocks = [...(currentStreamingMessage.structuredBlocks || []), newBlock];
              updateStreamingMessage({ structuredBlocks: updatedBlocks });
              console.log(`Created new ${agentType} block:`, newBlock);
            }
            
            // Log the current state for debugging
            console.log(`Agent ${agentType} response processed:`, { content: content?.substring(0, 100), isComplete, points });
            console.log(`Current structuredBlocks count:`, currentStreamingMessage.structuredBlocks?.length || 0);
            console.log(`Current structuredBlocks types:`, currentStreamingMessage.structuredBlocks?.map(b => b.type) || []);
          }
          break;

        case 'streamingComplete':
          console.log('Streaming complete');
          if (currentStreamingMessage) {
            console.log('Current streaming message before completion:', currentStreamingMessage);
            console.log('Structured blocks before completion:', currentStreamingMessage.structuredBlocks);
            
            // Convert streaming message to regular message
            const finalMessage: ChatMessage = {
              ...currentStreamingMessage,
              isStreaming: false,
              structuredBlocks: currentStreamingMessage.structuredBlocks?.map(block => ({
                ...block,
                isStreaming: false,
                content: block.streamedContent || block.content || '',
                points: block.streamedPoints || block.points || []
              }))
            };
            console.log('Final message created:', finalMessage);
            console.log('Final structured blocks:', finalMessage.structuredBlocks);
            
            // Validate that all required blocks are present and have content
            const requiredBlocks = ['thinking', 'observations', 'approach', 'plan'];
            const missingBlocks = requiredBlocks.filter(blockType => {
              const block = finalMessage.structuredBlocks?.find(b => b.type === blockType);
              console.log(`Checking block type ${blockType}:`, block);
              if (!block) {
                console.log(`Block type ${blockType} not found`);
                return true;
              }
              if (blockType === 'observations') {
                const hasPoints = block.points && block.points.length > 0;
                console.log(`Block type ${blockType} has points:`, hasPoints, block.points);
                return !hasPoints;
              }
              const hasContent = block.content && block.content.trim() !== '';
              console.log(`Block type ${blockType} has content:`, hasContent, block.content?.substring(0, 100));
              return !hasContent;
            });
            
            if (missingBlocks.length > 0) {
              console.error('Missing or empty blocks:', missingBlocks);
              setStatus('Plan generation incomplete - missing: ' + missingBlocks.join(', '));
              setIsPlanComplete(false);
              return;
            }
            
            // Reconstruct planResponse from streaming data for execute plan functionality
            const reconstructedPlanResponse = {
              thinking: finalMessage.structuredBlocks?.find(b => b.type === 'thinking')?.content || '',
              observations: finalMessage.structuredBlocks?.find(b => b.type === 'observations')?.points || [],
              approach: finalMessage.structuredBlocks?.find(b => b.type === 'approach')?.content || '',
              detailedPlan: finalMessage.structuredBlocks?.find(b => b.type === 'plan')?.content || ''
            };
            setPlanResponse(reconstructedPlanResponse);
            console.log('PlanResponse reconstructed:', reconstructedPlanResponse);
            
            addMessage(finalMessage);
            setCurrentStreamingMessage(null);
            setStatus('Plan ready');
            setIsPlanComplete(true);
          }
          break;

        case 'assistantPlan':
          console.log('Received old assistantPlan message - ignoring (using streaming system)');
          break;
          
        case 'showGeneratedCode':
          console.log('Processing generated code:', message);
          setStatus('Code generation complete');
          const codeMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'assistant',
            content: 'Generated Code',
            timestamp: new Date(),
            generatedCode: message.newCode || ''
          };
          addMessage(codeMessage);
          break;
          
        case 'updateStatus':
          console.log('Updating status:', message.message);
          setStatus(message.message || '');
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentStreamingMessage]);

  return (
    <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text">
      <Header status={status} />
      
      <div 
        ref={chatRef}
        className="relative flex-1 overflow-y-auto"
      >
        <ChatMessages 
          messages={messages} 
          streamingMessage={currentStreamingMessage}
          isPlanComplete={isPlanComplete}
          onExecutePlan={() => {
            if (currentStreamingMessage) {
              console.error('Cannot execute plan while streaming is in progress');
              setStatus("Please wait for plan generation to complete");
              return;
            }
            
            if (planResponse) {
              console.log('Executing plan with response:', planResponse);
              vscode.postMessage({ 
                type: 'executePlan', 
                planResponse: planResponse 
              });
              setStatus("Generating code...");
            } else {
              console.error('No planResponse available for execution');
              setStatus("No plan available");
            }
          }}
          onApplyChanges={() => {
            vscode.postMessage({ type: 'applyChanges' });
          }}
        />
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};
