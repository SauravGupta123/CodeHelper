export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  plan?: PlanStep[];
  explanation?: string;
  generatedCode?: string;
  structuredBlocks?: StructuredBlock[];
  isStreaming?: boolean;
  codeReviewResults?: CodeReviewResult[];
}

export interface PlanStep {
  step: number;
  description: string;
}

export interface StructuredBlock {
  id: string;
  type: 'thinking' | 'observations' | 'approach' | 'plan';
  heading: string;
  subheadings?: SubHeading[];
  points?: string[];
  content?: string;
  visible: boolean;
  isStreaming?: boolean;
  streamedContent?: string;
  streamedPoints?: string[];
}

export interface SubHeading {
  title: string;
  points: string[];
}

export interface VSCodeMessage {
  type: string;
  [key: string]: any;
}

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

export interface CodeReviewType {
  type: 'bug' | 'performance' | 'security' | 'clarity';
  label: string;
  color: string;
  description: string;
}

export interface CodeReviewResult {
  type: 'bug' | 'performance' | 'security' | 'clarity';
  hasIssues: boolean;
  issues: string[];
  recommendations: string[];
  steps: string[];
  generatedCode?: string;
}

export interface CodeReviewSection {
  type: 'bug' | 'performance' | 'security' | 'clarity';
  isExpanded: boolean;
  result: CodeReviewResult;
}
