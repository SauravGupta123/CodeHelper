import * as vscode from "vscode";
import axios from "axios";
import { getWebviewContent } from "./generateWebView";
import { parseSuggestions, parseAIResponse } from "./utils/parsingFunctions";
import {applyChangesToEditor, applySuggestionsAsComments}  from './utils/ApplyFunctions';	


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

export function activate(context: vscode.ExtensionContext) {

	context.secrets.store("gemini-api-key", "AIzaSyAH_BAmT2b2jL9ZK-osH9RkggLygmUnwNI");
  // Command: Set Gemini API Key


  // NEW COMMAND: Create with AI (Traycer.ai clone)
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

        // Step 4: Create and show webview panel
        const panel = vscode.window.createWebviewPanel(
          'traycerAI',
          'Traycer AI - Code Generation',
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
            retainContextWhenHidden: true
          }
        );

        // Step 5: Set initial HTML
        panel.webview.html = getWebviewContent();

        // Step 6: Send request to Gemini
        panel.webview.postMessage({
          type: 'updateStatus',
          message: 'Analyzing your request...'
        });

        const response = await callGeminiForPlanning(apiKey, currentCode, userPrompt, fileName);
        
        // Step 7: Display planning process
        panel.webview.postMessage({
          type: 'showPlan',
          plan: response.plan,
          originalCode: currentCode,
          newCode: response.newCode,
          explanation: response.explanation
        });

        // Step 8: Handle webview messages
        panel.webview.onDidReceiveMessage(
          async (message) => {
            switch (message.type) {
              case 'executePlan':
                await executeCodeGeneration(panel, response);
                break;
              case 'applyChanges':
                await applyChangesToEditor(editor, response.newCode);
                panel.dispose();
                break;
              case 'cancel':
                panel.dispose();
                break;
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

 


  context.subscriptions.push(createWithAI);
}

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
              text: `You are an AI code assistant. The user wants to: "${userPrompt}"

File: ${fileName}
Current Code:
${currentCode}

Please respond with a structured plan and implementation in this exact format:

PLAN_START
1. [First step description]
2. [Second step description]
3. [Third step description]
...
PLAN_END

EXPLANATION_START
[Detailed explanation of what you're doing and why]
EXPLANATION_END

NEW_CODE_START
[Complete new/modified code here]
NEW_CODE_END

Make sure the new code is complete and functional.`,
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

// NEW FUNCTION: Parse AI response


// NEW FUNCTION: Execute code generation with animated steps
async function executeCodeGeneration(panel: vscode.WebviewPanel, response: AIResponse): Promise<void> {
  for (let i = 0; i < response.plan.length; i++) {
    // Update step status to executing
    panel.webview.postMessage({
      type: 'updateStepStatus',
      stepIndex: i,
      status: 'executing'
    });

    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Update step status to completed
    panel.webview.postMessage({
      type: 'updateStepStatus',
      stepIndex: i,
      status: 'completed'
    });
  }

  // Show final result
  panel.webview.postMessage({
    type: 'executionComplete'
  });
}



export function deactivate() {}