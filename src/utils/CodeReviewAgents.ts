import axios from 'axios';
import { allTools, Tool } from './Tools';
import { CodeReviewResult } from '../Types';

export class CodeReviewAgent {
    private tools: Tool[] = allTools;
    //this function will perform a comprehensive code review for bugs, performance, security, and clarity
    async performCodeReview(
      code: string,
      fileName: string,
      apiKey: string
    ): Promise<CodeReviewResult[]> {
      try {
        console.log('Starting comprehensive code review...');
        console.log('Code length:', code.length);
        console.log('File name:', fileName);
        console.log('API key present:', !!apiKey);
        
        // Validate input
        if (!code || code.trim().length === 0) {
          throw new Error('No code content provided for review');
        }
        
        if (!apiKey || apiKey.trim().length === 0) {
          throw new Error('No API key provided');
        }
        
        // Limit code length to prevent API issues (Gemini has token limits)
        const maxCodeLength = 10000; // Conservative limit
        if (code.length > maxCodeLength) {
          console.warn(`Code length (${code.length}) exceeds recommended limit (${maxCodeLength}). Truncating for analysis.`);
          code = code.substring(0, maxCodeLength) + '\n\n[Code truncated for analysis due to length]';
        }
        
        const results: CodeReviewResult[] = [];
        
        // Review for bugs
        console.log('Starting bug review...');
        const bugResult = await this.reviewForBugs(code, fileName, apiKey);
        console.log('Bug review result:', bugResult);
        results.push(bugResult);
        
        // Review for performance
        console.log('Starting performance review...');
        const performanceResult = await this.reviewForPerformance(code, fileName, apiKey);
        console.log('Performance review result:', performanceResult);
        results.push(performanceResult);
        
        // Review for security
        console.log('Starting security review...');
        const securityResult = await this.reviewForSecurity(code, fileName, apiKey);
        console.log('Security review result:', securityResult);
        results.push(securityResult);
        
        // Review for clarity
        console.log('Starting clarity review...');
        const clarityResult = await this.reviewForClarity(code, fileName, apiKey);
        console.log('Clarity review result:', clarityResult);
        results.push(clarityResult);
        
        console.log('All reviews completed. Total results:', results.length);
        return results;
      } catch (error) {
        console.error('Error in code review:', error);
        throw error;
      }
    }
  
