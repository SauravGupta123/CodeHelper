import * as vscode from "vscode";

interface Suggestion {
  oldCode: string;
  newCode: string;
  lineNumber: number;
  explanation: string;
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

