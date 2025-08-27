import { StreamingAgentResponse} from '../Types';
import { IntelligentAnalysisAgent } from './agents/AnalysisAgent';
import { EnhancedObservationAgent } from './agents/ObservationAgent';
import { ApproachAgent } from './agents/ApproachAgent';
import { PlanningAgent } from './agents/PlanningAgent';






export class AgentOrchestrator {
  private intelligentAnalysisAgent = new IntelligentAnalysisAgent();
  private enhancedObservationAgent = new EnhancedObservationAgent();
  private approachAgent = new ApproachAgent();
  private planningAgent = new PlanningAgent();



  async executeStreamingIntelligentAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string,
    onStreamingResponse: (response: StreamingAgentResponse) => void
  ): Promise<void> {
    console.log('Starting streaming intelligent agentic loop');
    
    try {
      // Step 1: Intelligent Analysis with streaming iterations
      console.log('Starting intelligent analysis agent');
      onStreamingResponse({
        type: 'thinking',
        content: 'Starting intelligent analysis with context gathering...',
        isComplete: false
      });
      
      const thinking = await this.intelligentAnalysisAgent.analyzeCodeWithContextStreaming(
        code, prompt, fileName, apiKey, onStreamingResponse
      );
      
      // Note: The final thinking response is already sent by the streaming method
      console.log('Intelligent analysis complete');

      // Step 2: Enhanced Observations
      console.log('Starting enhanced observations agent');
      onStreamingResponse({
        type: 'observations',
        content: 'Generating observations based on intelligent analysis...',
        isComplete: false
      });
      
      const observations = await this.enhancedObservationAgent.generateObservations(
        code, prompt, fileName, thinking, apiKey
      );
      
      onStreamingResponse({
        type: 'observations',
        content: '',
        isComplete: true,
        points: observations
      });
      console.log('Enhanced observations complete');

      // Step 3: Approach
      console.log('Starting approach agent');
      onStreamingResponse({
        type: 'approach',
        content: 'Defining strategic approach...',
        isComplete: false
      });
      
      const approach = await this.approachAgent.defineApproach(
        code, prompt, fileName, observations, thinking, apiKey
      );
      
      onStreamingResponse({
        type: 'approach',
        content: approach,
        isComplete: true
      });
      console.log('Approach complete');

      // Step 4: Detailed Plan
      console.log('Starting planning agent');
      onStreamingResponse({
        type: 'plan',
        content: 'Creating detailed implementation plan...',
        isComplete: false
      });
      
      const detailedPlan = await this.planningAgent.createDetailedPlan(
        code, prompt, fileName, approach, thinking, apiKey
      );
      
      onStreamingResponse({
        type: 'plan',
        content: detailedPlan,
        isComplete: true
      });
      console.log('Planning complete');

      console.log('Streaming intelligent agentic loop completed successfully');
    } catch (error) {
      console.error('Error in streaming intelligent agentic loop:', error);
      throw error;
    }
  }



  async executeStreamingAgenticLoop(
    apiKey: string,
    code: string, 
    prompt: string, 
    fileName: string,
    onStreamingResponse: (response: StreamingAgentResponse) => void
  ): Promise<void> {
    return this.executeStreamingIntelligentAgenticLoop(apiKey, code, prompt, fileName, onStreamingResponse);
  }
}
