import axios from 'axios';

interface AgentResponse {
  thinking: string;
  observations: string[];
  approach: string;
  detailedPlan: string;
}

interface StreamingAgentResponse {
  type: 'thinking' | 'observations' | 'approach' | 'plan';
  content: string;
  isComplete: boolean;
  points?: string[];
}

export class AnalysisAgent {
  async analyzeCode(code: string, prompt: string, fileName: string, apiKey: string): Promise<string> {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert code analyst. Analyze the following code and user request:

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

Task: Provide ONLY a thinking process that shows your analysis approach. Think step by step about:
- What the user wants to achieve
- What the current code does
- What needs to change
- Potential challenges

Respond with ONLY the thinking process in clear, logical steps. No code, no implementation details.`

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
  }
}

export class ObservationAgent {
  async generateObservations(code: string, prompt: string, fileName: string, apiKey: string): Promise<string[]> {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert code reviewer. Based on the analysis, provide key observations:

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

Task: Generate 3-5 key observations about the current state and what needs to be improved. Focus on:
- Code structure and organization
- Missing functionality
- Potential improvements
- Areas of concern

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
  }
}

export class ApproachAgent {
  async defineApproach(code: string, prompt: string, fileName: string, observations: string[], apiKey: string): Promise<string> {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert software architect. Based on the analysis and observations, define the approach:

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

Key Observations:
${observations.map((obs, i) => `${i + 1}. ${obs}`).join('\n')}

Task: Define a high-level approach that addresses the observations and achieves the user's goal. Include:
- Overall strategy
- Key principles
- Design considerations
- Success criteria

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
  }
}

export class PlanningAgent {
  async createDetailedPlan(code: string, prompt: string, fileName: string, approach: string, apiKey: string): Promise<string> {
    console.log("planning agent triggered");
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an expert software engineer. Create a detailed implementation plan:

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

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

Ensure each step is actionable, specific, and builds upon previous steps.`

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
    console.log("planning agent response received, content length:", detailedPlan.length);
    console.log("planning agent response preview:", detailedPlan.substring(0, 200) + "...");
    
    return detailedPlan;
  }
}

export class AgentOrchestrator {
  private analysisAgent = new AnalysisAgent();
  private observationAgent = new ObservationAgent();
  private approachAgent = new ApproachAgent();
  private planningAgent = new PlanningAgent();

  async executeAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string
  ): Promise<AgentResponse> {
    // Step 1: Analysis
    const thinking = await this.analysisAgent.analyzeCode(code, prompt, fileName, apiKey);
    
    // Step 2: Observations
    const observations = await this.observationAgent.generateObservations(code, prompt, fileName, apiKey);
    
    // Step 3: Approach
    const approach = await this.approachAgent.defineApproach(code, prompt, fileName, observations, apiKey);
    
    // Step 4: Detailed Plan
    const detailedPlan = await this.planningAgent.createDetailedPlan(code, prompt, fileName, approach, apiKey);

    return {
      thinking,
      observations,
      approach,
      detailedPlan
    };
  }

  async executeStreamingAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string,
    onStreamingResponse: (response: StreamingAgentResponse) => void
  ): Promise<void> {
    console.log('Starting streaming agentic loop');
    
    try {
      // Step 1: Analysis
      console.log('Starting analysis agent');
      const thinking = await this.analysisAgent.analyzeCode(code, prompt, fileName, apiKey);
      onStreamingResponse({
        type: 'thinking',
        content: thinking,
        isComplete: true
      });
      console.log('Analysis complete');

      // Step 2: Observations (can run in parallel with thinking)
      console.log('Starting observations agent');
      const observations = await this.observationAgent.generateObservations(code, prompt, fileName, apiKey);
      onStreamingResponse({
        type: 'observations',
        content: '',
        isComplete: true,
        points: observations
      });
      console.log('Observations complete');

      // Step 3: Approach (depends on observations)
      console.log('Starting approach agent');
      const approach = await this.approachAgent.defineApproach(code, prompt, fileName, observations, apiKey);
      onStreamingResponse({
        type: 'approach',
        content: approach,
        isComplete: true
      });
      console.log('Approach complete');

      // Step 4: Detailed Plan (depends on approach)
      console.log('Starting planning agent');
      const detailedPlan = await this.planningAgent.createDetailedPlan(code, prompt, fileName, approach, apiKey);
      onStreamingResponse({
        type: 'plan',
        content: detailedPlan,
        isComplete: true
      });
      console.log('Planning complete');

      console.log('Streaming agentic loop completed successfully');
    } catch (error) {
      console.error('Error in streaming agentic loop:', error);
      throw error;
    }
  }
}
