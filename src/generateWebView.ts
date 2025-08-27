import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Returns the HTML string for the webview by loading the Vite build (React + Tailwind)
 */
export function getWebviewContent(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): string {
  try {
    // Path to "dist/index.html" after running `npm run build`
    const distPath = vscode.Uri.joinPath(extensionUri, "webview", "dist");
    const indexPath = vscode.Uri.joinPath(distPath, "index.html");

    // Check if the built file exists
    if (!fs.existsSync(indexPath.fsPath)) {
      console.error(`Build file not found at: ${indexPath.fsPath}`);
      return getErrorHTML("Build file not found. Run 'npm run build' in the webview directory first.");
    }

    let html = fs.readFileSync(indexPath.fsPath, "utf8");
    console.log("Original HTML length:", html.length);

    // Get the webview URI for the dist folder
    const distUri = panel.webview.asWebviewUri(distPath);
    
    // Replace asset paths - handle both relative and absolute paths
    html = html.replace(/src="\.\/assets\//g, `src="${distUri}/assets/`);
    html = html.replace(/href="\.\/assets\//g, `href="${distUri}/assets/`);
    html = html.replace(/src="\/assets\//g, `src="${distUri}/assets/`);
    html = html.replace(/href="\/assets\//g, `href="${distUri}/assets/`);

    // More comprehensive CSP(Content Security Policy) for React + Vite
    const csp = `
      default-src 'none';
      img-src ${panel.webview.cspSource} https: data: blob:;
      style-src ${panel.webview.cspSource} 'unsafe-inline' 'unsafe-eval';
      script-src ${panel.webview.cspSource} 'unsafe-inline' 'unsafe-eval';
      font-src ${panel.webview.cspSource} https: data:;
      connect-src ${panel.webview.cspSource} https: wss:;
    `;

    // Inject CSP and ensure proper meta tags
    if (html.includes('<head>')) {
      html = html.replace(
        /<head>/,
        `<head>
          <meta http-equiv="Content-Security-Policy" content="${csp.replace(/\s+/g, ' ').trim()}">
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        `
      );
    } else {
      // If no head tag, add it
      html = `<!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="${csp.replace(/\s+/g, ' ').trim()}">
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>${html}</body>
      </html>`;
    }

    console.log("Final HTML length:", html.length);
    return html;

  } catch (error) {
    console.error("Error loading webview content:", error);
    return getErrorHTML(`Error loading webview: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getErrorHTML(message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background-color: #1e1e1e;
          color: #cccccc;
          margin: 0;
        }
        .error-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ff6b6b;
          border-radius: 8px;
          background-color: #2d1b1b;
        }
        .error-title {
          color: #ff6b6b;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .error-message {
          font-family: monospace;
          white-space: pre-wrap;
          background-color: #1a1a1a;
          padding: 10px;
          border-radius: 4px;
        }
        .suggestions {
          margin-top: 20px;
        }
        .suggestions ul {
          padding-left: 20px;
        }
        .suggestions li {
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <div class="error-title">WebView Loading Error</div>
        <div class="error-message">${message}</div>
        <div class="suggestions">
          <p><strong>Troubleshooting steps:</strong></p>
          <ul>
            <li>Make sure you've built the React app: <code>cd webview && npm run build</code></li>
            <li>Check that the <code>webview/dist/</code> folder exists</li>
            <li>Verify the file structure matches the expected paths</li>
            <li>Check the VS Code Developer Console for more details</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
}