// services/hedera-agent-kit-service.js
const { ChatGroq } = require('@langchain/groq');

class HederaAgentKitService {
  constructor() {
    this.agentKit = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Try to import Hedera Agent Kit (may not be available)
      let HederaAgentKit, ServerSigner, coreQueriesPlugin;
      try {
        const hederaAgentKitModule = require('hedera-agent-kit');
        HederaAgentKit = hederaAgentKitModule.HederaAgentKit || hederaAgentKitModule.default;
        ServerSigner = hederaAgentKitModule.ServerSigner;
        coreQueriesPlugin = hederaAgentKitModule.coreQueriesPlugin;
      } catch (importError) {
        console.warn('⚠️  Hedera Agent Kit not available:', importError.message);
        console.warn('⚠️  Agent Kit features will be disabled');
        return;
      }

      // Validate required environment variables
      if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
        console.warn('⚠️  HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY not configured');
        return;
      }

      if (!process.env.GROQ_API_KEY) {
        console.warn('⚠️  GROQ_API_KEY not configured for Agent Kit');
        return;
      }

      // Create signer
      const signer = new ServerSigner(
        process.env.HEDERA_ACCOUNT_ID,
        process.env.HEDERA_PRIVATE_KEY,
        'testnet'
      );

      // Initialize Groq LLM for agent kit
      const llm = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama3-70b-8192',
        temperature: 0.5,
      });

      // Create agent kit with core plugins
      this.agentKit = new HederaAgentKit(signer, {
        llm: llm,
        plugins: coreQueriesPlugin ? [coreQueriesPlugin] : [],
        appConfig: {
          network: 'testnet',
          operatorId: process.env.HEDERA_ACCOUNT_ID,
        }
      });

      await this.agentKit.initialize();
      
      console.log('✅ Hedera Agent Kit initialized with Groq');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Hedera Agent Kit:', error.message);
      console.warn('⚠️  Agent Kit features will be disabled');
      // Don't throw - allow app to run without Agent Kit
    }
  }

  // Get all Langchain tools from agent kit
  getTools() {
    if (!this.initialized || !this.agentKit) {
      console.warn('Agent kit not initialized, returning empty tools array');
      return [];
    }
    try {
      return this.agentKit.getAggregatedLangChainTools();
    } catch (error) {
      console.error('Failed to get Agent Kit tools:', error.message);
      return [];
    }
  }

  // Execute agent action using natural language
  async executeAction(userQuery) {
    await this.initialize();
    
    if (!this.initialized || !this.agentKit) {
      throw new Error('Agent Kit not available');
    }
    
    try {
      const tools = this.getTools();
      const { AgentExecutor, createToolCallingAgent } = require('langchain/agents');
      const { ChatPromptTemplate } = require('@langchain/core/prompts');

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', 'You are a Hedera blockchain assistant. Help users interact with Hedera network.'],
        ['human', '{input}'],
        ['placeholder', '{agent_scratchpad}'],
      ]);

      const agent = createToolCallingAgent({
        llm: this.agentKit.llm,
        tools,
        prompt,
      });

      const executor = new AgentExecutor({ agent, tools });
      const response = await executor.invoke({ input: userQuery });

      return response;
    } catch (error) {
      console.error('Agent execution failed:', error.message);
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }

  // Get balance using agent kit
  async getBalance(accountId) {
    await this.initialize();
    const response = await this.executeAction(`What is the balance of account ${accountId}?`);
    return response;
  }

  // Transfer using agent kit
  async transfer(toAccountId, amount, memo) {
    await this.initialize();
    const response = await this.executeAction(
      `Transfer ${amount} HBAR to account ${toAccountId} with memo "${memo}"`
    );
    return response;
  }

  // Check if Agent Kit is available and initialized
  isAvailable() {
    return this.initialized && this.agentKit !== null;
  }
}

module.exports = new HederaAgentKitService();

