# CodeHelper - AI-Powered Code Generation and Analysis Tool

## About the Project

**CodeHelper** is an inspired version of **Traycer-AI** , A VS Code extension that leverages advanced AI agents to provide context-aware code generation and comprehensive code analysis.It is baded on the principle "Planning before Execution". The extension uses Google's Gemini AI model combined with sophisticated agent orchestration to understand your codebase deeply before making any suggestions or generating code.

### Key Features

- **🧠 Intelligent Context Gathering**: Analyzes your entire project structure before generating code
- **🔄 Agentic Loop Architecture**: Multi-agent system that thinks, observes, plans, and executes
- **🛠️ Tool-Calling System**: Advanced codebase analysis tools for comprehensive understanding
- **📋 Dual Operation Modes**: Planning mode for new features and Code Review mode for analysis
- **🎯 Iterative Thinking**: AI agents iterate through analysis until confident in their understanding

## System Architecture & Flow

### Two Primary Modes

#### 1. **Planning Mode** - Intelligent Code Generation

The planning mode is the core feature that demonstrates true AI intelligence through context-aware code generation. It follows a sophisticated 4-agent workflow with iterative thinking loops:

```
User Prompt → [Intelligent Analysis with Agentic Loop] → Enhanced Observations → Strategic Approach → Detailed Plan → Code Generation
                     ↓
              ┌─────────────────┐
              │  Thinking Loop  │
              │                 │
              │ 1. Analyze      │ ←─┐
              │ 2. Tool Call    │   │
              │ 3. Gather Info  │   │ Iterate until
              │ 4. Assess       │   │ confidence
              │ 5. Decide       │ ──┘ threshold
              └─────────────────┘     (80%)
```

**Detailed Agent Flow & Backend Working:**

**1. Intelligent Analysis Agent** - The Brain of the System
- **Purpose**: Gathers comprehensive project context through iterative analysis
- **Tool Execution**: Uses 5 specialized tools to understand codebase
- **Iterative Process**: Runs up to 80% confidence limit on context gathering
- **Real-time Streaming**: Sends progress updates to UI as it thinks

**2. Enhanced Observation Agent** - The Pattern Recognizer
- **Purpose**: Generates insights based on gathered context
- **Backend Process**:
  - Analyzes existing code patterns
  - Identifies potential conflicts or duplications
  - Recognizes architectural constraints
  - Maps existing implementations
- **Output**: Array of key observations about the codebase

**3. Strategic Approach Agent** - The Architect
- **Purpose**: Defines implementation strategy and methodology
- **Backend Process**:
  - Considers observations and context
  - Defines integration approach
  - Selects appropriate design patterns
  - Plans for scalability and maintainability
- **Output**: Strategic approach document

**4. Planning Agent** - The Project Manager
- **Purpose**: Creates detailed step-by-step implementation plan
- **Backend Process**:
  - Breaks down approach into actionable steps aggregating the results from previously executed agents.
  - Sequences implementation phases
  - Identifies dependencies and prerequisites
  - Creates executable roadmap
- **Output**: Detailed implementation plan with numbered steps

#### 2. **Code Review Mode** - Comprehensive Analysis
The code review mode performs parallel analysis across four dimensions:

```
Current Code → Bug Analysis → Performance Analysis → Security Analysis → Clarity Analysis → Actionable Results
```

**Review Categories:**
- **Bug Detection**: Logic errors, edge cases, type mismatches, exception handling
- **Performance Optimization**: Algorithm efficiency, memory usage, async patterns
- **Security Analysis**: Input validation, vulnerabilities, secure coding practices
- **Code Clarity**: Readability, naming conventions, documentation, maintainability

## Core Concepts

### 1. Agentic Loop Architecture

The extension implements a sophisticated multi-agent system where each agent has a specific responsibility:

```typescript
class AgentOrchestrator {
  private intelligentAnalysisAgent = new IntelligentAnalysisAgent();
  private enhancedObservationAgent = new EnhancedObservationAgent();
  private approachAgent = new ApproachAgent();
  private planningAgent = new PlanningAgent();
}
```

**Agent Responsibilities:**
- **Analysis Agent**: Context gathering, project understanding, iterative thinking
- **Observation Agent**: Pattern recognition, existing code analysis, constraint identification
- **Approach Agent**: Strategic planning, integration methodology, best practices application
- **Planning Agent**: Detailed implementation steps, resource allocation, execution roadmap

### 2. Tool-Calling System

The extension uses a comprehensive tool system for codebase analysis:

```typescript
interface Tool {
  name: string;
  description: string;
  invoke: (params: any) => Promise<string>;
}
```

**Available Tools:**
- **Codebase Search Tool**: Searches entire project for relevant patterns and code
- **File Content Analysis Tool**: Analyzes specific files for structure, dependencies, variables
- **Project Structure Tool**: Provides hierarchical project organization analysis
- **Variable Search Tool**: Locates variables and their usage across the project
- **Dependency Analysis Tool**: Maps imports, exports, and package dependencies



