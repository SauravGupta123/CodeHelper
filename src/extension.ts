import * as vscode from "vscode";
import axios from "axios";

interface Suggestion {
  oldCode: string;
  newCode: string;
  lineNumber: number;
  explanation: string;
}

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
  // Command: Set Gemini API Key
  const setApiKey = vscode.commands.registerCommand(
    "codeHelper.setApiKey",
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: "Enter your Gemini API Key",
        password: true,
      });
      if (apiKey) {
        await context.secrets.store("gemini-api-key", apiKey);
        vscode.window.showInformationMessage("Gemini API Key saved!");
        console.log("Gemini API Key saved!");
      } else {
        vscode.window.showErrorMessage("Failed to save Gemini API Key.");
        console.log("Failed to save Gemini API Key.");
      }
    }
  );

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

  // Command: Analyze Code with Planning Layer (existing)
  const analyzeCode = vscode.commands.registerCommand(
    "codeHelper.analyzeCode",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor!");
        return;
      }

      const document = editor.document;
      const code = document.getText();

      try {
        vscode.window.showInformationMessage("Analyzing with Gemini...");

        const apiKey = await context.secrets.get("gemini-api-key");
        console.log("Gemini API Key: ", apiKey);
        if (!apiKey) {
          vscode.window.showErrorMessage("Set your Gemini API Key first!");
          return;
        }
        console.log("Gemini API Key is set.");
        // Gemini call
        const response = await axios.post(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are a code analyzer with a planning layer.
						First create a PLAN:
						1. Describe what needs to change in the code step by step.
						2. Then output structured SUGGESTIONS like:

						SUGGESTION_START
						OLD_CODE: ...
						NEW_CODE: ...
						LINE_NUMBER: ...
						EXPLANATION: ...
						SUGGESTION_END

						Here is the code:
						${code}`,
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

        const raw = response.data.candidates[0].content.parts[0].text;
        const suggestions = parseSuggestions(raw);
        console.log("Parsed suggestions: ", suggestions);
        await applySuggestionsAsComments(editor, suggestions);

        vscode.window.showInformationMessage("Analysis complete!");
      } catch (err: any) {
        console.log(err);
        vscode.window.showErrorMessage("Error: " + err.message);
      }
    }
  );

  const helloWorldCommand = vscode.commands.registerCommand(
    "codeHelper.helloWorld",
    () => {
      console.log("Hello World from codeHelpper!");
      console.log("I am saurav");
      vscode.window.showInformationMessage("Hello World from codeHelper!");
    }
  );

  context.subscriptions.push(analyzeCode, setApiKey, helloWorldCommand, createWithAI);
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
function parseAIResponse(rawResponse: string): AIResponse {
  const planMatch = rawResponse.match(/PLAN_START([\s\S]*?)PLAN_END/);
  const explanationMatch = rawResponse.match(/EXPLANATION_START([\s\S]*?)EXPLANATION_END/);
  const codeMatch = rawResponse.match(/NEW_CODE_START([\s\S]*?)NEW_CODE_END/);

  let plan: PlanStep[] = [];
  if (planMatch) {
    const planText = planMatch[1].trim();
    const steps = planText.split('\n').filter(line => line.trim());
    plan = steps.map((step, index) => ({
      step: index + 1,
      description: step.replace(/^\d+\.\s*/, '').trim(),
      status: 'pending' as const
    }));
  }

  return {
    plan,
    newCode: codeMatch ? codeMatch[1].trim() : '',
    explanation: explanationMatch ? explanationMatch[1].trim() : 'No explanation provided.'
  };
}

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

// NEW FUNCTION: Apply changes to editor
async function applyChangesToEditor(editor: vscode.TextEditor, newCode: string): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  const document = editor.document;
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  );
  
  edit.replace(document.uri, fullRange, newCode);
  await vscode.workspace.applyEdit(edit);
  vscode.window.showInformationMessage("Code changes applied successfully!");
}

// NEW FUNCTION: Generate webview HTML
function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Traycer AI</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007acc;
            margin: 0;
            font-size: 2rem;
        }
        .status {
            text-align: center;
            margin: 20px 0;
            font-size: 1.1rem;
            color: #ffd700;
        }
        .planning-section {
            background: #2d2d30;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            display: none;
        }
        .planning-section.visible {
            display: block;
        }
        .plan-title {
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 15px;
            color: #569cd6;
        }
        .plan-step {
            display: flex;
            align-items: center;
            margin: 10px 0;
            padding: 10px;
            background: #3c3c3c;
            border-radius: 5px;
            transition: all 0.3s ease;
        }
        .step-number {
            background: #007acc;
            color: white;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: bold;
            margin-right: 12px;
            flex-shrink: 0;
        }
        .step-number.executing {
            background: #ffd700;
            animation: pulse 1s infinite;
        }
        .step-number.completed {
            background: #4caf50;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        .step-description {
            flex-grow: 1;
        }
        .code-section {
            margin: 20px 0;
        }
        .code-title {
            font-size: 1.1rem;
            font-weight: bold;
            margin-bottom: 10px;
            color: #ce9178;
        }
        .code-container {
            background: #1e1e1e;
            border: 1px solid #3c3c3c;
            border-radius: 5px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
        }
        .explanation {
            background: #2d2d30;
            border-left: 4px solid #007acc;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin: 30px 0;
            flex-wrap: wrap;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
            transition: all 0.3s ease;
            min-width: 120px;
        }
        .btn-primary {
            background: #007acc;
            color: white;
        }
        .btn-primary:hover {
            background: #005a9e;
            transform: translateY(-2px);
        }
        .btn-success {
            background: #4caf50;
            color: white;
            display: none;
        }
        .btn-success:hover {
            background: #45a049;
            transform: translateY(-2px);
        }
        .btn-success.visible {
            display: inline-block;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background: #5a6268;
            transform: translateY(-2px);
        }
        .loading {
            text-align: center;
            margin: 20px 0;
        }
        .loading-spinner {
            border: 3px solid #3c3c3c;
            border-top: 3px solid #007acc;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Traycer AI</h1>
            <p>AI-powered code generation and planning</p>
        </div>
        
        <div class="loading" id="loading">
            <div class="loading-spinner"></div>
            <div class="status" id="status">Initializing...</div>
        </div>
        
        <div class="planning-section" id="planningSection">
            <div class="plan-title">📋 Execution Plan</div>
            <div id="planSteps"></div>
            
            <div class="explanation" id="explanation" style="display: none;">
                <h3>💡 Explanation</h3>
                <p id="explanationText"></p>
            </div>
            
            <div class="code-section" style="display: none;" id="codeSection">
                <div class="code-title">📄 Original Code</div>
                <div class="code-container" id="originalCode"></div>
                
                <div class="code-title">✨ Generated Code</div>
                <div class="code-container" id="newCode"></div>
            </div>
            
            <div class="buttons">
                <button class="btn btn-primary" id="executeBtn" onclick="executePlan()">
                    ▶️ Execute Plan
                </button>
                <button class="btn btn-success" id="applyBtn" onclick="applyChanges()">
                    ✅ Apply Changes
                </button>
                <button class="btn btn-secondary" onclick="cancel()">
                    ❌ Cancel
                </button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentPlan = [];
        let isExecuted = false;

        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateStatus':
                    document.getElementById('status').textContent = message.message;
                    break;
                    
                case 'showPlan':
                    showPlan(message);
                    break;
                    
                case 'updateStepStatus':
                    updateStepStatus(message.stepIndex, message.status);
                    break;
                    
                case 'executionComplete':
                    onExecutionComplete();
                    break;
            }
        });

        function showPlan(data) {
            currentPlan = data.plan;
            
            // Hide loading
            document.getElementById('loading').style.display = 'none';
            
            // Show planning section
            document.getElementById('planningSection').classList.add('visible');
            
            // Populate plan steps
            const stepsContainer = document.getElementById('planSteps');
            stepsContainer.innerHTML = '';
            
            data.plan.forEach((step, index) => {
                const stepElement = document.createElement('div');
                stepElement.className = 'plan-step';
                stepElement.innerHTML = \`
                    <div class="step-number" id="step-\${index}">\${step.step}</div>
                    <div class="step-description">\${step.description}</div>
                \`;
                stepsContainer.appendChild(stepElement);
            });
            
            // Show explanation
            document.getElementById('explanation').style.display = 'block';
            document.getElementById('explanationText').textContent = data.explanation;
            
            // Show code section
            document.getElementById('codeSection').style.display = 'block';
            document.getElementById('originalCode').textContent = data.originalCode;
            document.getElementById('newCode').textContent = data.newCode;
        }

        function updateStepStatus(stepIndex, status) {
            const stepElement = document.getElementById(\`step-\${stepIndex}\`);
            stepElement.className = \`step-number \${status}\`;
        }

        function onExecutionComplete() {
            isExecuted = true;
            document.getElementById('executeBtn').style.display = 'none';
            document.getElementById('applyBtn').classList.add('visible');
        }

        function executePlan() {
            vscode.postMessage({ type: 'executePlan' });
        }

        function applyChanges() {
            if (!isExecuted) {
                alert('Please execute the plan first!');
                return;
            }
            vscode.postMessage({ type: 'applyChanges' });
        }

        function cancel() {
            vscode.postMessage({ type: 'cancel' });
        }
    </script>
</body>
</html>`;
}

// Existing functions (parseSuggestions, extractSection, etc.)
function parseSuggestions(rawResponse: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const suggestionRegex = /SUGGESTION_START([\s\S]*?)SUGGESTION_END/g;
  const matches = rawResponse.matchAll(suggestionRegex);

  for (const match of matches) {
    const suggestionText = match[1];
    const suggestion: Suggestion = {
      oldCode: cleanCodeBlock(extractSection(suggestionText, "OLD_CODE")),
      newCode: cleanCodeBlock(extractSection(suggestionText, "NEW_CODE")),
      lineNumber: parseInt(extractSection(suggestionText, "LINE_NUMBER")),
      explanation: extractSection(suggestionText, "EXPLANATION"),
    };
    suggestions.push(suggestion);
  }

  return suggestions;
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\w+:|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function cleanCodeBlock(code: string): string {
  return code.replace(/```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
}

async function applySuggestionsAsComments(
  editor: vscode.TextEditor,
  suggestions: Suggestion[]
) {
  const edit = new vscode.WorkspaceEdit();

  for (const suggestion of suggestions) {
    if (!suggestion.lineNumber || suggestion.lineNumber < 1) {
      suggestion.lineNumber = 1;
    }

    const position = new vscode.Position(suggestion.lineNumber - 1, 0);

    const comment = [
      `// --- AI Suggestion ---`,
      `// Old Code:`,
      ...suggestion.oldCode.split("\n").map((line) => "// " + line),
      `// New Code:`,
      ...suggestion.newCode.split("\n").map((line) => "// " + line),
      `// Explanation: ${suggestion.explanation}`,
      `// --- End Suggestion ---\n`,
    ].join("\n");

    edit.insert(editor.document.uri, position, comment + "\n");
  }

  await vscode.workspace.applyEdit(edit);
}

export function deactivate() {}