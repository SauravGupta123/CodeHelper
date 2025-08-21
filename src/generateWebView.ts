export function getWebviewContent(): string {
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
            white-space: pre;
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
                
                case 'showGeneratedCode':
                    showGeneratedCode(message);
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
            
            // Hide code section until generation completes
            document.getElementById('codeSection').style.display = 'none';
        }

        function showGeneratedCode(data) {
            document.getElementById('codeSection').style.display = 'block';
            document.getElementById('originalCode').textContent = data.originalCode || '';
            document.getElementById('newCode').textContent = data.newCode || '';
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