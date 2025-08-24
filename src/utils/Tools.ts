import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// Schema for codebase search tool
const codebaseSearchSchema = z.object({
  query: z.string().describe("The search query to find relevant files and code"),
  context: z.string().optional().describe("Additional context about what to search for")
});

// Schema for file content analysis tool
const fileContentSchema = z.object({
  filePath: z.string().describe("The path to the file to analyze"),
  analysisType: z.enum(["structure", "content", "dependencies", "variables"]).describe("Type of analysis to perform")
});

// Schema for project structure analysis tool
const projectStructureSchema = z.object({
  analysisDepth: z.enum(["shallow", "medium", "deep"]).describe("How deep to analyze the project structure")
});

// Schema for variable search tool
const variableSearchSchema = z.object({
  variableName: z.string().describe("The name of the variable to search for"),
  searchScope: z.enum(["current_file", "project_wide", "specific_directory"]).describe("Where to search for the variable")
});

// Schema for dependency analysis tool
const dependencyAnalysisSchema = z.object({
  filePath: z.string().describe("The file to analyze for dependencies"),
  includeDevDependencies: z.boolean().optional().describe("Whether to include development dependencies")
});

// Tool: Search codebase for relevant files and code
export const codebaseSearchTool = tool(
  async (input: any) => {
    try {
      const { query, context } = input as z.infer<typeof codebaseSearchSchema>;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folders found. Please open a project in VS Code.";
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const results: string[] = [];
      
      // Search through common file types
      const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt'];
      
      for (const ext of fileExtensions) {
        const files = await vscode.workspace.findFiles(`**/*${ext}`, '**/node_modules/**');
        
        for (const file of files.slice(0, 50)) { // Limit to first 50 files for performance
          try {
            const content = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(content).toString('utf8');
            
            // Simple keyword matching (can be enhanced with more sophisticated search)
            if (text.toLowerCase().includes(query.toLowerCase())) {
              const relativePath = path.relative(workspaceRoot, file.fsPath);
              results.push(`Found in ${relativePath}`);
              
              // Extract relevant context around the match
              const lines = text.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                  const start = Math.max(0, i - 2);
                  const end = Math.min(lines.length, i + 3);
                  const contextLines = lines.slice(start, end);
                  results.push(`  Lines ${start + 1}-${end}: ${contextLines.join(' | ')}`);
                  break;
                }
              }
            }
          } catch (error) {
            // Skip files that can't be read
            continue;
          }
        }
      }
      
      if (results.length === 0) {
        return `No files found containing "${query}". Try a different search term or check if the project structure is correct.`;
      }
      
      return `Search results for "${query}":\n${results.slice(0, 20).join('\n')}`;
    } catch (error) {
      return `Error searching codebase: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: "codebase_search",
    description: "Search the entire codebase for relevant files, code, or patterns. Use this to understand what already exists in the project before making changes.",
    schema: codebaseSearchSchema,
  }
);

// Tool: Analyze file content and structure
export const fileContentAnalysisTool = tool(
  async (input: any) => {
    try {
      const { filePath, analysisType } = input as z.infer<typeof fileContentSchema>;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folders found.";
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
      
      if (!fs.existsSync(fullPath)) {
        return `File not found: ${filePath}`;
      }

      const content = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
      const text = Buffer.from(content).toString('utf8');
      const lines = text.split('\n');

      switch (analysisType) {
        case "structure":
          const structure = {
            totalLines: lines.length,
            emptyLines: lines.filter(line => line.trim() === '').length,
            commentLines: lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*')).length,
            importLines: lines.filter(line => line.trim().startsWith('import') || line.trim().startsWith('export')).length,
            functionLines: lines.filter(line => line.includes('function') || line.includes('=>') || line.includes('class')).length
          };
          return `File structure analysis for ${filePath}:\n${JSON.stringify(structure, null, 2)}`;
          
        case "content":
          const preview = lines.slice(0, 20).join('\n');
          return `Content preview for ${filePath} (first 20 lines):\n${preview}`;
          
        case "dependencies":
          const imports = lines.filter(line => line.trim().startsWith('import') || line.trim().startsWith('export'));
          return `Dependencies and exports in ${filePath}:\n${imports.join('\n')}`;
          
        case "variables":
          const variablePattern = /(?:const|let|var)\s+(\w+)\s*=/g;
          const variables: string[] = [];
          let match;
          while ((match = variablePattern.exec(text)) !== null) {
            variables.push(match[1]);
          }
          return `Variables found in ${filePath}:\n${variables.join(', ')}`;
          
        default:
          return `Unknown analysis type: ${analysisType}`;
      }
    } catch (error) {
      return `Error analyzing file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: "file_content_analysis",
    description: "Analyze the content, structure, dependencies, or variables of a specific file. Use this to understand what a file contains before making changes.",
    schema: fileContentSchema,
  }
);

