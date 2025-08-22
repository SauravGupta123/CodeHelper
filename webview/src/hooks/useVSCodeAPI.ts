import { useState, useEffect } from 'react';
import { VSCodeMessage } from '../types';

interface Status {
  message: string;
  loading: boolean;
}

export const useVSCodeAPI = (vscode: any) => {
  const [status, setStatus] = useState<Status>({ message: 'Ready', loading: false });

  const sendMessage = (type: string, data: any = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        vscode.postMessage({ type, ...data });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  // Message handling is now done in the App component
  // This hook only manages local status state

  return {
    sendMessage,
    status: status.message,
    setStatus: (message: string, loading: boolean = false) => 
      setStatus({ message, loading }),
  };
};
