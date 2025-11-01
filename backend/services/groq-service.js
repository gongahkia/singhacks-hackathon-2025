// services/groq-service.js
const { ChatGroq } = require('@langchain/groq');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

class GroqService {
  constructor() {
    this.llm = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && apiKey !== '***masked***') {
      this.llm = new ChatGroq({
        apiKey: apiKey,
        model: 'llama-3.1-8b-instant', // Fast and accurate
        temperature: 0.7,
        maxTokens: 4096,
      });
      console.log('✅ Groq AI client initialized (llama-3.1-8b-instant)');
    } else {
      console.warn('⚠️  GROQ_API_KEY not configured');
    }
  }

  reinitialize() {
    this.initializeClient();
  }

  isConfigured() {
    return this.llm !== null;
  }

  async chat(userInput, systemContext = '') {
    if (!this.isConfigured()) {
      throw new Error('Groq API not configured. Please set GROQ_API_KEY in settings.');
    }

    // Use simple system prompt to avoid template parsing issues
    const systemPrompt = systemContext || `You are an AI assistant for Heracles, a Hedera blockchain-based agent economy platform.

Your role is to help users find agents in a marketplace and facilitate agent-to-agent transactions. When users request to:
- Find an agent: Parse their query, match against agent capabilities, and return matching agents
- Pay an agent: Guide them through selecting currency (HBAR or USDC) and amount
- Use their connected agent: Help them use their connected agent to pay another agent

Always respond with valid JSON only in this format:
{
  "message": "Found X agents matching your query",
  "reasoning": ["Step 1", "Step 2"],
  "breakpoints": [],
  "matchedAgents": [{"name": "Agent Name", "address": "0x...", "capabilities": [...], "trustScore": 85}],
  "action": {"type": "show_agents" | "request_payment", "payload": {"payee": "...", "amount": 10, "currency": "HBAR"}}
}`;

    try {
      // Escape all curly braces in system prompt to prevent ChatPromptTemplate from trying to parse them as variables
      const escapedSystemPrompt = systemPrompt.replace(/\{/g, '{{').replace(/\}/g, '}}');
      
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', escapedSystemPrompt],
        ['human', '{input}'],
      ]);

      const chain = prompt.pipe(this.llm);
      const response = await chain.invoke({ input: userInput });

      // Parse response
      const text = response.content || response.text || String(response);
      
      // Try to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Ensure required fields exist for frontend compatibility
          if (!parsed.message) parsed.message = "I found some agents for you.";
          if (!parsed.reasoning) parsed.reasoning = [];
          if (!parsed.breakpoints) parsed.breakpoints = [];
          if (!parsed.matchedAgents) parsed.matchedAgents = [];
          if (!parsed.action) parsed.action = { type: "show_agents", payload: {} };
          
          return { success: true, data: parsed };
        } catch (parseError) {
          console.warn('JSON parse failed, creating structured fallback');
        }
      }

      // Fallback: format raw text as structured response (prevents blank responses)
      return { 
        success: true, 
        data: {
          message: text || "I'm here to help you find agents on the Hedera marketplace. How can I assist you?",
          reasoning: [],
          breakpoints: [],
          matchedAgents: [],
          action: { type: "show_agents", payload: {} }
        }
      };
    } catch (error) {
      console.error('Groq API error:', error);
      // Even on error, return structured response
      return {
        success: false,
        data: {
          message: "I encountered an error, but I'm here to help. Could you rephrase your request?",
          reasoning: [],
          breakpoints: [],
          matchedAgents: [],
          action: { type: "show_agents", payload: {} }
        },
        error: error.message
      };
    }
  }

  // AI-powered agent search
  async searchAgents(query, availableAgents) {
    // Don't escape here - chat() method will handle escaping when creating the prompt
    const agentsJson = JSON.stringify(availableAgents, null, 2);
    
    const jsonFormatExample = `{
  "matchedAgents": [
    {
      "name": "Agent Name",
      "address": "0x...",
      "trustScore": 85,
      "capabilities": ["cap1", "cap2"],
      "relevanceScore": 0.95,
      "reasoning": "Why this agent matches"
    }
  ]
}`;
    
    const systemContext = `You are an AI assistant that helps users find agents in a marketplace.

Given this user query: "${query}"

And these available agents:
${agentsJson}

Analyze the query and return the top 5 matching agents ranked by relevance. Consider:
- Capability match (exact matches rank higher)
- Trust score (higher is better)
- Metadata keywords
- Price if mentioned in query

Return ONLY valid JSON in this format:
${jsonFormatExample}`;

    const result = await this.chat(query, systemContext);
    
    // Ensure the result has matchedAgents array
    if (result.data) {
      if (!result.data.matchedAgents && result.data.matchedAgents === undefined) {
        // Try to extract from the response
        if (result.data.message && typeof result.data.message === 'string') {
          // Try to parse agents from message if available
          result.data.matchedAgents = [];
        } else {
          result.data.matchedAgents = [];
        }
      }
      return result.data;
    }
    
    // Fallback format
    return {
      message: result.raw || `Found agents matching your query.`,
      matchedAgents: [],
      reasoning: [],
      breakpoints: [],
      action: { type: "show_agents", payload: {} }
    };
  }
}

module.exports = new GroqService();