**Thinking Loop Process:**
1. **Initial Analysis**: Basic project structure and prompt understanding
2. **Context Gathering**: Tool execution to gather relevant information
3. **Pattern Recognition**: Identify existing code patterns and structures
4. **Gap Analysis**: Determine what information is still missing
5. **Confidence Assessment**: Evaluates if enough context has been gathered (0-100%)
6. **Iteration Decision**: Continues if confidence < 80% and iterations < 5
7. **Tool Selection**: Chooses appropriate tools for next iteration
8. **Final Analysis**: Comprehensive understanding with high confidence

**Why This Matters:**
- **Prevents Hallucination**: AI knows what already exists before generating code
- **Context Awareness**: Understands project structure and conventions
- **Intelligent Decisions**: Makes informed choices based on comprehensive analysis
- **Quality Assurance**: High confidence threshold ensures thorough understanding

### 4. Streaming Response System

Real-time feedback through streaming agent responses:

```typescript
interface StreamingAgentResponse {
  type: 'thinking' | 'observations' | 'approach' | 'plan';
  content: string;
  isComplete: boolean;
  points?: string[];
}
```

**Benefits:**
- **Real-time Feedback**: Users see progress as agents work
- **Transparency**: Clear visibility into AI decision-making process
- **Interruptibility**: Can stop process if going in wrong direction
- **Educational**: Users learn about AI reasoning process

## Tech Stack

### Backend (VS Code Extension)
- **Runtime**: Node.js 16+
- **Language**: TypeScript (Strict Mode)
- **Framework**: VS Code Extension API
- **AI Model**: Google Gemini 2.0 Flash
- **HTTP Client**: Axios for API calls
- **Environment**: dotenv for configuration
- **Build System**: TypeScript Compiler (tsc)
- **Package Manager**: pnpm
- **Testing**: Mocha + VS Code Test Runner
- **Linting**: ESLint with TypeScript rules

**Key Backend Components:**
```typescript
// Agent System Architecture
AgentOrchestrator {
  IntelligentAnalysisAgent,    // Context gathering & thinking
  EnhancedObservationAgent,    // Pattern recognition
  ApproachAgent,               // Strategic planning
  PlanningAgent,               // Implementation roadmap
  CodeReviewAgent              // Multi-dimensional analysis
}

// Tool System
Tools {
  CodebaseSearchTool,          // Project-wide code search
  FileContentAnalysisTool,     // File structure analysis
  ProjectStructureTool,        // Hierarchical organization
  VariableSearchTool,          // Variable usage mapping
  DependencyAnalysisTool       // Import/export analysis
}
```

### Frontend (Webview UI)
- **Framework**: React 18
- **Language**: TypeScript + TSX
- **Build Tool**: Vite
- **Styling**: CSS Modules
- **State Management**: React Hooks (useState, useEffect)
- **Communication**: VS Code Webview API
- **Package Manager**: npm
- **Development**: Hot Module Replacement (HMR)

**Key Frontend Components:**
```typescript
// React Component Architecture
App.tsx {
  ChatInterface,               // Main chat UI
  PlanningModeTab,            // Agent workflow display
  CodeReviewTab,              // Analysis results
  StreamingDisplay,           // Real-time agent updates
  CodePreview,                // Generated code display
  ActionButtons               // Execute/Apply/Cancel
}
```

**Communication Flow:**
```
React UI ↔ VS Code Webview API ↔ Extension Backend ↔ Gemini API
   ↓              ↓                    ↓              ↓
User Input → Message Passing → Agent System → AI Processing
   ↑              ↑                    ↑              ↑
UI Updates ← Streaming Response ← Tool Execution ← API Response
```

## Installation & Setup

### Prerequisites

- **VS Code**: Version 1.103.0 or higher
- **Node.js**: Version 16 or higher
- **pnpm**: Package manager (recommended)
- **Gemini API Key**: Google AI Studio API key

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd CodeHelp
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root directory:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Build the Extension**
   ```bash
   pnpm run compile
   ```

5. **Build Webview Components**
   ```bash
   pnpm run build:webview
   ```

6. **Launch Extension Development**
   - Press `F5` in VS Code to open Extension Development Host
   - Or use the "Run Extension" configuration in the Debug panel

### Getting Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

## Usage Guide

### Opening CodeHelper

**Method 1: Status Bar**
- Click the "⚡ CodeHelper" button in the status bar

**Method 2: Command Palette**
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "CodeHelper: Chat with AI"
- Press Enter

**Method 3: Activity Bar**
- Click the CodeHelper icon in the activity bar
- Click "Open CodeHelper Chat"

### Using Planning Mode

1. **Open a Code File**: Open the file you want to modify or create
2. **Launch CodeHelper**: Use any of the methods above
3. **Enter Your Request**: Type what you want to implement
   ```
   Examples:
   - "Add user authentication to this React component"
   - "Implement a search functionality"
   - "Create a REST API endpoint for user management"
   - "Add form validation with error handling"
   ```
