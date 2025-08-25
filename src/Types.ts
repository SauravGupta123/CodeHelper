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