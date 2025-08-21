
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