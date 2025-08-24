import * as vscode from "vscode";
import { allTools, Tool } from "./Tools";

export class ToolTester {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("CodeHelper Tool Tester");
  }

  async runTests(): Promise<void> {
    this.outputChannel.clear();
    this.outputChannel.show(true);
    this.log("🚀 Starting Tool Tests...\n");

    // Test each tool
    await this.testCodebaseSearch();
    await this.testFileContentAnalysis();
    await this.testProjectStructure();
    await this.testVariableSearch();
    await this.testDependencyAnalysis();

    this.log("\n✅ All tool tests completed!");
  }

  private async testCodebaseSearch(): Promise<void> {
    this.log("📝 Testing Codebase Search Tool...");
    const tool = allTools.find(t => t.name === "codebase_search");
    if (!tool) {
      this.log("❌ Codebase search tool not found!");
      return;
    }

    try {
      // Test with common search terms
      const testQueries = ["import", "function", "export", "const"];
      
      for (const query of testQueries) {
        this.log(`  🔍 Searching for: "${query}"`);
        const result = await tool.invoke({ query });
        this.log(`  📋 Result: ${this.truncateResult(result)}\n`);
      }
    } catch (error) {
      this.log(`❌ Error testing codebase search: ${error}\n`);
    }
  }

  private async testFileContentAnalysis(): Promise<void> {
    this.log("📁 Testing File Content Analysis Tool...");
    const tool = allTools.find(t => t.name === "file_content_analysis");
    if (!tool) {
      this.log("❌ File content analysis tool not found!");
      return;
    }

    try {
      // Get the current active file or use extension.ts as default
      const activeEditor = vscode.window.activeTextEditor;
      const filePath = activeEditor?.document.fileName || "src/extension.ts";
      
      const analysisTypes = ["structure", "content", "dependencies", "variables"];
      
      for (const analysisType of analysisTypes) {
        this.log(`  🔬 Analyzing ${analysisType} of: ${filePath}`);
        const result = await tool.invoke({ 
          filePath, 
          analysisType: analysisType as "structure" | "content" | "dependencies" | "variables"
        });
        this.log(`  📊 Result: ${this.truncateResult(result)}\n`);
      }
    } catch (error) {
      this.log(`❌ Error testing file content analysis: ${error}\n`);
    }
  }

  private async testProjectStructure(): Promise<void> {
    this.log("🏗️ Testing Project Structure Tool...");
    const tool = allTools.find(t => t.name === "project_structure_analysis");
    if (!tool) {
      this.log("❌ Project structure tool not found!");
      return;
    }

    try {
      const depths = ["shallow", "medium", "deep"];
      
      for (const depth of depths) {
        this.log(`  📐 Analyzing project structure with ${depth} depth`);
        const result = await tool.invoke({ 
          analysisDepth: depth as "shallow" | "medium" | "deep"
        });
        this.log(`  🌳 Result: ${this.truncateResult(result)}\n`);
      }
    } catch (error) {
      this.log(`❌ Error testing project structure: ${error}\n`);
    }
  }

  private async testVariableSearch(): Promise<void> {
    this.log("🔍 Testing Variable Search Tool...");
    const tool = allTools.find(t => t.name === "variable_search");
    if (!tool) {
      this.log("❌ Variable search tool not found!");
      return;
    }

    try {
      // Test with common variable names
      const testVariables = ["activate", "context", "apiKey", "editor"];
      const scopes = ["current_file", "project_wide", "specific_directory"];
      
      for (const variableName of testVariables) {
        for (const searchScope of scopes) {
          this.log(`  🎯 Searching for variable "${variableName}" in ${searchScope}`);
          const result = await tool.invoke({ 
            variableName, 
            searchScope: searchScope as "current_file" | "project_wide" | "specific_directory"
          });
          this.log(`  📍 Result: ${this.truncateResult(result)}\n`);
        }
      }
    } catch (error) {
      this.log(`❌ Error testing variable search: ${error}\n`);
    }
  }

  private async testDependencyAnalysis(): Promise<void> {
    this.log("📦 Testing Dependency Analysis Tool...");
    const tool = allTools.find(t => t.name === "dependency_analysis");
    if (!tool) {
      this.log("❌ Dependency analysis tool not found!");
      return;
    }

    try {
      // Test with common files
      const testFiles = ["src/extension.ts", "package.json"];
      
      for (const filePath of testFiles) {
        this.log(`  📋 Analyzing dependencies of: ${filePath}`);
        
        // Test with and without dev dependencies
        const result1 = await tool.invoke({ 
          filePath, 
          includeDevDependencies: false 
        });
        this.log(`  📊 Result (production only): ${this.truncateResult(result1)}`);
        
        const result2 = await tool.invoke({ 
          filePath, 
          includeDevDependencies: true 
        });
        this.log(`  📊 Result (with dev deps): ${this.truncateResult(result2)}\n`);
      }
    } catch (error) {
      this.log(`❌ Error testing dependency analysis: ${error}\n`);
    }
  }

  private log(message: string): void {
    this.outputChannel.appendLine(message);
    console.log(message);
  }

  private truncateResult(result: string, maxLength: number = 200): string {
    if (result.length <= maxLength) {
      return result;
    }
    return result.substring(0, maxLength) + "... [truncated]";
  }

  public async promptUserForCustomTest(): Promise<void> {
    const toolNames = allTools.map(t => t.name);
    const selectedTool = await vscode.window.showQuickPick(toolNames, {
      placeHolder: "Select a tool to test"
    });

    if (!selectedTool) {
      return;
    }

    const tool = allTools.find(t => t.name === selectedTool);
    if (!tool) {
      vscode.window.showErrorMessage("Tool not found!");
      return;
    }

    this.outputChannel.clear();
    this.outputChannel.show(true);
    this.log(`🎯 Testing ${selectedTool} with custom parameters...\n`);

    try {
      await this.runCustomTest(tool);
    } catch (error) {
      this.log(`❌ Error in custom test: ${error}`);
      vscode.window.showErrorMessage(`Error testing ${selectedTool}: ${error}`);
    }
  }

  private async runCustomTest(tool: Tool): Promise<void> {
    switch (tool.name) {
      case "codebase_search":
        const query = await vscode.window.showInputBox({
          prompt: "Enter search query",
          placeHolder: "e.g., 'function', 'import', 'class'"
        });
        if (query) {
          const result = await tool.invoke({ query });
          this.log(`🔍 Search result for "${query}":\n${result}`);
        }
        break;

      case "file_content_analysis":
        const filePath = await vscode.window.showInputBox({
          prompt: "Enter file path",
          placeHolder: "e.g., 'src/extension.ts'"
        });
        const analysisType = await vscode.window.showQuickPick(
          ["structure", "content", "dependencies", "variables"],
          { placeHolder: "Select analysis type" }
        );
        if (filePath && analysisType) {
          const result = await tool.invoke({ 
            filePath, 
            analysisType: analysisType as "structure" | "content" | "dependencies" | "variables"
          });
          this.log(`📁 Analysis result for ${filePath} (${analysisType}):\n${result}`);
        }
        break;

      case "project_structure_analysis":
        const depth = await vscode.window.showQuickPick(
          ["shallow", "medium", "deep"],
          { placeHolder: "Select analysis depth" }
        );
        if (depth) {
          const result = await tool.invoke({ 
            analysisDepth: depth as "shallow" | "medium" | "deep"
          });
          this.log(`🏗️ Project structure (${depth}):\n${result}`);
        }
        break;

      case "variable_search":
        const variableName = await vscode.window.showInputBox({
          prompt: "Enter variable name",
          placeHolder: "e.g., 'activate', 'context'"
        });
        const searchScope = await vscode.window.showQuickPick(
          ["current_file", "project_wide", "specific_directory"],
          { placeHolder: "Select search scope" }
        );
        if (variableName && searchScope) {
          const result = await tool.invoke({ 
            variableName, 
            searchScope: searchScope as "current_file" | "project_wide" | "specific_directory"
          });
          this.log(`🎯 Variable search result for "${variableName}" in ${searchScope}:\n${result}`);
        }
        break;

      case "dependency_analysis":
        const depFilePath = await vscode.window.showInputBox({
          prompt: "Enter file path",
          placeHolder: "e.g., 'src/extension.ts', 'package.json'"
        });
        const includeDevDeps = await vscode.window.showQuickPick(
          ["Yes", "No"],
          { placeHolder: "Include dev dependencies?" }
        );
        if (depFilePath && includeDevDeps) {
          const result = await tool.invoke({ 
            filePath: depFilePath, 
            includeDevDependencies: includeDevDeps === "Yes"
          });
          this.log(`📦 Dependency analysis for ${depFilePath}:\n${result}`);
        }
        break;

      default:
        this.log(`❓ Custom test not implemented for ${tool.name}`);
    }
  }
}