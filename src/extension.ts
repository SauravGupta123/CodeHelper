import * as vscode from "vscode";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();
import { getWebviewContent } from "./generateWebView";
import { parseSuggestions, parseAIResponse, cleanCodeBlock, parseAgentResponse, createStructuredBlocks } from "./utils/parsingFunctions";
import { applyChangesToEditor, applySuggestionsAsComments } from './utils/ApplyFunctions';
import { AgentOrchestrator } from './utils/AgentSystem';

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

	context.secrets.store("gemini-api-key", process.env.GEMINI_API_KEY || '');
  // Command: Set Gemini API Key




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
            if (!prompt.trim()) return;
            console.log('Sending updateStatus message');
            panel.webview.postMessage({ type: 'updateStatus', message: 'Analyzing your request...' });
            try {
              console.log('Calling Gemini for planning...');
              const agentOrchestrator = new AgentOrchestrator();
              
              // Start streaming response
              panel.webview.postMessage({ type: 'streamingStart' });
              
              await agentOrchestrator.executeStreamingAgenticLoop(
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
              
              // Store the plan response for later use (we'll reconstruct it from the streaming data)
              // No need to call executeAgenticLoop again since streaming provides all data
              console.log('Planning complete via streaming, planResponse will be available after streamingComplete');
            } catch (e: any) {
              console.error('Planning failed:', e);
              vscode.window.showErrorMessage('Planning failed: ' + e.message);
            }
            break;
          }
          case 'executePlan': {
            panel.webview.postMessage({ type: 'updateStatus', message: "Generating code..." });
            try {
              // Get planResponse from the webview message
              const planResponse = message.planResponse;
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

              const implementation = await callGeminiForImplementation(apiKey, currentCode, implementationPrompt, fileName, planSteps);
              const cleaned = cleanCodeBlock(implementation.newCode || '');
              latestGeneratedCode = cleaned;
              
              // Send streaming code generation
              panel.webview.postMessage({ 
                type: 'showGeneratedCode', 
                originalCode: currentCode, 
                newCode: cleaned,
                isStreaming: true
              });
            } catch (e: any) {
              console.error('Code generation failed:', e);
              vscode.window.showErrorMessage('Code generation failed: ' + e.message);
              panel.webview.postMessage({ type: 'updateStatus', message: 'Code generation failed' });
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


  context.subscriptions.push( chatWithAI);
}

export function deactivate() {}



// Helper to convert plan to text list for prompting
function formatPlanForPrompt(plan: PlanStep[]): string {
  if (!plan || plan.length === 0) return 'No plan provided.';
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