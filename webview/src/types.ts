export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  plan?: PlanStep[];
  explanation?: string;
  generatedCode?: string;
}

export interface PlanStep {
  step: number;
  description: string;
}

export interface VSCodeMessage {
  type: string;
  [key: string]: any;
}
