
interface Suggestion {
  oldCode: string;
  newCode: string;
  lineNumber: number;
  explanation: string;
}

interface PlanStep {
  step: number;
  description: string;
  status: 'pending' | 'completed' | 'executing';
}

interface AIResponse {
  plan: PlanStep[];
  newCode: string;
  explanation: string;
}

interface AgentResponse {
  thinking: string;
  observations: string[];
  approach: string;
  detailedPlan: string;
}

export function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\w+:|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

export function cleanCodeBlock(code: string): string {
  return code.replace(/```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
}

export function parseSuggestions(rawResponse: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const suggestionRegex = /SUGGESTION_START([\s\S]*?)SUGGESTION_END/g;
  const matches = rawResponse.matchAll(suggestionRegex);

  for (const match of matches) {
    const suggestionText = match[1];
    const suggestion: Suggestion = {
      oldCode: cleanCodeBlock(extractSection(suggestionText, "OLD_CODE")),
      newCode: cleanCodeBlock(extractSection(suggestionText, "NEW_CODE")),
      lineNumber: parseInt(extractSection(suggestionText, "LINE_NUMBER")),
      explanation: extractSection(suggestionText, "EXPLANATION"),
    };
    suggestions.push(suggestion);
  }

  return suggestions;
}

export function parseAIResponse(rawResponse: string): AIResponse {
  const planMatch = rawResponse.match(/PLAN_START([\s\S]*?)PLAN_END/);
  const explanationMatch = rawResponse.match(/EXPLANATION_START([\s\S]*?)EXPLANATION_END/);
  const codeMatch = rawResponse.match(/NEW_CODE_START([\s\S]*?)NEW_CODE_END/);

  let plan: PlanStep[] = [];
  if (planMatch) {
    const planText = planMatch[1].trim();
    const steps = planText.split('\n').filter(line => line.trim());
    plan = steps.map((step, index) => ({
      step: index + 1,
      description: step.replace(/^\d+\.\s*/, '').trim(),
      status: 'pending' as const
    }));
  }

  return {
    plan,
    newCode: codeMatch ? codeMatch[1].trim() : '',
    explanation: explanationMatch ? explanationMatch[1].trim() : 'No explanation provided.'
  };
}

export function parseAgentResponse(rawResponse: string): AgentResponse {
  // Parse the agent response into structured sections
  const thinkingMatch = rawResponse.match(/THINKING_START([\s\S]*?)THINKING_END/);
  const observationsMatch = rawResponse.match(/OBSERVATIONS_START([\s\S]*?)OBSERVATIONS_END/);
  const approachMatch = rawResponse.match(/APPROACH_START([\s\S]*?)APPROACH_END/);
  const planMatch = rawResponse.match(/PLAN_START([\s\S]*?)PLAN_END/);

  let thinking = '';
  let observations: string[] = [];
  let approach = '';
  let detailedPlan = '';

  if (thinkingMatch) {
    thinking = thinkingMatch[1].trim();
  }

  if (observationsMatch) {
    const obsText = observationsMatch[1].trim();
    observations = obsText.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }

  if (approachMatch) {
    approach = approachMatch[1].trim();
  }

  if (planMatch) {
    detailedPlan = planMatch[1].trim();
  }

  return {
    thinking,
    observations,
    approach,
    detailedPlan
  };
}

export function createStructuredBlocks(agentResponse: AgentResponse) {
  const blocks = [];

  // Thinking Process Block
  if (agentResponse.thinking) {
    blocks.push({
      id: 'thinking',
      type: 'thinking' as const,
      heading: 'Thinking Process',
      content: agentResponse.thinking,
      visible: false
    });
  }

  // Observations Block
  if (agentResponse.observations && agentResponse.observations.length > 0) {
    blocks.push({
      id: 'observations',
      type: 'observations' as const,
      heading: 'Key Observations',
      points: agentResponse.observations,
      visible: false
    });
  }

  // Approach Block
  if (agentResponse.approach) {
    blocks.push({
      id: 'approach',
      type: 'approach' as const,
      heading: 'Strategic Approach',
      content: agentResponse.approach,
      visible: false
    });
  }

  // Detailed Plan Block
  if (agentResponse.detailedPlan) {
    blocks.push({
      id: 'plan',
      type: 'plan' as const,
      heading: 'Implementation Plan',
      content: agentResponse.detailedPlan,
      visible: false
    });
  }

  return blocks;
}