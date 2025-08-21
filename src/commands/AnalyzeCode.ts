import * as vscode from "vscode";

// export const analyzeCode = vscode.commands.registerCommand(
//     "codeHelper.analyzeCode",
//     async () => {
//       const editor = vscode.window.activeTextEditor;
//       if (!editor) {
//         vscode.window.showErrorMessage("No active editor!");
//         return;
//       }

//       const document = editor.document;
//       const code = document.getText();

//       try {
//         vscode.window.showInformationMessage("Analyzing with Gemini...");

//         const apiKey = await context.secrets.get("gemini-api-key");
//         console.log("Gemini API Key: ", apiKey);
//         if (!apiKey) {
//           vscode.window.showErrorMessage("Set your Gemini API Key first!");
//           return;
//         }
//         console.log("Gemini API Key is set.");
//         // Gemini call
//         const response = await axios.post(
//           "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
//           {
//             contents: [
//               {
//                 role: "user",
//                 parts: [
//                   {
//                     text: `You are a code analyzer with a planning layer.
//                         First create a PLAN:
//                         1. Describe what needs to change in the code step by step.
//                         2. Then output structured SUGGESTIONS like:

//                         SUGGESTION_START
//                         OLD_CODE: ...
//                         NEW_CODE: ...
//                         LINE_NUMBER: ...
//                         EXPLANATION: ...
//                         SUGGESTION_END

//                         Here is the code:
//                         ${code}`,
//                   },
//                 ],
//               },
//             ],
//           },
//           {
//             headers: {
//               "Content-Type": "application/json",
//               "x-goog-api-key": apiKey,
//             },
//           }
//         );

//         const raw = response.data.candidates[0].content.parts[0].text;
//         const suggestions = parseSuggestions(raw);
//         console.log("Parsed suggestions: ", suggestions);
//         await applySuggestionsAsComments(editor, suggestions);

//         vscode.window.showInformationMessage("Analysis complete!");
//       } catch (err: any) {
//         console.log(err);
//         vscode.window.showErrorMessage("Error: " + err.message);
//       }
//     }
//   );

//   const helloWorldCommand = vscode.commands.registerCommand(
//     "codeHelper.helloWorld",
//     () => {
//       console.log("Hello World from codeHelpper!");
//       console.log("I am saurav");
//       vscode.window.showInformationMessage("Hello World from codeHelper!");
//     }
//   );
