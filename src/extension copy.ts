import * as vscode from "vscode";
import axios from "axios";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "codeHelper.analyzeCode",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor!");
        return;
      }

      const document = editor.document;
      const fullText = document.getText();

      try {
        vscode.window.showInformationMessage("Analyzing code...");

        // ------------------ Sending to gpt ---------------------
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: `Analyze this code and suggest improvements. Format your response like this for each suggestion:
                    SUGGESTION_START
                    OLD_CODE: [paste the old code here]
                    NEW_CODE: [paste the suggested new code here]
                    LINE_NUMBER: [provide the line number for the suggestion]
                    EXPLANATION: [explain the suggestion]
                    SUGGESTION_END
                    
                    Here's the code to analyze:
                    
                    ${fullText}`,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${await context.secrets.get(
                "openai-api-key"
              )}`,
              "Content-Type": "application/json",
            },
          }
        );

        const suggestions = parseSuggestions(
          response.data.choices[0].message.content
        );

        //  suggestions as comments
        await applySuggestionsAsComments(editor, suggestions);
        vscode.window.showInformationMessage("Code analysis complete!");
      } catch (error) {
        let errorMessage = "Error analyzing code.";
        if (error instanceof Error) {
          errorMessage += " " + error.message;
        }
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  );
  context.subscriptions.push(disposable);

  const helloWorldCommand = vscode.commands.registerCommand('codeHelper.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from codeHelper!');
	});

  context.subscriptions.push(helloWorldCommand);
  // Register command to set API key
  let setApiKey = vscode.commands.registerCommand(
    "codeHelper.setApiKey",
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: "Enter your OpenAI API Key",
        password: true,
      });
      if (apiKey) {
        await context.secrets.store("openai-api-key", apiKey);
        vscode.window.showInformationMessage("api Key saved !");
      }
    }
  );
  context.subscriptions.push(setApiKey);
}

function parseSuggestions(rawResponse: string): any[] {
  const suggestions = [];
  const suggestionRegex = /SUGGESTION_START([\s\S]*?)SUGGESTION_END/g;
  const matches = rawResponse.matchAll(suggestionRegex);

  for (const match of matches) {
    const suggestionText = match[1];
    const suggestion = {
      oldCode: extractSection(suggestionText, "OLD_CODE"),
      newCode: extractSection(suggestionText, "NEW_CODE"),
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
async function applySuggestionsAsComments(
  editor: vscode.TextEditor,
  suggestions: any[]
) {
  const edit = new vscode.WorkspaceEdit();
  for (const suggestion of suggestions) {
    const position = new vscode.Position(suggestion.lineNumber - 1, 0);
    edit.insert(
      editor.document.uri,
      position,
      `// Suggestion: ${suggestion.newCode}\n// Explanation: ${suggestion.explanation}\n`
    );
  }
  await vscode.workspace.applyEdit(edit);
}
export function deactivate() {}
