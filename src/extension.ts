import * as vscode from "vscode";
import axios from "axios";
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

	context.secrets.store("gemini-api-key", "AIzaSyAH_BAmT2b2jL9ZK-osH9RkggLygmUnwNI");
  // Command: Set Gemini API Key


  // NEW COMMAND: Create with AI (Traycer.ai clone) -> opens Chat-like webview
  const createWithAI = vscode.commands.registerCommand(
    "codeHelper.createWithAI",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor!");
        return;
      }

      // Step 1: Show dialog asking what to build
      const userPrompt = await vscode.window.showInputBox({
        prompt: "What do you want to build or modify in this code?",
        placeHolder: "E.g., Add error handling, refactor this function, add unit tests...",
        value: "",
      });

      if (!userPrompt) {
        return; // User cancelled
      }
      
      // Step 2: Get current code
      const document = editor.document;
      const currentCode = document.getText();
      const fileName = document.fileName;

      try {
        // Step 3: Check API key
        const apiKey = await context.secrets.get("gemini-api-key");
        if (!apiKey) {
          vscode.window.showErrorMessage("Set your Gemini API Key first!");
          return;
        }

        // Step 4: Create and show webview panel (chat UI)
        const panel = vscode.window.createWebviewPanel(
          'codehelperChat',
          'CodeHelper Chat',
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
            retainContextWhenHidden: true
          }
        );

        // Step 5: Set initial HTML
       const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'webview', 'index.html');
