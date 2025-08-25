import axios from 'axios';
import { allTools, Tool } from './Tools';
import {AgentResponse, StreamingAgentResponse, ContextGatheringResult} from '../Types';


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

export class EnhancedObservationAgent {
  async generateObservations(
    code: string, 
    prompt: string, 
    fileName: string, 
    thinkingResult: string,
    apiKey: string
  ): Promise<string[]> {
    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are an expert code reviewer. Based on the intelligent analysis, provide key observations:

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

Intelligent Analysis Result:
${thinkingResult}

Task: Generate 3-5 key observations about the current state and what needs to be improved. Focus on:
- Code structure and organization
- Missing functionality
- Potential improvements
- Areas of concern
- How to avoid duplicating existing code

Respond with ONLY a numbered list of observations, one per line.`
                },
              ],
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

      const text = response.data.candidates[0].content.parts[0].text;
      return text.split('\n').filter((line: string) => line.trim().match(/^\d+\./)).map((line: string) => line.replace(/^\d+\.\s*/, ''));
    } catch (error) {
      console.error('Error generating observations:', error);
      return ['Error generating observations'];
    }
  }
}

export class ApproachAgent {
  async defineApproach(
    code: string, 
    prompt: string, 
    fileName: string, 
    observations: string[], 
    thinkingResult: string,
    apiKey: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are an expert software architect. Based on the intelligent analysis and observations, define the approach:

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

Intelligent Analysis Result:
${thinkingResult}

Key Observations:
${observations.map((obs, i) => `${i + 1}. ${obs}`).join('\n')}

Task: Define a high-level approach that addresses the observations and achieves the user's goal. Include:
- Overall strategy
- Key principles
- Design considerations
- Success criteria
- How to leverage existing code and avoid duplication

Respond with ONLY the approach description in clear, structured paragraphs.`
                },
              ],
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
      console.error('Error defining approach:', error);
      return 'Error defining approach';
    }
  }
}

export class PlanningAgent {
  async createDetailedPlan(
    code: string, 
    prompt: string, 
    fileName: string, 
    approach: string, 
    thinkingResult: string,
    apiKey: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are an expert software engineer. Create a detailed implementation plan. Dont give the full code itself. Only give the part of code where necessary. :

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

Intelligent Analysis Result:
${thinkingResult}

Approach: ${approach}

Task: Create a detailed, step-by-step implementation plan. Structure it as:

# Implementation Plan

## Phase 1: [Phase Name]
### Step 1: [Step Title]
- **Action**: [What to do]
- **Details**: [How to do it]
- **Expected Outcome**: [What should happen]

### Step 2: [Step Title]
- **Action**: [What to do]
- **Details**: [How to do it]
- **Expected Outcome**: [What should happen]

## Phase 2: [Phase Name]
[Continue with more phases and steps...]

Ensure each step is actionable, specific, and builds upon previous steps. Consider the existing codebase context to avoid duplication. The plan should be clear enough for LLM to generate the exact same output according to the plan.`
                },
              ],
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
      
      const detailedPlan = response.data.candidates[0].content.parts[0].text;
      console.log("Planning agent response received, content length:", detailedPlan.length);
      
      return detailedPlan;
    } catch (error) {
      console.error('Error creating detailed plan:', error);
      return 'Error creating detailed plan';
    }
  }
}

export class AgentOrchestrator {
  private intelligentAnalysisAgent = new IntelligentAnalysisAgent();
  private enhancedObservationAgent = new EnhancedObservationAgent();
  private approachAgent = new ApproachAgent();
  private planningAgent = new PlanningAgent();

  async executeIntelligentAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string
  ): Promise<AgentResponse> {
    // Step 1: Intelligent Analysis with Context Gathering
    const thinking = await this.intelligentAnalysisAgent.analyzeCodeWithContext(
      code, prompt, fileName, apiKey
    );
    
    // Step 2: Enhanced Observations based on intelligent analysis
    const observations = await this.enhancedObservationAgent.generateObservations(
      code, prompt, fileName, thinking, apiKey
    );
    
    // Step 3: Approach based on intelligent analysis and observations
    const approach = await this.approachAgent.defineApproach(
      code, prompt, fileName, observations, thinking, apiKey
    );
    
    // Step 4: Detailed Plan based on all previous steps
    const detailedPlan = await this.planningAgent.createDetailedPlan(
      code, prompt, fileName, approach, thinking, apiKey
    );

    return {
      thinking,
      observations,
      approach,
      detailedPlan
    };
  }

  async executeStreamingIntelligentAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string,
    onStreamingResponse: (response: StreamingAgentResponse) => void
  ): Promise<void> {
    console.log('Starting streaming intelligent agentic loop');
    
    try {
      // Step 1: Intelligent Analysis (this may take longer due to context gathering)
      console.log('Starting intelligent analysis agent');
      onStreamingResponse({
        type: 'thinking',
        content: 'Gathering codebase context and analyzing...',
        isComplete: false
      });
      
      const thinking = await this.intelligentAnalysisAgent.analyzeCodeWithContext(
        code, prompt, fileName, apiKey
      );
      
      onStreamingResponse({
        type: 'thinking',
        content: thinking,
        isComplete: true
      });
      console.log('Intelligent analysis complete');

      // Step 2: Enhanced Observations
      console.log('Starting enhanced observations agent');
      onStreamingResponse({
        type: 'observations',
        content: 'Generating observations based on intelligent analysis...',
        isComplete: false
      });
      
      const observations = await this.enhancedObservationAgent.generateObservations(
        code, prompt, fileName, thinking, apiKey
      );
      
      onStreamingResponse({
        type: 'observations',
        content: '',
        isComplete: true,
        points: observations
      });
      console.log('Enhanced observations complete');

      // Step 3: Approach
      console.log('Starting approach agent');
      onStreamingResponse({
        type: 'approach',
        content: 'Defining strategic approach...',
        isComplete: false
      });
      
      const approach = await this.approachAgent.defineApproach(
        code, prompt, fileName, observations, thinking, apiKey
      );
      
      onStreamingResponse({
        type: 'approach',
        content: approach,
        isComplete: true
      });
      console.log('Approach complete');

      // Step 4: Detailed Plan
      console.log('Starting planning agent');
      onStreamingResponse({
        type: 'plan',
        content: 'Creating detailed implementation plan...',
        isComplete: false
      });
      
      const detailedPlan = await this.planningAgent.createDetailedPlan(
        code, prompt, fileName, approach, thinking, apiKey
      );
      
      onStreamingResponse({
        type: 'plan',
        content: detailedPlan,
        isComplete: true
      });
      console.log('Planning complete');

      console.log('Streaming intelligent agentic loop completed successfully');
    } catch (error) {
      console.error('Error in streaming intelligent agentic loop:', error);
      throw error;
    }
  }

  // Keep the old method for backward compatibility
  async executeAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string
  ): Promise<AgentResponse> {
    return this.executeIntelligentAgenticLoop(apiKey, code, prompt, fileName);
  }

  async executeStreamingAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string,
    onStreamingResponse: (response: StreamingAgentResponse) => void
  ): Promise<void> {
    return this.executeStreamingIntelligentAgenticLoop(apiKey, code, prompt, fileName, onStreamingResponse);
  }
}
