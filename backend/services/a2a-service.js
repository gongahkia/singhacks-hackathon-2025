// services/a2a-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');
const agentService = require('./agent-service');

let AgentRegistryABI;
let deploymentInfo;
try {
  AgentRegistryABI = require('../../contracts/artifacts/src/AgentRegistry.sol/AgentRegistry.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  AgentRegistryABI = [];
  deploymentInfo = { contracts: { AgentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000' } };
}

class A2AService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.agentRegistry = null;
  }

  ensureProvider() {
    if (this.provider) return;
    const { RPC_URL } = process.env;
    if (!RPC_URL) throw new Error('RPC_URL not set');
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  ensureInitialized() {
    if (this.agentRegistry) return;
    this.ensureProvider();
    const { EVM_PRIVATE_KEY } = process.env;
    if (!EVM_PRIVATE_KEY || !EVM_PRIVATE_KEY.startsWith('0x')) {
      throw new Error('EVM_PRIVATE_KEY must be set (hex 0x...) for A2A operations (fallback)');
    }
    this.wallet = new ethers.Wallet(EVM_PRIVATE_KEY, this.provider);
    this.agentRegistry = new ethers.Contract(
      deploymentInfo.contracts.AgentRegistry,
      AgentRegistryABI,
      this.wallet
    );
  }

  /**
   * Get agent registry contract instance with specific wallet
   */
  getAgentRegistryContract(wallet) {
    this.ensureProvider();
    return new ethers.Contract(
      deploymentInfo.contracts.AgentRegistry,
      AgentRegistryABI,
      wallet
    );
  }

  /**
   * Initiate A2A communication between agents
   * @param {string} fromAgent - Agent address initiating communication
   * @param {string} toAgent - Target agent address
   * @param {string} capability - Capability being requested
   * @param {string} [fromAgentPrivateKey] - From agent's EVM private key (optional, DEMO ONLY)
   * @returns {Promise<Object>} Communication initiation result
   */
  async initiateCommunication(fromAgent, toAgent, capability, fromAgentPrivateKey = null) {
    try {
      // Verify both agents exist and check trust thresholds
      const fromAgentData = await agentService.getAgent(fromAgent);
      const toAgentData = await agentService.getAgent(toAgent);

      // Check trust score threshold
      if (Number(toAgentData.trustScore) < 40) {
        throw new Error('Target agent trust score too low for A2A communication (minimum 40)');
      }

      // Determine which wallet/contract to use
      let contractToUse = null;
      
      if (fromAgentPrivateKey) {
        // Phase 1 (Demo): Use agent's wallet
        this.ensureProvider();
        let privateKey = fromAgentPrivateKey;
        if (!privateKey.startsWith('0x')) {
          privateKey = '0x' + privateKey;
        }
        const wallet = new ethers.Wallet(privateKey, this.provider);
        
        // Verify wallet address matches agent address
        if (wallet.address.toLowerCase() !== fromAgent.toLowerCase()) {
          throw new Error(`Private key does not match agent address. Expected ${fromAgent}, got ${wallet.address}`);
        }
        
        contractToUse = this.getAgentRegistryContract(wallet);
      } else {
        // Fallback to backend wallet
        this.ensureInitialized();
        contractToUse = this.agentRegistry;
      }

      // Initiate on-chain A2A interaction
      const tx = await contractToUse.initiateA2ACommunication(toAgent, capability);
      const receipt = await tx.wait();

      // Extract interaction ID from event
      let interactionId = null;
      try {
        const log = receipt.logs.find(l => {
          try {
            return contractToUse.interface.parseLog(l).name === 'A2AInteractionInitiated';
          } catch {
            return false;
          }
        });
        if (log) {
          const parsed = contractToUse.interface.parseLog(log);
          interactionId = parsed.args.interactionId;
        }
      } catch {}

      // HCS logging is mandatory - ensure topic exists
      const a2aTopicId = await hederaClient.ensureTopic('A2A_TOPIC_ID', 'A2A', 'Agent-to-agent communication events');
      await hederaClient.submitMessage(a2aTopicId, JSON.stringify({
        event: 'A2ACommunicationInitiated',
        interactionId,
        fromAgent,
        toAgent,
        capability,
        trustScoreFrom: fromAgentData.trustScore,
        trustScoreTo: toAgentData.trustScore,
        timestamp: new Date().toISOString()
      }));

      return {
        success: true,
        interactionId,
        txHash: receipt.hash,
        fromAgent,
        toAgent,
        capability
      };
    } catch (error) {
      throw new Error(`A2A communication failed: ${error.message}`);
    }
  }

  /**
   * Complete an A2A interaction (establishes trust)
   * @param {string} interactionId - Interaction ID to complete
   * @param {string} [completerAgentAddress] - Agent address completing (toAgent). If not provided, uses backend wallet.
   * @param {string} [completerPrivateKey] - Completer's EVM private key (optional, DEMO ONLY)
   * @returns {Promise<Object>} Completion result
   */
  async completeInteraction(interactionId, completerAgentAddress = null, completerPrivateKey = null) {
    try {
      // Get interaction details first to verify completer
      this.ensureInitialized();
      const interaction = await this.agentRegistry.getA2AInteraction(interactionId);
      
      // Determine which wallet/contract to use
      let contractToUse = null;
      
      if (completerAgentAddress && completerPrivateKey) {
        // Verify completer is the toAgent
        if (completerAgentAddress.toLowerCase() !== interaction.toAgent.toLowerCase()) {
          throw new Error(`Only ${interaction.toAgent} can complete this interaction. Got ${completerAgentAddress}`);
        }
        
        this.ensureProvider();
        let privateKey = completerPrivateKey;
        if (!privateKey.startsWith('0x')) {
          privateKey = '0x' + privateKey;
        }
        const wallet = new ethers.Wallet(privateKey, this.provider);
        
        if (wallet.address.toLowerCase() !== completerAgentAddress.toLowerCase()) {
          throw new Error(`Private key does not match agent address. Expected ${completerAgentAddress}, got ${wallet.address}`);
        }
        
        contractToUse = this.getAgentRegistryContract(wallet);
      } else {
        // Fallback to backend wallet
        contractToUse = this.agentRegistry;
      }
      
      const tx = await contractToUse.completeA2AInteraction(interactionId);
      const receipt = await tx.wait();

      // HCS logging is mandatory - ensure topic exists
      const a2aTopicId = await hederaClient.ensureTopic('A2A_TOPIC_ID', 'A2A', 'Agent-to-agent communication events');
      await hederaClient.submitMessage(a2aTopicId, JSON.stringify({
        event: 'A2ACommunicationCompleted',
        interactionId,
        fromAgent: interaction.fromAgent,
        toAgent: interaction.toAgent,
        timestamp: new Date().toISOString()
      }));

      return {
        success: true,
        txHash: receipt.hash,
        interactionId
      };
    } catch (error) {
      throw new Error(`Failed to complete A2A interaction: ${error.message}`);
    }
  }

  /**
   * Get A2A interaction details
   */
  async getInteraction(interactionId) {
    this.ensureInitialized();
    try {
      const interaction = await this.agentRegistry.getA2AInteraction(interactionId);
      return {
        interactionId,
        fromAgent: interaction.fromAgent,
        toAgent: interaction.toAgent,
        capability: interaction.capability,
        timestamp: interaction.timestamp ? new Date(Number(interaction.timestamp) * 1000).toISOString() : undefined,
        completed: interaction.completed
      };
    } catch (error) {
      throw new Error(`Failed to get interaction: ${error.message}`);
    }
  }

  /**
   * Get agent's interaction history
   */
  async getAgentInteractions(agentAddress) {
    this.ensureInitialized();
    try {
      const interactionIds = await this.agentRegistry.getAgentInteractions(agentAddress);
      const interactions = await Promise.all(
        interactionIds.map(id => this.getInteraction(id))
      );
      return interactions;
    } catch (error) {
      throw new Error(`Failed to get agent interactions: ${error.message}`);
    }
  }
}

module.exports = new A2AService();