// Tool: Analyze project structure
export const projectStructureTool = tool(
  async (input: any) => {
    try {
      const { analysisDepth } = input as z.infer<typeof projectStructureSchema>;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folders found.";
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const structure: any = {};
      
      const scanDirectory = (dir: string, depth: number, maxDepth: number) => {
        if (depth > maxDepth) return;
        
        try {
          const items = fs.readdirSync(dir);
          const result: any = {};
          
          for (const item of items) {
            if (item.startsWith('.') || item === 'node_modules') continue;
            
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              if (depth < maxDepth) {
                result[item] = scanDirectory(fullPath, depth + 1, maxDepth);
              } else {
                result[item] = `[Directory - ${fs.readdirSync(fullPath).length} items]`;
              }
            } else {
              const ext = path.extname(item);
              if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md'].includes(ext)) {
                result[item] = `[${ext} file]`;
              }
            }
          }
          
          return result;
        } catch (error) {
          return `[Error reading directory: ${error}]`;
        }
      };
      
      const maxDepth = analysisDepth === 'shallow' ? 2 : analysisDepth === 'medium' ? 3 : 4;
      const projectStructure = scanDirectory(workspaceRoot, 0, maxDepth);
      
      return `Project structure analysis (${analysisDepth} depth):\n${JSON.stringify(projectStructure, null, 2)}`;
    } catch (error) {
      return `Error analyzing project structure: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: "project_structure_analysis",
    description: "Analyze the overall project structure to understand the codebase organization, file types, and directory layout.",
    schema: projectStructureSchema,
  }
);

// Tool: Search for specific variables across the project
export const variableSearchTool = tool(
  async (input: any) => {
    try {
      const { variableName, searchScope } = input as z.infer<typeof variableSearchSchema>;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folders found.";
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const results: string[] = [];
      
      let searchPattern = '**/*';
      if (searchScope === 'specific_directory') {
        searchPattern = 'src/**/*';
      }
      
      const files = await vscode.workspace.findFiles(searchPattern, '**/node_modules/**');
      
      for (const file of files.slice(0, 100)) { // Limit for performance
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const text = Buffer.from(content).toString('utf8');
          
          // Search for variable declarations and usage
          const patterns = [
            new RegExp(`(?:const|let|var)\\s+${variableName}\\b`, 'g'),
            new RegExp(`\\b${variableName}\\b`, 'g'),
            new RegExp(`"${variableName}"`, 'g'),
            new RegExp(`'${variableName}'`, 'g')
          ];
          
          let found = false;
          for (const pattern of patterns) {
            if (pattern.test(text)) {
              found = true;
              break;
            }
          }
          
          if (found) {
            const relativePath = path.relative(workspaceRoot, file.fsPath);
            const lines = text.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(variableName)) {
                const start = Math.max(0, i - 1);
                const end = Math.min(lines.length, i + 2);
                const contextLines = lines.slice(start, end);
                results.push(`Found in ${relativePath}:${i + 1}\n  ${contextLines.join('\n  ')}`);
                break;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (results.length === 0) {
        return `Variable "${variableName}" not found in the specified scope.`;
      }
      
      return `Variable "${variableName}" found in:\n${results.slice(0, 15).join('\n\n')}`;
    } catch (error) {
      return `Error searching for variable: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: "variable_search",
    description: "Search for specific variables, constants, or identifiers across the project to understand where they are defined and used.",
    schema: variableSearchSchema,
  }
);

// Tool: Analyze dependencies of a file
export const dependencyAnalysisTool = tool(
  async (input: any) => {
    try {
      const { filePath, includeDevDependencies = false } = input as z.infer<typeof dependencyAnalysisSchema>;
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return "No workspace folders found.";
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
      
      if (!fs.existsSync(fullPath)) {
        return `File not found: ${filePath}`;
      }

      const content = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
      const text = Buffer.from(content).toString('utf8');
      const lines = text.split('\n');
      
      const dependencies: string[] = [];
      const exports: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Extract imports
        const importMatch = trimmed.match(/^import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/);
        if (importMatch) {
          dependencies.push(importMatch[1]);
        }
        
        // Extract exports
        const exportMatch = trimmed.match(/^export\s+(?:.*?\s+)?(\w+)/);
        if (exportMatch) {
          exports.push(exportMatch[1]);
        }
      }
      
      // Check package.json for project dependencies
      let projectDependencies: any = {};
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
          const packageData = JSON.parse(packageContent);
          projectDependencies = {
            dependencies: packageData.dependencies || {},
            devDependencies: includeDevDependencies ? (packageData.devDependencies || {}) : {}
          };
        } catch (error) {
          // Ignore package.json parsing errors
        }
      }
      
      const result = {
        file: filePath,
        dependencies: [...new Set(dependencies)],
        exports: [...new Set(exports)],
        projectDependencies: projectDependencies
      };
      
      return `Dependency analysis for ${filePath}:\n${JSON.stringify(result, null, 2)}`;
    } catch (error) {
      return `Error analyzing dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
  {
    name: "dependency_analysis",
    description: "Analyze the dependencies, imports, and exports of a specific file, as well as project-level dependencies from package.json.",
    schema: dependencyAnalysisSchema,
  }
);

// Export all tools for use in the agent system
export const allTools = [
  codebaseSearchTool,
  fileContentAnalysisTool,
  projectStructureTool,
  variableSearchTool,
  dependencyAnalysisTool
];