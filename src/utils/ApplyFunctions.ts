import * as vscode from "vscode";

interface Suggestion {
  oldCode: string;
  newCode: string;
  lineNumber: number;
  explanation: string;
}
export async function applySuggestionsAsComments(
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


export async function applyChangesToEditor(editor: vscode.TextEditor, newCode: string): Promise<void> {
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

