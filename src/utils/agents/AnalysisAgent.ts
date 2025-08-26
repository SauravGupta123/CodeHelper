import axios from "axios";
import { allTools, Tool } from '../Tools';
import {ContextGatheringResult} from '../../Types';
export class IntelligentAnalysisAgent {
  private tools: Tool[] = allTools;
  private maxThinkingIterations = 5;
  private contextThreshold = 0.8; // Confidence threshold for context gathering

  async analyzeCodeWithContext(
    code: string, 
    prompt: string, 
    fileName: string, 
    apiKey: string
  ): Promise<string> {
    try {
      console.log('Starting intelligent analysis with context gathering...');
      
      // Step 1: Initial project structure analysis
      const projectStructure = await this.analyzeProjectStructure();
      
      // Step 2: Search for relevant existing code
      const relevantFiles = await this.searchRelevantCode(prompt);
      
      // Step 3: Search for existing variables/constants
      const existingVariables = await this.searchExistingVariables(prompt);
      
      // Step 4: Analyze dependencies
      const dependencies = await this.analyzeDependencies(fileName);
      
      // Step 5: Run thinking loop with gathered context
      const thinkingResult = await this.runThinkingLoop(
        code, prompt, fileName, apiKey, {
          projectStructure,
          relevantFiles,
          existingVariables,
          dependencies,
          analysis: ''
        }
      );
      
      return thinkingResult;
    } catch (error) {
      console.error('Error in intelligent analysis:', error);
      return `Error during intelligent analysis: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async analyzeProjectStructure(): Promise<string> {
    try {
      // Use the project structure tool
      const result = await this.tools[2].invoke({ analysisDepth: 'medium' });
      return result;
    } catch (error) {
      return 'Unable to analyze project structure';
    }
  }

  private async searchRelevantCode(prompt: string): Promise<string[]> {
    try {
      // Extract key terms from prompt for search
      const searchTerms = this.extractSearchTerms(prompt);
      const results: string[] = [];
      
      for (const term of searchTerms) {
        try {
          const result = await this.tools[0].invoke({ query: term });
          results.push(result);
        } catch (error) {
          console.warn(`Search failed for term: ${term}`, error);
        }
      }
      
      return results;
    } catch (error) {
      return ['Unable to search relevant code'];
    }
  }

  private async searchExistingVariables(prompt: string): Promise<string[]> {
    try {
      // Look for common variable patterns in the prompt
      const variablePatterns = this.extractVariablePatterns(prompt);
      const results: string[] = [];
      
      for (const pattern of variablePatterns) {
        try {
          const result = await this.tools[3].invoke({ 
            variableName: pattern, 
            searchScope: 'project_wide' 
          });
          results.push(result);
        } catch (error) {
          console.warn(`Variable search failed for: ${pattern}`, error);
        }
      }
      
      return results;
    } catch (error) {
      return ['Unable to search existing variables'];
    }
  }

  private async analyzeDependencies(fileName: string): Promise<string> {
    try {
      const result = await this.tools[4].invoke({ 
        filePath: fileName, 
        includeDevDependencies: false 
      });
      return result;
    } catch (error) {
      return 'Unable to analyze dependencies';
    }
  }

  private extractSearchTerms(prompt: string): string[] {
    // Extract meaningful search terms from the prompt
    const words = prompt.toLowerCase().split(/\s+/);
    const stopWords = ['add', 'create', 'implement', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5); // Limit to 5 most relevant terms
  }

  private extractVariablePatterns(prompt: string): string[] {
    // Look for potential variable names in the prompt
    const matches = prompt.match(/\b[a-zA-Z][a-zA-Z0-9]*\b/g) || [];
    return matches
      .filter(word => word.length > 3)
      .slice(0, 3); // Limit to 3 most likely variables
  }

  private async runThinkingLoop(
    code: string,
    prompt: string,
    fileName: string,
    apiKey: string,
    context: ContextGatheringResult
  ): Promise<string> {
    let currentContext = context;
    let thinkingIteration = 0;
    let confidence = 0;
    let thinkingProcess = '';

    while (thinkingIteration < this.maxThinkingIterations && confidence < this.contextThreshold) {
      console.log(`Thinking iteration ${thinkingIteration + 1}/${this.maxThinkingIterations}`);
      
      // Generate thinking prompt with current context
      const thinkingPrompt = this.generateThinkingPrompt(
        code, prompt, fileName, currentContext, thinkingIteration
      );
      
      // Get AI response for this iteration
      const aiResponse = await this.getAIThinkingResponse(thinkingPrompt, apiKey);
      
      // Analyze if we need more context
      const contextAnalysis = await this.analyzeContextGaps(aiResponse, currentContext);
      
      // Update thinking process
      thinkingProcess += `\n\n--- Iteration ${thinkingIteration + 1} ---\n${aiResponse}`;
      
      if (contextAnalysis.needsMoreContext) {
        // Gather additional context based on gaps
        const additionalContext = await this.gatherAdditionalContext(contextAnalysis.gaps);
        currentContext = this.mergeContext(currentContext, additionalContext);
        confidence = contextAnalysis.confidence;
      } else {
        confidence = 1.0; // We have sufficient context
      }
      
      thinkingIteration++;
      
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final thinking summary
    const finalThinking = await this.generateFinalThinkingSummary(
      thinkingProcess, currentContext, prompt, fileName
    );

    return finalThinking;
  }

  private generateThinkingPrompt(
    code: string,
    prompt: string,
    fileName: string,
    context: ContextGatheringResult,
    iteration: number
  ): string {
    return `You are an expert code analyst performing iteration ${iteration + 1} of context gathering.

Current Context:
- Project Structure: ${context.projectStructure.substring(0, 500)}...
- Relevant Files Found: ${context.relevantFiles.length} files
- Existing Variables: ${context.existingVariables.length} patterns found
- Dependencies: ${context.dependencies.substring(0, 300)}...

User Request: ${prompt}
File: ${fileName}
Current Code:
${code}

Task: Analyze the current context and determine:
1. What additional information would be most valuable to gather?
2. Are there any obvious gaps in our understanding?
3. What specific questions should we ask about the codebase?

Think step by step and provide clear reasoning for what context we still need.`;
  }

  private async getAIThinkingResponse(prompt: string, apiKey: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
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

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      return `Error getting AI response: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async analyzeContextGaps(
    aiResponse: string,
    currentContext: ContextGatheringResult
  ): Promise<{ needsMoreContext: boolean; gaps: string[]; confidence: number }> {
    // Simple heuristic-based analysis
    const gaps: string[] = [];
    let confidence = 0.5; // Base confidence

    // Check if we have sufficient project structure info
    if (currentContext.projectStructure.length < 200) {
      gaps.push('project_structure');
      confidence -= 0.2;
    }

    // Check if we found relevant files
    if (currentContext.relevantFiles.length === 0) {
      gaps.push('relevant_files');
      confidence -= 0.3;
    }

    // Check if we have dependency information
    if (currentContext.dependencies.length < 100) {
      gaps.push('dependencies');
      confidence -= 0.2;
    }

    // Check if AI response indicates need for more context
    const needsMoreContext = aiResponse.toLowerCase().includes('need more') ||
                            aiResponse.toLowerCase().includes('gather') ||
                            aiResponse.toLowerCase().includes('additional') ||
                            confidence < this.contextThreshold;

    return {
      needsMoreContext,
      gaps,
      confidence: Math.max(0, confidence)
    };
  }

  private async gatherAdditionalContext(gaps: string[]): Promise<Partial<ContextGatheringResult>> {
    const additionalContext: Partial<ContextGatheringResult> = {};

    for (const gap of gaps) {
      try {
        switch (gap) {
          case 'project_structure':
            additionalContext.projectStructure = await this.tools[2].invoke({ analysisDepth: 'deep' });
            break;
          case 'relevant_files':
            // Try broader search
            additionalContext.relevantFiles = await this.searchRelevantCode('code implementation');
            break;
          case 'dependencies':
            // Analyze more files
            additionalContext.dependencies = 'Additional dependency analysis performed';
            break;
        }
      } catch (error) {
        console.warn(`Failed to gather context for gap: ${gap}`, error);
      }
    }

    return additionalContext;
  }

  private mergeContext(
    current: ContextGatheringResult,
    additional: Partial<ContextGatheringResult>
  ): ContextGatheringResult {
    return {
      projectStructure: additional.projectStructure || current.projectStructure,
      relevantFiles: [...current.relevantFiles, ...(additional.relevantFiles || [])],
      existingVariables: [...current.existingVariables, ...(additional.existingVariables || [])],
      dependencies: additional.dependencies || current.dependencies,
      analysis: current.analysis
    };
  }

  private async generateFinalThinkingSummary(
    thinkingProcess: string,
    finalContext: ContextGatheringResult,
    prompt: string,
    fileName: string
  ): Promise<string> {
    return `# Intelligent Analysis Complete

## Context Gathered
- **Project Structure**: Analyzed project organization and file types
- **Relevant Files**: Found ${finalContext.relevantFiles.length} relevant files in codebase
- **Existing Variables**: Identified ${finalContext.existingVariables.length} variable patterns
- **Dependencies**: Analyzed file and project dependencies

## Thinking Process
${thinkingProcess}

## Final Assessment
Based on comprehensive context gathering, I now have a complete understanding of:
1. The project structure and organization
2. Existing code patterns and implementations
3. Variable naming conventions and usage
4. Dependencies and imports

This context will inform the subsequent observation, approach, and planning phases to ensure accurate and non-redundant implementation.`;
  }
}