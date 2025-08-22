import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './types';
import { Header } from './components/Header';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { useVSCodeAPI } from './hooks/useVSCodeAPI';
import { PlanningOverlay } from './components/PlanningOverlay';

declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

const vscode = window.acquireVsCodeApi();

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { status, setStatus } = useVSCodeAPI(vscode);
  const [isPlanning, setIsPlanning] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
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
    setStatus('Thinking… generating plan');
    setIsPlanning(true);
    
    vscode.postMessage({ type: 'userChatSubmit', prompt: content });
  };

  // Listen for messages from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from extension:', event.data);
      const message = event.data;
      
      switch (message.type) {
        case 'assistantPlan':
          console.log('Processing assistant plan:', message);
          setIsPlanning(false);
          setStatus('Plan ready');
          const assistantMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'assistant',
            content: 'Execution Plan',
            timestamp: new Date(),
            plan: message.plan || [],
            explanation: message.explanation || ''
          };
          addMessage(assistantMessage);
          break;
          
        case 'showGeneratedCode':
          console.log('Processing generated code:', message);
          setStatus('Generation complete');
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
          if (message.message?.toLowerCase().includes('analyzing')) {
            setIsPlanning(true);
          }
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text">
      <Header status={status} />
      
      <div 
        ref={chatRef}
        className="relative flex-1 overflow-y-auto"
      >
        <PlanningOverlay visible={isPlanning} status={status} />
        <ChatMessages 
          messages={messages} 
          onExecutePlan={() => {
            vscode.postMessage({ type: 'executePlan' });
            setStatus("Generating code (I'm working on it)...");
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