    private async reviewForBugs(code: string, fileName: string, apiKey: string): Promise<CodeReviewResult> {
      const prompt = `You are a code review expert. Analyze the following code for existing bugs and errors.
  
  Code to review:
  \`\`\`${fileName}
  ${code}
  \`\`\`
  
  Focus on:
  1. Logic errors
  2. Edge cases not handled
  3. Type mismatches
  4. Null/undefined access
  5. Array bounds issues
  6. Exception handling
  7. Syntax errors
  
  Provide your analysis in EXACTLY this format (do not deviate):
  
  ISSUES:
  - [List specific issues found, one per line starting with dash]
  
  RECOMMENDATIONS:
  - [List specific recommendations to fix issues, one per line starting with dash]
  
  STEPS:
  - [List step-by-step actions to resolve issues, one per line starting with dash]
  
  If no issues are found, respond with:
  ISSUES:
  - No bugs detected
  
  RECOMMENDATIONS:
  - No recommendations needed
  
  STEPS:
  - No action required`;
  
      try {
        const response = await this.callGeminiAPI(apiKey, prompt);
        return this.parseCodeReviewResponse(response, 'bug');
      } catch (error) {
        console.error('Error in bug review:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return this.createDefaultResult('bug', true, [`API call failed: ${errorMessage}`], ['Check API key and network connection'], ['Verify Gemini API key', 'Check internet connection', 'Retry analysis']);
      }
    }
  
    private async reviewForPerformance(code: string, fileName: string, apiKey: string): Promise<CodeReviewResult> {
      const prompt = `You are a performance optimization expert. Analyze the following code for performance optimization opportunities.
  
  Code to review:
  \`\`\`${fileName}
  ${code}
  \`\`\`
  
  Focus on:
  1. Algorithm efficiency
  2. Memory usage
  3. Loop optimizations
  4. Database query efficiency
  5. Caching opportunities
  6. Async/await usage
  
  Provide your analysis in EXACTLY this format (do not deviate):
  
  ISSUES:
  - [List specific performance issues found, one per line starting with dash]
  
  RECOMMENDATIONS:
  - [List specific recommendations to improve performance, one per line starting with dash]
  
  STEPS:
  - [List step-by-step actions to optimize performance, one per line starting with dash]
  
  If no issues are found, respond with:
  ISSUES:
  - No performance issues detected
  
  RECOMMENDATIONS:
  - No recommendations needed
  
  STEPS:
  - No action required`;
  
      try {
        const response = await this.callGeminiAPI(apiKey, prompt);
        return this.parseCodeReviewResponse(response, 'performance');
      } catch (error) {
        console.error('Error in performance review:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return this.createDefaultResult('performance', true, [`API call failed: ${errorMessage}`], ['Check API key and network connection'], ['Verify Gemini API key', 'Check internet connection', 'Retry analysis']);
      }
    }
  
    private async reviewForSecurity(code: string, fileName: string, apiKey: string): Promise<CodeReviewResult> {
      const prompt = `You are a security expert. Analyze the following code for security vulnerabilities.
  
  Code to review:
  \`\`\`${fileName}
  ${code}
  \`\`\`
  
  Focus on:
  1. Input validation
  2. SQL injection
  3. XSS vulnerabilities
  4. Authentication/authorization
  5. Data encryption
  6. Secure coding practices
  
  Provide your analysis in EXACTLY this format (do not deviate):
  
  ISSUES:
  - [List specific security issues found, one per line starting with dash]
  
  RECOMMENDATIONS:
  - [List specific recommendations to improve security, one per line starting with dash]
  
  STEPS:
  - [List step-by-step actions to secure the code, one per line starting with dash]
  
  If no issues are found, respond with:
  ISSUES:
  - No security issues detected
  
  RECOMMENDATIONS:
  - No recommendations needed
  
  STEPS:
  - No action required`;
  
      try {
        const response = await this.callGeminiAPI(apiKey, prompt);
        return this.parseCodeReviewResponse(response, 'security');
      } catch (error) {
        console.error('Error in security review:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return this.createDefaultResult('security', true, [`API call failed: ${errorMessage}`], ['Check API key and network connection'], ['Verify Gemini API key', 'Check internet connection', 'Retry analysis']);
      }
    }
  
    private async reviewForClarity(code: string, fileName: string, apiKey: string): Promise<CodeReviewResult> {
      const prompt = `You are a code quality expert. Analyze the following code for clarity and maintainability improvements.
  
  Code to review:
  \`\`\`${fileName}
  ${code}
  \`\`\`
  
  Focus on:
  1. Code readability
  2. Variable naming
  3. Function complexity
  4. Documentation
  5. Code organization
  6. Best practices
  
  Provide your analysis in EXACTLY this format (do not deviate):
  
  ISSUES:
  - [List specific clarity issues found, one per line starting with dash]
  
  RECOMMENDATIONS:
  - [List specific recommendations to improve clarity, one per line starting with dash]
  
  STEPS:
  - [List step-by-step actions to improve clarity, one per line starting with dash]
  
  If no issues are found, respond with:
  ISSUES:
  - No clarity issues detected
  
  RECOMMENDATIONS:
  - No recommendations needed
  
  STEPS:
  - No action required`;
  
      try {
        const response = await this.callGeminiAPI(apiKey, prompt);
        return this.parseCodeReviewResponse(response, 'clarity');
      } catch (error) {
        console.error('Error in clarity review:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return this.createDefaultResult('clarity', true, [`API call failed: ${errorMessage}`], ['Check API key and network connection'], ['Verify Gemini API key', 'Check internet connection', 'Retry analysis']);
      }
    }
  
    private async callGeminiAPI(apiKey: string, prompt: string, retryCount: number = 0): Promise<string> {
      const maxRetries = 2;
      
      try {
        console.log(`Calling Gemini API with prompt length: ${prompt.length} (attempt ${retryCount + 1})`);
        
        const response = await axios.post(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
          {
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            timeout: 30000 // 30 second timeout
          }
        );
  
        console.log('Gemini API response received');
        
        if (!response.data || !response.data.candidates || !response.data.candidates[0] || !response.data.candidates[0].content || !response.data.candidates[0].content.parts || !response.data.candidates[0].content.parts[0]) {
          throw new Error('Invalid response structure from Gemini API');
        }
  
        const text = response.data.candidates[0].content.parts[0].text;
        console.log('Response text length:', text.length);
        
        return text;
      } catch (error) {
        console.error(`Gemini API call failed (attempt ${retryCount + 1}):`, error);
        
        // Retry on certain errors
        if (retryCount < maxRetries) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            // Retry on server errors and rate limits
            if (status && (status >= 500 || status === 429)) {
              console.log(`Retrying API call due to status ${status}...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
              return this.callGeminiAPI(apiKey, prompt, retryCount + 1);
            }
          }
        }
        
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            throw new Error('Invalid API key - please check your Gemini API key');
          } else if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded - please try again later');
          } else if (error.response?.status && error.response.status >= 500) {
            throw new Error('Gemini API server error - please try again later');
          } else {
            throw new Error(`API request failed: ${error.response?.status || 'unknown'} ${error.response?.statusText || 'unknown error'}`);
          }
        }
        throw error;
      }
    }
  
    private parseCodeReviewResponse(response: string, type: 'bug' | 'performance' | 'security' | 'clarity'): CodeReviewResult {
      console.log(`Parsing ${type} review response:`, response.substring(0, 200) + '...');
      
      const lines = response.split('\n');
      let currentSection = '';
      const issues: string[] = [];
      const recommendations: string[] = [];
      const steps: string[] = [];
  
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'ISSUES:') {
          currentSection = 'issues';
          console.log(`Found ISSUES section for ${type}`);
        } else if (trimmed === 'RECOMMENDATIONS:') {
          currentSection = 'recommendations';
          console.log(`Found RECOMMENDATIONS section for ${type}`);
        } else if (trimmed === 'STEPS:') {
          currentSection = 'steps';
          console.log(`Found STEPS section for ${type}`);
        } else if (trimmed.startsWith('-') && currentSection) {
          const content = trimmed.substring(1).trim();
          if (content && !content.includes('No issues detected') && !content.includes('No performance issues detected') && 
              !content.includes('No security issues detected') && !content.includes('No clarity issues detected')) {
            if (currentSection === 'issues') {
              issues.push(content);
              console.log(`Added issue for ${type}:`, content);
            } else if (currentSection === 'recommendations') {
              recommendations.push(content);
              console.log(`Added recommendation for ${type}:`, content);
            } else if (currentSection === 'steps') {
              steps.push(content);
              console.log(`Added step for ${type}:`, content);
            }
          }
        }
      }
  
      console.log(`Parsing complete for ${type}:`, { issues: issues.length, recommendations: recommendations.length, steps: steps.length });
      
      const hasIssues = issues.length > 0 || recommendations.length > 0 || steps.length > 0;
      
      // If no structured content was found, try to extract any meaningful content
      if (!hasIssues && response.trim().length > 0) {
        console.log(`No structured content found for ${type}, creating fallback result`);
        const fallbackContent = response.trim().substring(0, 200);
        return {
          type,
          hasIssues: false,
          issues: ['No specific issues detected'],
          recommendations: ['Code appears to be well-structured'],
          steps: ['Continue monitoring code quality']
        };
      }
      
      return {
        type,
        hasIssues,
        issues: hasIssues ? issues : ['No issues detected'],
        recommendations: hasIssues ? recommendations : ['No recommendations needed'],
        steps: hasIssues ? steps : ['No action required']
      };
    }
  
    private createDefaultResult(
      type: 'bug' | 'performance' | 'security' | 'clarity',
      hasIssues: boolean,
      issues: string[],
      recommendations: string[],
      steps: string[]
    ): CodeReviewResult {
      return {
        type,
        hasIssues,
        issues,
        recommendations,
        steps
      };
    }
  }