4. **Watch the Analysis**: Observe real-time agent analysis
   - **Thinking Phase**: Context gathering and project analysis
   - **Observations**: Key insights about existing code
   - **Approach**: Strategic implementation plan
   - **Plan**: Detailed step-by-step execution plan
5. **Execute the Plan**: Click "Execute Plan" to generate code
6. **Review & Apply**: Review generated code and click "Apply Changes"

### Using Code Review Mode

1. **Open Code File**: Open the file you want to analyze
2. **Launch CodeHelper**: Open the chat interface
3. **Start Code Review**: Click the "Code Review" tab
4. **Click "Start Analysis"**: Begin comprehensive review
5. **Review Results**: Examine findings across four categories:
   - **🐛 Bug Analysis**: Potential errors and fixes
   - **⚡ Performance**: Optimization opportunities
   - **🔒 Security**: Vulnerability assessment
   - **📖 Clarity**: Readability improvements
6. **Implement Fixes**: Click "Execute Plan" on any category to generate improved code

### Advanced Features

#### Custom Tool Testing
```bash
# Test all tools
Command Palette → "CodeHelper: Test Codebase Tools" → "Run All Tests"

# Test specific tool
Command Palette → "CodeHelper: Test Codebase Tools" → "Custom Test"
```

#### Integration with GitHub Copilot
- CodeHelper can generate prompts optimized for GitHub Copilot
- Click "Open in Copilot" to transfer context to Copilot Chat

## Project Structure

```
CodeHelp/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── commands/
│   │   └── AnalyzeCode.ts       # Legacy analysis commands
│   ├── utils/
│   │   ├── AgentSystem.ts       # Agent orchestration
│   │   ├── CodeReviewAgents.ts  # Code review functionality
│   │   ├── Tools.ts             # Codebase analysis tools
│   │   └── agents/              # Individual agent implementations
│   │       ├── AnalysisAgent.ts
│   │       ├── ObservationAgent.ts
│   │       ├── ApproachAgent.ts
│   │       └── PlanningAgent.ts
│   ├── Types.ts                 # TypeScript interfaces
│   └── generateWebView.ts       # UI generation
├── webview/                     # React-based UI
│   ├── src/
│   │   ├── App.tsx             # Main UI component
│   │   └── components/         # UI components
│   └── package.json            # Webview dependencies
├── package.json                # Extension manifest
└── README.md                   # Project documentation
```

## Development & Debugging

### Running in Development Mode

1. **Start Webview Development Server**
   ```bash
   pnpm run dev:webview
   ```

2. **Launch Extension**
   - Press `F5` in VS Code
   - Or use Debug panel → "Run Extension"

3. **View Logs**
   - Open Developer Tools in Extension Development Host
   - Check Console for detailed logging

### Making Changes

1. **TypeScript Changes**: Modify files in `src/`
   ```bash
   pnpm run compile
   ```

2. **Webview Changes**: Modify files in `webview/src/`
   ```bash
   pnpm run build:webview
   ```

3. **Reload Extension**: Press `Ctrl+R` (or `Cmd+R`) in Extension Development Host

### Testing

```bash
# Run all tests
pnpm test

# Run specific test
pnpm run test -- --grep "specific test name"

# Lint code
pnpm run lint
```

## Configuration

### Extension Settings

The extension automatically configures itself, but you can customize:

- **API Key**: Set via command "CodeHelper: Set Gemini API Key"
- **Max Thinking Iterations**: Default 5 (configurable in code)
- **Context Threshold**: Default 0.8 (80% confidence)
- **Tool Search Limits**: Performance optimization settings

### Performance Tuning

For large codebases:
- Reduce `maxThinkingIterations` in `AnalysisAgent.ts`
- Adjust search limits in `Tools.ts`
- Enable file type filtering for faster searches

## Troubleshooting

### Common Issues

**1. API Key Not Working**
- Verify key is correct in `.env` file
- Check Google AI Studio for key status
- Ensure key has proper permissions

**2. Extension Not Loading**
- Check VS Code version compatibility (≥1.103.0)
- Verify all dependencies are installed
- Check Developer Console for errors

**3. Slow Performance**
- Reduce analysis depth for large projects
- Check network connectivity to Gemini API
- Monitor rate limits

**4. Code Generation Issues**
- Ensure file is open and has content
- Check that prompt is clear and specific
- Verify project structure is accessible

### Debug Mode

Enable detailed logging:
```typescript
// In any agent file
console.log('Debug mode enabled');
```

## Contributing

### Development Setup

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `pnpm install`
4. Make changes and test thoroughly
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Testing**: Add tests for new features
- **Documentation**: Update relevant docs


---

**Enjoy building with CodeHelper!** 🚀

The extension represents a significant advancement in AI-assisted coding, combining intelligent analysis, comprehensive planning, and context-aware code generation to enhance your development workflow.
