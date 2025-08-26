import * as vscode from "vscode";
import axios from "axios";
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { getWebviewContent } from "./generateWebView";
import { parseSuggestions, parseAIResponse, cleanCodeBlock, parseAgentResponse, createStructuredBlocks } from "./utils/parsingFunctions";
import { applyChangesToEditor, applySuggestionsAsComments } from './utils/ApplyFunctions';
import { AgentOrchestrator } from './utils/AgentSystem';
import { CodeReviewAgent } from './utils/CodeReviewAgents'; 
import { ToolTester } from './utils/TestTools';

interface PlanStep {
  step: number;
  description: string;
  status: 'pending' | 'completed' | 'executing';
}

interface AIResponse {
  plan: PlanStep[];
  newCode: string;
  explanation: string;
}

interface AgentResponse {
  thinking: string;
  observations: string[];
  approach: string;
  detailedPlan: string;
}

export function activate(context: vscode.ExtensionContext) {

	context.secrets.store("gemini-api-key",process.env.GEMINI_API_KEY || "");
  
  // Status Bar: quick launcher
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusItem.text = "$(zap) CodeHelper";
  statusItem.command = 'codeHelper.chatWithAI';
  statusItem.tooltip = 'Open CodeHelper Chat';
  statusItem.show();
  context.subscriptions.push(statusItem);


  // NEW COMMAND: Chat with AI -> opens chat UI without initial prompt
  const chatWithAI = vscode.commands.registerCommand(
    'codeHelper.chatWithAI',
    async () => {
      console.log("opening panel");
      const apiKey = await context.secrets.get('gemini-api-key');
      if (!apiKey) {
        vscode.window.showErrorMessage('Set your Gemini API Key first!');
        return;
      }
      console.log("opening editor");
      const editor = vscode.window.activeTextEditor;
      const document = editor?.document;
      const currentCode = document?.getText() || '';
      const fileName = document?.fileName || '';
      if (!apiKey) {
        vscode.window.showErrorMessage('Set your Gemini API Key first!');
        return;
      }
      
       console.log("opening panal");
      const panel = vscode.window.createWebviewPanel(
        'codehelperChat',
        'CodeHelper Chat',
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      panel.webview.html =  getWebviewContent(panel, context.extensionUri);
      console.log("panal opened");
      let latestGeneratedCode: string = '';
      let planResponse: AgentResponse | undefined;

      panel.webview.onDidReceiveMessage(async (message) => {
        console.log('Extension received message:', message);
        switch (message.type) {
          case 'userChatSubmit': {
            const prompt = message.prompt || '';
            if (!prompt.trim()) {return;}
            console.log('Sending updateStatus message');
            panel.webview.postMessage({ type: 'updateStatus', message: 'Starting intelligent analysis with context gathering...' });
            try {
              console.log('Calling intelligent agent system for planning...');
              const agentOrchestrator = new AgentOrchestrator();
              
              // Start streaming response with intelligent agent system
              panel.webview.postMessage({ type: 'streamingStart' });
              
              await agentOrchestrator.executeStreamingIntelligentAgenticLoop(
                apiKey, 
                currentCode, 
                prompt, 
                fileName,
                (streamingResponse) => {
                  console.log('Streaming response received:', {
                    type: streamingResponse.type,
                    contentLength: streamingResponse.content?.length || 0,
                    contentPreview: streamingResponse.content?.substring(0, 100),
                    pointsCount: streamingResponse.points?.length || 0,
                    isComplete: streamingResponse.isComplete
                  });
                  
                  panel.webview.postMessage({
                    type: 'streamingAgentResponse',
                    agentType: streamingResponse.type,
                    content: streamingResponse.content,
                    isComplete: streamingResponse.isComplete,
                    points: streamingResponse.points
                  });
                }
              );
              
              // Mark streaming as complete
              panel.webview.postMessage({ type: 'streamingComplete' });
              
              console.log('Intelligent planning complete via streaming');
            } catch (e: any) {
              console.error('Intelligent planning failed:', e);
              vscode.window.showErrorMessage('Intelligent planning failed: ' + e.message);
            }
            break;
          }
          case 'executePlan': {
            panel.webview.postMessage({ type: 'updateStatus', message: "Generating code..." });
            try {
              // Get planResponse from the webview message
              const planResponse = message.planResponse;
              const reviewType = message.reviewType; // Optional reviewType for code review tab
              if (!planResponse) {
                vscode.window.showErrorMessage('No plan available. Please submit a request first.');
                return;
              }
              
              console.log('Executing plan with response:', planResponse);
              
              // Use the original userPrompt for implementation
              const implementationPrompt = 'Implement the approved plan based on the latest chat plan.';
              
              // Convert AgentResponse to the format needed for implementation
              const planSteps = planResponse.detailedPlan
                .split('\n')
                .filter((line: string) => line.trim().match(/^### Step \d+:/))
                .map((line: string, index: number) => ({
                  step: index + 1,
                  description: line.replace(/^### Step \d+:\s*/, '').trim(),
                  status: 'pending' as const
                }));

              if (planSteps.length === 0) {
                vscode.window.showErrorMessage('No valid plan steps found. Please regenerate the plan.');
                return;
              }
              console.log('Plan steps for implementation:', planSteps); 

              const implementation = await callGeminiForImplementation(apiKey, currentCode, implementationPrompt, fileName, planSteps);
              const cleaned = cleanCodeBlock(implementation.newCode || '');
              latestGeneratedCode = cleaned;
              
              // Send streaming code generation
              panel.webview.postMessage({ 
                type: 'showGeneratedCode', 
                originalCode: currentCode, 
                newCode: cleaned,
                isStreaming: true,
                reviewType: reviewType
              });
            } catch (e: any) {
              console.error('Code generation failed:', e);
              vscode.window.showErrorMessage('Code generation failed: ' + e.message);
              panel.webview.postMessage({ type: 'updateStatus', message: 'Code generation failed' });
            }
            break;
          }
          case 'startCodeReview': {
            if (!apiKey) {
              vscode.window.showErrorMessage('No Gemini API key found. Please set your API key first.');
              panel.webview.postMessage({ type: 'updateStatus', message: 'No API key available' });
              return;
            }
            
            if (!currentCode || currentCode.trim() === '') {
              vscode.window.showErrorMessage('No code to analyze. Please open a file with code content.');
              panel.webview.postMessage({ type: 'updateStatus', message: 'No code content to analyze' });
              return;
            }
            
            panel.webview.postMessage({ type: 'updateStatus', message: 'Starting code review analysis...' });
            try {
              console.log('Starting code review analysis...');
              console.log('API key present:', !!apiKey);
              console.log('Code length:', currentCode.length);
              console.log('File name:', fileName);
              
              const codeReviewAgent = new CodeReviewAgent();
              
              const results = await codeReviewAgent.performCodeReview(
                currentCode,
                fileName,
                apiKey
              );
              
              console.log('Code review complete:', results);
              panel.webview.postMessage({ 
                type: 'codeReviewResults', 
                results: results 
              });
            } catch (e: any) {
              console.error('Code review failed:', e);
              let errorMessage = 'Code review failed';
              let statusMessage = 'Code review failed';
              
              if (e.message) {
                if (e.message.includes('Invalid API key')) {
                  errorMessage = 'Invalid Gemini API key. Please check your API key in the extension settings.';
                  statusMessage = 'Invalid API key - check extension settings';
                } else if (e.message.includes('Rate limit')) {
                  errorMessage = 'API rate limit exceeded. Please try again in a few minutes.';
                  statusMessage = 'Rate limit exceeded - try again later';
                } else if (e.message.includes('server error')) {
                  errorMessage = 'Gemini API server error. Please try again later.';
                  statusMessage = 'API server error - try again later';
                } else if (e.message.includes('timeout')) {
                  errorMessage = 'Request timed out. Please try again.';
                  statusMessage = 'Request timed out - try again';
                } else {
                  errorMessage = `Code review failed: ${e.message}`;
                  statusMessage = `Failed: ${e.message}`;
                }
              }
              
              vscode.window.showErrorMessage(errorMessage);
              panel.webview.postMessage({ type: 'updateStatus', message: statusMessage });
            }
            break;
          }
          
          case 'executeCodeReviewPlan': {
            panel.webview.postMessage({ type: 'updateStatus', message: "Generating code for code review improvements..." });
            try {
              const { reviewType, result } = message;
              if (!result) {
                vscode.window.showErrorMessage('No code review result available.');
                return;
              }
              
              console.log('Executing code review plan for:', reviewType, result);
              
              // Create a prompt for implementation based on the review result
              const implementationPrompt = `Implement the following ${reviewType} improvements based on the code review:

Issues Found:
${result.issues.map((issue: string) => `- ${issue}`).join('\n')}

Recommendations:
${result.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

Steps to ${reviewType === 'bug' ? 'Handle' : reviewType === 'performance' ? 'Optimize' : reviewType === 'security' ? 'Secure' : 'Improve'}:
${result.steps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n')}

Please provide the improved code implementation.`;

              const implementation = await callGeminiForImplementation(apiKey, currentCode, implementationPrompt, fileName, []);
              const cleaned = cleanCodeBlock(implementation.newCode || '');
              latestGeneratedCode = cleaned;
              
              panel.webview.postMessage({ 
                type: 'showGeneratedCode', 
                originalCode: currentCode, 
                newCode: cleaned,
                isStreaming: true,
                reviewType: reviewType
              });
            } catch (e: any) {
              console.error('Code review implementation failed:', e);
              vscode.window.showErrorMessage('Code review implementation failed: ' + e.message);
              panel.webview.postMessage({ type: 'updateStatus', message: 'Code review implementation failed' });
            }
            break;
          }
          
          case 'openCopilotChat': {
            try {
              const { prompt } = message;
              if (!prompt) {
                vscode.window.showErrorMessage('No prompt available for Copilot.');
                return;
              }

              // Copy the prompt to clipboard first as a reliable fallback
              await vscode.env.clipboard.writeText(prompt);

              // Discover available commands and try to open Copilot Chat or its view
              const allCommands = await vscode.commands.getCommands(true);
              const candidateCommands = [
                'github.copilot.chat.open',
                'github.copilot.openPanel',
                'github.copilot.toggleChat',
                // Reveal Copilot Chat view (older IDs)
                'workbench.view.extension.github-copilot-chat-view',
                // Open generic Chat view as a last resort
                'workbench.action.chat.openInSidebar',
                'workbench.action.chat.open'
              ];

              const available = candidateCommands.find(cmd => allCommands.includes(cmd));

              if (available) {
                try {
                  await vscode.commands.executeCommand(available);
                  panel.webview.postMessage({ type: 'updateStatus', message: 'Copilot chat opened. Prompt copied to clipboard – paste to send.' });
                  vscode.window.showInformationMessage('Copilot chat opened. Prompt is copied to your clipboard – paste it into Copilot chat.');
                } catch (inner) {
                  console.warn('Copilot open command failed, showing fallback:', inner);
                  vscode.window.showInformationMessage('Could not auto-open Copilot chat. Prompt copied to clipboard; open Copilot chat and paste.');
                  panel.webview.postMessage({ type: 'updateStatus', message: 'Prompt copied. Open Copilot chat and paste.' });
                }
              } else {
                vscode.window.showWarningMessage('Copilot Chat command not found. Is GitHub Copilot Chat installed and enabled? The prompt is copied to your clipboard.');
                panel.webview.postMessage({ type: 'updateStatus', message: 'Copilot command not found. Prompt copied to clipboard.' });
              }
            } catch (e: any) {
              console.error('Failed to handle Copilot chat request:', e);
              vscode.window.showErrorMessage('Failed to open Copilot chat. Prompt has been copied to clipboard.');
              panel.webview.postMessage({ type: 'updateStatus', message: 'Failed to open Copilot chat. Prompt copied to clipboard.' });
            }
            break;
          }
          
          case 'applyChanges': {
            if (!latestGeneratedCode) {
              vscode.window.showErrorMessage('No generated code to apply yet. Execute the plan first.');
              return;
            }
            if (editor) {
              await applyChangesToEditor(editor, latestGeneratedCode);
            }
            // Keep panel open for continued conversation
            break;
          }
          case 'cancel': {
            panel.dispose();
            break;
          }
        }
      });
    }
  );

  // NEW COMMAND: Test Tools
  const testTools = vscode.commands.registerCommand(
    'codeHelper.testTools',
    async () => {
      const toolTester = new ToolTester();
      
      // Show options to user
      const option = await vscode.window.showQuickPick(
        [
          { label: '🚀 Run All Tests', description: 'Test all tools with default parameters' },
          { label: '🎯 Custom Test', description: 'Test a specific tool with custom parameters' }
        ],
        {
          placeHolder: 'Choose testing option',
          matchOnDescription: true
        }
      );

      if (!option) {
        return;
      }

      try {
        if (option.label.includes('Run All Tests')) {
          await toolTester.runTests();
          vscode.window.showInformationMessage('✅ All tool tests completed! Check the output channel for results.');
        } else {
          await toolTester.promptUserForCustomTest();
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Error running tests: ${error}`);
      }
    }
  );

  context.subscriptions.push(chatWithAI, testTools);
}

export function deactivate() {}

// Helper to convert plan to text list for prompting
function formatPlanForPrompt(plan: PlanStep[]): string {
  if (!plan || plan.length === 0) {return 'No plan provided.';}
  return plan.map((p) => `${p.step}. ${p.description}`).join('\n');
}

// NEW FUNCTION: Implementation call after user approves plan
async function callGeminiForImplementation(
  apiKey: string,
  currentCode: string,
  userPrompt: string,
  fileName: string,
  plan: PlanStep[]
): Promise<AIResponse> {
  console.log("calling gemini for implementation with plan:::");  
  const planText = formatPlanForPrompt(plan);
  console.log("Implementation plan:", planText);  
  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an expert software engineer implementing the approved plan for: "${userPrompt}".

File: ${fileName}
Current Code:
${currentCode}

Approved PLAN:
${planText}

Requirements:
- Produce the full, working code for the file, replacing the current code entirely.
- The response MUST include ONLY the following sections:
NEW_CODE_START
[PASTE COMPLETE CODE HERE WITH NO MARKDOWN FENCES]
NEW_CODE_END
- Do NOT include triple backticks or any other markdown code fences.
- Ensure the code compiles without errors and preserves correct formatting and indentation.
- Do not add any commentary outside the specified sections.`,
            },
          ],
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    }
  );

  const rawResponse = response.data.candidates[0].content.parts[0].text;
  return parseAIResponse(rawResponse);
}