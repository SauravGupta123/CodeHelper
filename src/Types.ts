export interface AgentResponse {
    thinking: string;
    observations: string[];
    approach: string;
    detailedPlan: string;
  }
  
  export interface StreamingAgentResponse {
    type: 'thinking' | 'observations' | 'approach' | 'plan';
    content: string;
    isComplete: boolean;
    points?: string[];
  }
  
  
  
  export interface ContextGatheringResult {
    projectStructure: string;
    relevantFiles: string[];
    existingVariables: string[];
    dependencies: string;
    analysis: string;
  }
  
  export interface CodeReviewResult {
    type: 'bug' | 'performance' | 'security' | 'clarity';
    hasIssues: boolean;
    issues: string[];
    recommendations: string[];
    steps: string[];
  }



//tool interfaces

  // Schema validation using simple type checking
  export  interface CodebaseSearchParams {
    query: string;
    context?: string;
  }
  
  export interface FileContentParams {
    filePath: string;
    analysisType: "structure" | "content" | "dependencies" | "variables";
  }
  
  export interface ProjectStructureParams {
    analysisDepth: "shallow" | "medium" | "deep";
  }
  
  export interface VariableSearchParams {
    variableName: string;
    searchScope: "current_file" | "project_wide" | "specific_directory";
  }
  
  export interface DependencyAnalysisParams {
    filePath: string;
    includeDevDependencies?: boolean;
  }