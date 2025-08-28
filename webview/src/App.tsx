import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, CodeReviewResult } from './types';
import { Header } from './components/Header';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { CodeReview } from './components/CodeReview';
import { Tabs } from './components/Tabs';
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
  
  // Code Review state
  const [activeTab, setActiveTab] = useState<'plan' | 'codeReview'>('plan');
  const [codeReviewResults, setCodeReviewResults] = useState<CodeReviewResult[]>([]);
  const [isCodeReviewAnalyzing, setIsCodeReviewAnalyzing] = useState(false);
  
  const tabs = [
    { id: 'plan', label: 'Plan' },
    { id: 'codeReview', label: 'Code Review' }
  ];
  
  // Use ref to track blocks immediately without waiting for state updates
  const streamingBlocksRef = useRef<Map<string, any>>(new Map());

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

  //when use sends the query from frontend
  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setStatus('Starting intelligent analysis with context gathering...');
    setIsPlanComplete(false);
    setPlanResponse(null);
    
    // Clear the streaming blocks ref
    streamingBlocksRef.current.clear();
    
    vscode.postMessage({ type: 'userChatSubmit', prompt: content });
  };

  const handleStartCodeReview = () => {
    setIsCodeReviewAnalyzing(true);
    setStatus('Starting code review analysis...');
    vscode.postMessage({ type: 'startCodeReview' });
  };

  const handleExecuteCodeReviewPlan = (type: 'bug' | 'performance' | 'security' | 'clarity') => {
    const result = codeReviewResults.find(r => r.type === type);
    if (result) {
      vscode.postMessage({ 
        type: 'executeCodeReviewPlan', 
        reviewType: type,
        result: result
      });
      setStatus(`Generating code for ${type} improvements...`);
    }
  };

  const handleGenerateWithCopilot = (type: 'bug' | 'performance' | 'security' | 'clarity') => {
    const result = codeReviewResults.find(r => r.type === type);
    if (result) {
      // Format the plan for Copilot
      const copilotPrompt = `Please help me implement the following ${type} improvements:

Issues Found:
${result.issues.map(issue => `- ${issue}`).join('\n')}

Recommendations:
${result.recommendations.map(rec => `- ${rec}`).join('\n')}

Steps to ${type === 'bug' ? 'Handle' : type === 'performance' ? 'Optimize' : type === 'security' ? 'Secure' : 'Improve'}:
${result.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Please provide the improved code implementation.`;
      
      // Open Copilot chat with the prompt
      vscode.postMessage({ 
        type: 'openCopilotChat', 
        prompt: copilotPrompt 
      });
      setStatus(`Opening Copilot chat for ${type} improvements...`);
    }
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
            content: 'Starting intelligent analysis...',
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
            
            // Update status based on agent type with more descriptive messages
            if (agentType === 'thinking') {
              if (isComplete) {
                setStatus('Context gathering complete. Generating key observations...');
              } else {
                setStatus('Gathering codebase context and analyzing project structure...');
              }
            } else if (agentType === 'observations') {
              if (isComplete) {
                setStatus('Generating strategic approach...');
              } else {
                setStatus('Generating observations based on intelligent analysis...');
              }
            } else if (agentType === 'approach') {
              if (isComplete) {
                setStatus('Generating implementation plan...');
              } else {
                setStatus('Defining strategic approach...');
              }
            } else if (agentType === 'plan') {
              if (isComplete) {
                setStatus('Plan generation complete');
              } else {
                setStatus('Creating detailed implementation plan...');
              }
            }
            
            // Create block data
            const blockData = {
              id: `${agentType}-${Date.now()}`,
              type: agentType,
              heading: agentType === 'thinking' ? 'Intelligent Analysis & Context Gathering' :
                       agentType === 'observations' ? 'Key Observations' :
                       agentType === 'approach' ? 'Strategic Approach' :
                       'Implementation Plan',
              visible: true,
              isStreaming: !isComplete,
              streamedContent: content,
              streamedPoints: points
            };
            
            // Store in ref immediately for tracking
            streamingBlocksRef.current.set(agentType, blockData);
            console.log(`Stored ${agentType} block in ref:`, blockData);
            
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
                heading: agentType === 'thinking' ? 'Intelligent Analysis & Context Gathering' :
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
            
            // Loging the current state for debugging
            console.log(`Agent ${agentType} response processed:`, { content: content?.substring(0, 100), isComplete, points });
            console.log(`Current structuredBlocks count:`, currentStreamingMessage.structuredBlocks?.length || 0);
            console.log(`Current structuredBlocks types:`, currentStreamingMessage.structuredBlocks?.map(b => b.type) || []);
            console.log(`Ref blocks count:`, streamingBlocksRef.current.size);
            console.log(`Ref blocks types:`, Array.from(streamingBlocksRef.current.keys()));
          }
          break;

        case 'streamingComplete':
          console.log('Streaming complete');
          
          // Add a small delay to ensure all state updates are processed
          setTimeout(() => {
            if (currentStreamingMessage) {
              console.log('Current streaming message before completion:', currentStreamingMessage);
              console.log('Structured blocks before completion:', currentStreamingMessage.structuredBlocks);
              console.log('Ref blocks before completion:', Array.from(streamingBlocksRef.current.entries()));
              
              // Use ref data for validation instead of state data
              const requiredBlocks = ['thinking', 'observations', 'approach', 'plan'];
              const missingBlocks = requiredBlocks.filter(blockType => {
                const block = streamingBlocksRef.current.get(blockType);
                console.log(`Checking block type ${blockType} in ref:`, block);
                if (!block) {
                  console.log(`Block type ${blockType} not found in ref`);
                  return true;
                }
                if (blockType === 'observations') {
                  const hasPoints = block.streamedPoints && block.streamedPoints.length > 0;
                  console.log(`Block type ${blockType} has points:`, hasPoints, block.streamedPoints);
                  return !hasPoints;
                }
                const hasContent = block.streamedContent && block.streamedContent.trim() !== '';
                console.log(`Block type ${blockType} has content:`, hasContent, block.streamedContent?.substring(0, 100));
                return !hasContent;
              });
              
              if (missingBlocks.length > 0) {
                console.error('Missing or empty blocks:', missingBlocks);
                setStatus('Plan generation incomplete - missing: ' + missingBlocks.join(', '));
                setIsPlanComplete(false);
                return;
              }
              
              // Convert streaming message to regular message using ref data
              const finalBlocks = Array.from(streamingBlocksRef.current.values()).map(block => ({
                ...block,
                isStreaming: false,
                content: block.streamedContent || block.content || '',
                points: block.streamedPoints || block.points || []
              }));
              
              const finalMessage: ChatMessage = {
                ...currentStreamingMessage,
                isStreaming: false,
                structuredBlocks: finalBlocks
              };
              
              console.log('Final message created:', finalMessage);
              console.log('Final structured blocks:', finalMessage.structuredBlocks);
              
              // Reconstruct planResponse from ref data for execute plan functionality
              const reconstructedPlanResponse = {
                thinking: streamingBlocksRef.current.get('thinking')?.streamedContent || '',
                observations: streamingBlocksRef.current.get('observations')?.streamedPoints || [],
                approach: streamingBlocksRef.current.get('approach')?.streamedContent || '',
                detailedPlan: streamingBlocksRef.current.get('plan')?.streamedContent || ''
              };
              setPlanResponse(reconstructedPlanResponse);
              console.log('PlanResponse reconstructed:', reconstructedPlanResponse);
              
              addMessage(finalMessage);
              setCurrentStreamingMessage(null);
              setStatus('Intelligent analysis complete. Plan ready for execution.');
              setIsPlanComplete(true);
            }
          }, 100); // 100ms delay to ensure state updates are processed
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
          
          // Add the generated code message to the current tab
          if (activeTab === 'codeReview' && message.reviewType) {
            // For code review tab, add the message to the code review results
            setCodeReviewResults(prev => prev.map(result => {
              if (result.type === message.reviewType) {
                return {
                  ...result,
                  generatedCode: message.newCode || ''
                };
              }
              return result;
            }));
          } else {
            // For plan tab, add to messages
            addMessage(codeMessage);
          }
          break;
          
        case 'codeReviewResults':
          console.log('Processing code review results:', message);
          setStatus('Code review analysis complete');
          setCodeReviewResults(message.results || []);
          setIsCodeReviewAnalyzing(false);
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
  }, [currentStreamingMessage, activeTab]);

  return (
    <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text">
      <Header status={status} />
      
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={(tabId) => setActiveTab(tabId as 'plan' | 'codeReview')} 
      />
      
      {activeTab === 'plan' ? (
        <>
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
        </>
      ) : (
        <CodeReview
          onStartAnalysis={handleStartCodeReview}
          codeReviewResults={codeReviewResults}
          isAnalyzing={isCodeReviewAnalyzing}
          onExecutePlan={handleExecuteCodeReviewPlan}
          onGenerateWithCopilot={handleGenerateWithCopilot}
           onApplyChanges={() => {
                vscode.postMessage({ type: 'applyChanges' });
              }}
        />
      )}
    </div>
  );
};
