import React, { useState } from 'react';
import { CodeReviewType, CodeReviewResult } from '../types';
interface CodeReviewProps {
  onStartAnalysis: () => void;
  codeReviewResults?: CodeReviewResult[];
  isAnalyzing: boolean;
  onExecutePlan: (type: 'bug' | 'performance' | 'security' | 'clarity') => void;
  onGenerateWithCopilot: (type: 'bug' | 'performance' | 'security' | 'clarity') => void;
  onApplyChanges: () => void; 
}

const codeReviewTypes: CodeReviewType[] = [
  {
    type: 'bug',
    label: 'Bug',
    color: 'bg-red-500',
    description: 'Identify and fix potential bugs and errors'
  },
  {
    type: 'performance',
    label: 'Performance',
    color: 'bg-green-500',
    description: 'Optimize code for better performance'
  },
  {
    type: 'security',
    label: 'Security',
    color: 'bg-blue-500',
    description: 'Identify security vulnerabilities and best practices'
  },
  {
    type: 'clarity',
    label: 'Clarity',
    color: 'bg-purple-500',
    description: 'Improve code readability and maintainability'
  }
];

export const CodeReview: React.FC<CodeReviewProps> = ({
  onStartAnalysis,
  codeReviewResults = [],
  isAnalyzing,
  onExecutePlan,
  onGenerateWithCopilot,
  onApplyChanges
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (type: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedSections(newExpanded);
  };

  const getResultForType = (type: 'bug' | 'performance' | 'security' | 'clarity') => {
    return codeReviewResults.find(result => result.type === type);
  };

  const hasAnyResults = codeReviewResults.length > 0;
  
  // Check if there are API errors
  const hasApiErrors = codeReviewResults.some(result => 
    result.issues.some(issue => 
      issue.includes('API call failed') || 
      issue.includes('Invalid API key') || 
      issue.includes('Rate limit') ||
      issue.includes('server error') ||
      issue.includes('timeout')
    )
  );
  
  const getApiErrorType = () => {
    const errorResult = codeReviewResults.find(result => 
      result.issues.some(issue => 
        issue.includes('API call failed') || 
        issue.includes('Invalid API key') || 
        issue.includes('Rate limit') ||
        issue.includes('server error') ||
        issue.includes('timeout')
      )
    );
    
    if (errorResult) {
      const errorIssue = errorResult.issues.find(issue => 
        issue.includes('API call failed') || 
        issue.includes('Invalid API key') || 
        issue.includes('Rate limit') ||
        issue.includes('server error') ||
        issue.includes('timeout')
      );
      
      if (errorIssue?.includes('Invalid API key')) {
        return 'invalid_key';
      } else if (errorIssue?.includes('Rate limit')) {
        return 'rate_limit';
      } else if (errorIssue?.includes('server error')) {
        return 'server_error';
      } else if (errorIssue?.includes('timeout')) {
        return 'timeout';
      } else {
        return 'api_error';
      }
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-vscode-bg">
      {!hasAnyResults && (
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4 text-vscode-text">Code Review Analysis</h2>
          <p className="text-gray-400 mb-6">
            Click "Start Analysis" to review your code for bugs, performance issues, security vulnerabilities, and clarity improvements.
          </p>
          
      
          
          <button
            onClick={onStartAnalysis}
            disabled={isAnalyzing}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isAnalyzing
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
          </button>
          
       
        </div>
      )}

      {hasAnyResults && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4 text-vscode-text">Code Review Results</h2>
          
          {hasApiErrors && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-300">
                    {getApiErrorType() === 'invalid_key' && 'Invalid API Key'}
                    {getApiErrorType() === 'rate_limit' && 'Rate Limit Exceeded'}
                    {getApiErrorType() === 'server_error' && 'API Server Error'}
                    {getApiErrorType() === 'timeout' && 'Request Timeout'}
                    {getApiErrorType() === 'api_error' && 'API Error'}
                  </h3>
                  <div className="mt-2 text-sm text-red-400">
                    {getApiErrorType() === 'invalid_key' && (
                      <p>Your Gemini API key appears to be invalid. Please check your API key in the extension settings.</p>
                    )}
                    {getApiErrorType() === 'rate_limit' && (
                      <p>API rate limit exceeded. Please wait a few minutes and try again.</p>
                    )}
                    {getApiErrorType() === 'server_error' && (
                      <p>Gemini API server error. Please try again later.</p>
                    )}
                    {getApiErrorType() === 'timeout' && (
                      <p>Request timed out. Please try again.</p>
                    )}
                    {getApiErrorType() === 'api_error' && (
                      <p>An error occurred while calling the Gemini API. Please check your connection and try again.</p>
                    )}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={onStartAnalysis}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-300 bg-red-900/30 hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Retry Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {codeReviewTypes.map((reviewType) => {
            const result = getResultForType(reviewType.type);
            const isExpanded = expandedSections.has(reviewType.type);
            
            return (
              <div key={reviewType.type} className="border border-gray-700 rounded-lg overflow-hidden bg-vscode-bg">
                <div
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 transition-colors ${
                    isExpanded ? 'bg-gray-800' : ''
                  }`}
                  onClick={() => toggleSection(reviewType.type)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${reviewType.color}`}></div>
                    <div>
                      <h3 className="font-medium text-vscode-text">{reviewType.label}</h3>
                      <p className="text-sm text-gray-400">{reviewType.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {result && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        result.hasIssues 
                          ? 'bg-red-900/30 text-red-300' 
                          : 'bg-green-900/30 text-green-300'
                      }`}>
                        {result.hasIssues ? 'Issues Found' : 'No Issues'}
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 transition-transform text-gray-400 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-700 p-4 bg-gray-800/50">
                    {!result ? (
                      <div className="text-center py-4 text-gray-400">
                        Analysis in progress...
                      </div>
                    ) : result.hasIssues ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 text-vscode-text">Issues Found:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                            {result.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2 text-vscode-text">Recommendations:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                            {result.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2 text-vscode-text">Steps to {reviewType.type === 'bug' ? 'Handle' : 
                            reviewType.type === 'performance' ? 'Optimize' : 
                            reviewType.type === 'security' ? 'Secure' : 'Improve'}:</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                            {result.steps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        <div className="flex space-x-3 pt-2">
                          <button
                            onClick={() => onExecutePlan(reviewType.type)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Generate with CodeHelper
                          </button>
                          <button
                            onClick={() => onGenerateWithCopilot(reviewType.type)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Generate with Copilot
                          </button>
                        </div>

                        {/* Display generated code if available */}
                        {result.generatedCode && (
                          <div className="mt-4 p-4 bg-gray-900/50 border border-gray-600 rounded-lg">
                            <h4 className="font-medium mb-3 text-vscode-text">Generated Code:</h4>
                            <div className="bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                              <pre className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                                <code>{result.generatedCode}</code>
                              </pre>
                            </div>
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={onApplyChanges}
                                className="px-4 py-2 bg-vscode-success text-white rounded-lg font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-vscode-success focus:ring-offset-2 focus:ring-offset-vscode-surface transition-all"
                              >
                               Apply Changes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-green-400 font-medium mb-2">No {reviewType.label.toLowerCase()} issues detected</div>
                        <p className="text-sm text-gray-400">
                          Your code follows best practices for {reviewType.label.toLowerCase()}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

