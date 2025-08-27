import axios from "axios";

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
