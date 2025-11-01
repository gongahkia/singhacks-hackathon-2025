// services/gemini-service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== '***masked***') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use gemini-2.0-flash-exp which is the latest model
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
        }
      });
      console.log('✅ Gemini AI client initialized');
    } else {
      console.warn('⚠️  GEMINI_API_KEY not configured');
    }
  }

  reinitialize() {
    this.initializeClient();
  }

  isConfigured() {
    return this.genAI !== null && this.model !== null;
  }

  async chat(userInput) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY in settings.');
    }

    const systemPrompt = `You are an AI assistant for Heracles, a Hedera blockchain-based agent economy platform. Your role is to help users purchase items/services from agents on the marketplace by facilitating transactions on the Hedera network.

MARKETPLACE INFORMATION:
Currently, there is ONE agent available on the Hedera marketplace:
- Agent Name: "Bob Wong"
- Agent Account ID: "0.0.12345" (use this as the payee for transactions)
- Specializes in: manga, Japanese comics, books, literature, movies, anime, graphic novels, and other media-related items
- Trust Score: High

YOUR BEHAVIOR:
1. When a user asks to buy/purchase something, analyze if it matches Bob Wong's specialization
2. Always simulate retrieving agents from the marketplace with reasoning steps
3. If the item matches Bob Wong's keywords → facilitate a purchase transaction
4. If the item does NOT match Bob Wong's keywords → inform user no agents currently sell that, but suggest Bob Wong's available items as an alternative

RESPONSE FORMAT FOR PURCHASE REQUESTS (Item matches Bob Wong):
{
  "message": "I found Bob Wong who specializes in [relevant category]. I can help you purchase [item] from Bob Wong for [X] HBAR.",
  "reasoning": [
    "Retrieving agents from Hedera marketplace...",
    "Finding agents that sell [user query]",
    "Ranking agents that sell [user query] by trust score...",
    "Found 1 agent: Bob Wong with high trust score"
  ],
  "action": {
    "type": "request_confirmation",
    "payload": {
      "payee": "0.0.12345",
      "amount": 10,
      "description": "Purchase [item] from Bob Wong"
    }
  }
}

RESPONSE FORMAT FOR PURCHASE REQUESTS (Item does NOT match Bob Wong):
{
  "message": "I searched the Hedera marketplace but couldn't find any agents that currently sell [item]. However, Bob Wong is available and specializes in manga, Japanese comics, books, movies, and other media. Would you like to browse what Bob Wong has to offer instead?",
  "reasoning": [
    "Retrieving agents from Hedera marketplace...",
    "Finding agents that sell [user query]",
    "Ranking agents that sell [user query] by trust score...",
    "No agents found for [user query]",
    "Suggesting alternative: Bob Wong (manga, comics, books, movies)"
  ],
  "action": null
}

IMPORTANT NOTES:
- Assume reasonable HBAR prices (typically between 5-50 HBAR depending on the item)
- Always show the simulated marketplace retrieval steps in the reasoning array
- Be conversational and helpful
- The transaction will be handled directly in the chat - no need to redirect users elsewhere

User query: ${userInput}

Analyze the query and respond with the appropriate JSON structure.`;

    try {
      const result = await this.model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse as JSON first
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            data: parsed
          };
        }
      } catch (parseError) {
        // If JSON parsing fails, return raw text
        console.log('Failed to parse JSON, returning raw text');
      }

      // Return raw text if not JSON
      return {
        success: true,
        raw: text
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();