const htmlContent = await vscode.workspace.fs.readFile(htmlPath);
panel.webview.html = htmlContent.toString();

        // Step 6: Kick off planning immediately with user's prompt
        panel.webview.postMessage({ type: 'updateStatus', message: 'Analyzing your request...' });

        const agentOrchestrator = new AgentOrchestrator();
        const response = await agentOrchestrator.executeAgenticLoop(apiKey, currentCode, userPrompt, fileName);

        // Convert to structured blocks
        const structuredBlocks = createStructuredBlocks(response);

        panel.webview.postMessage({
          type: 'assistantPlan',
          structuredBlocks: structuredBlocks
        });

        // Step 7: Handle webview messages (chat protocol)
        let latestGeneratedCode: string = '';
        let planResponse: any;
        panel.webview.onDidReceiveMessage(
          async (message) => {
            switch (message.type) {
              case 'userChatSubmit': {
                // Re-run planning based on freeform chat message
                const newPrompt: string = message.prompt || userPrompt;
                panel.webview.postMessage({ type: 'updateStatus', message: 'Analyzing your request...' });
                try {
                  const agentOrchestrator = new AgentOrchestrator();
                  const planResp = await agentOrchestrator.executeAgenticLoop(apiKey, currentCode, newPrompt, fileName);
                  planResponse = planResp;
                  const structuredBlocks = createStructuredBlocks(planResp);
                  panel.webview.postMessage({ 
                    type: 'assistantPlan', 
                    structuredBlocks: structuredBlocks 
                  });
                } catch (e: any) {
                  vscode.window.showErrorMessage('Planning failed: ' + e.message);
                }
                break;
              }
              case 'executePlan': {
                panel.webview.postMessage({ type: 'updateStatus', message: "Generating code (I'm working on it)..." });
                try {
                  // Convert AgentResponse to AIResponse format for compatibility
                  const aiResponse: AIResponse = {
                    plan: planResponse ? [{ step: 1, description: 'Execute the approved plan', status: 'pending' }] : [],
                    newCode: '',
                    explanation: planResponse ? planResponse.detailedPlan : ''
                  };
                  const implementation = await callGeminiForImplementation(apiKey, currentCode, userPrompt, fileName, aiResponse.plan);
                  const cleaned = cleanCodeBlock(implementation.newCode || '');
                  latestGeneratedCode = cleaned;
                  panel.webview.postMessage({ type: 'showGeneratedCode', originalCode: currentCode, newCode: cleaned });
                } catch (implErr: any) {
                  console.log(implErr);
                  vscode.window.showErrorMessage("Error generating implementation: " + implErr.message);
                }
                break;
              }
              case 'applyChanges': {
                if (!latestGeneratedCode) {
                  vscode.window.showErrorMessage('No generated code to apply yet. Execute the plan first.');
                  return;
                }
                await applyChangesToEditor(editor, latestGeneratedCode);
                // Do not close panel; keep chat open for further prompts
                break;
              }
              case 'cancel': {
                panel.dispose();
                break;
              }
            }
          },
          undefined,
          context.subscriptions
        );

      } catch (err: any) {
        console.log(err);
        vscode.window.showErrorMessage("Error: " + err.message);
      }
    }
  );

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
              planResponse = await agentOrchestrator.executeAgenticLoop(apiKey, currentCode, prompt, fileName);
              console.log('Sending assistantPlan message:', planResponse);
              const structuredBlocks = createStructuredBlocks(planResponse);
              panel.webview.postMessage({ 
                type: 'assistantPlan', 
                structuredBlocks: structuredBlocks 
              });
            } catch (e: any) {
              console.error('Planning failed:', e);
              vscode.window.showErrorMessage('Planning failed: ' + e.message);
            }
            break;
          }
          case 'executePlan': {
            panel.webview.postMessage({ type: 'updateStatus', message: "Generating code (I'm working on it)..." });
            try {
              // Use the last shown plan (cannot read from webview state, so re-plan quickly is also ok). For simplicity, re-plan using last prompt is not stored here.
              const prompt = 'Implement the approved plan based on the latest chat plan.';
              if (!planResponse) {
                vscode.window.showErrorMessage('No plan available. Please submit a request first.');
                return;
              }
              
              // Convert AgentResponse to the format needed for implementation
              const planSteps = planResponse.detailedPlan
                .split('\n')
                .filter((line: string) => line.trim().match(/^### Step \d+:/))
                .map((line: string, index: number) => ({
                  step: index + 1,
                  description: line.replace(/^### Step \d+:\s*/, '').trim(),
                  status: 'pending' as const
                }));

              const implementation = await callGeminiForImplementation(apiKey, currentCode, prompt, fileName, planSteps);
              const cleaned = cleanCodeBlock(implementation.newCode || '');
              latestGeneratedCode = cleaned;
              panel.webview.postMessage({ type: 'showGeneratedCode', originalCode: currentCode, newCode: cleaned });
            } catch (e: any) {
              vscode.window.showErrorMessage('Generation failed: ' + e.message);
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

  // TEST COMMAND: Open webview for testing
  const openTestWebview = vscode.commands.registerCommand(
    'codeHelper.openTestWebview',
    async () => {
      console.log("Opening test webview");
      const panel = vscode.window.createWebviewPanel(
        'testWebview',
        'Test Webview',
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'webview', 'index.html');
      const htmlContent = await vscode.workspace.fs.readFile(htmlPath);
      panel.webview.html = htmlContent.toString();
      console.log("Test webview opened"); 
    }
  );
  context.subscriptions.push(createWithAI, chatWithAI, openTestWebview);
}

export function deactivate() {}

// NEW FUNCTION: Call Gemini for planning
async function callGeminiForPlanning(apiKey: string, currentCode: string, userPrompt: string, fileName: string): Promise<AIResponse> {
  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI code assistant. The user wants to achieve: "${userPrompt}"

File: ${fileName}
Current Code:
${currentCode}

Task: Provide a detailed execution plan ONLY (no code yet). The plan must be clean markdown that renders well with headings and bullet lists.

Strict output contract (do not include any extra text):

PLAN_START
# Execution Plan
## Steps
1. Step title: brief one-line summary
   - Key action
   - Important note
2. Step title: brief one-line summary
   - Key action
   - Important note
...
PLAN_END

EXPLANATION_START
# Rationale
## Overview
- Why this approach
- Risks and mitigations
## Success Criteria
- What good looks like
EXPLANATION_END`,
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