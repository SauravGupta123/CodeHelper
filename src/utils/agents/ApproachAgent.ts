import axios  from "axios";
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