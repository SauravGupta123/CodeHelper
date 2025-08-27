import axios from "axios";
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
                  text: `You are an expert software engineer. Create a detailed implementation plan. Dont give the full code itself. Make sure to give plan that works for changes in the single file only for which the user has asked:

File: ${fileName}
User Request: ${prompt}
Current Code:
${code}

Intelligent Analysis Result:
${thinkingResult}

Approach: ${approach}

Task: Create a detailed, step-by-step implementation plan.You have to only give the implemenation plan and not to mention about questions to be aksed by user in the implementaion step. Structure it as:

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