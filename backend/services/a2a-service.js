// services/a2a-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');
const agentService = require('./agent-service');

let AgentRegistryABI;
let deploymentInfo;
try {
  AgentRegistryABI = require('../../contracts/artifacts/contracts/src/AgentRegistry.sol/AgentRegistry.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  AgentRegistryABI = [];
  deploymentInfo = { contracts: { AgentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000' } };
}

class A2AService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY || '0x' + '0'.repeat(64), this.provider);
    this.agentRegistry = new ethers.Contract(
      deploymentInfo.contracts.AgentRegistry,
      AgentRegistryABI,
      this.wallet
    );
  }

  /**
   * Initiate A2A communication between agents
   */
  async initiateCommunication(fromAgent, toAgent, capability) {
    try {
      // Verify both agents exist and check trust thresholds
      const fromAgentData = await agentService.getAgent(fromAgent);
      const toAgentData = await agentService.getAgent(toAgent);

      // Check trust score threshold
      if (Number(toAgentData.trustScore) < 40) {
        throw new Error('Target agent trust score too low for A2A communication (minimum 40)');
      }

      // Initiate on-chain A2A interaction
      const tx = await this.agentRegistry.initiateA2ACommunication(toAgent, capability);
      const receipt = await tx.wait();

      // Extract interaction ID from event
      let interactionId = null;
      try {
        const log = receipt.logs.find(l => {
          try {
            return this.agentRegistry.interface.parseLog(l).name === 'A2AInteractionInitiated';
          } catch {
            return false;
          }
        });
        if (log) {
          const parsed = this.agentRegistry.interface.parseLog(log);
          interactionId = parsed.args.interactionId;
        }
      } catch {}

      // Submit to HCS for logging
      if (process.env.A2A_TOPIC_ID) {
        await hederaClient.submitMessage(process.env.A2A_TOPIC_ID, JSON.stringify({
          event: 'A2ACommunicationInitiated',
          interactionId,
          fromAgent,
          toAgent,
          capability,
          trustScoreFrom: fromAgentData.trustScore,
          trustScoreTo: toAgentData.trustScore,
          timestamp: new Date().toISOString()
        }));
      }

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
   */
  async completeInteraction(interactionId) {
    try {
      const tx = await this.agentRegistry.completeA2AInteraction(interactionId);
      const receipt = await tx.wait();

      // Get interaction details
      const interaction = await this.agentRegistry.getA2AInteraction(interactionId);

      // Log to HCS
      if (process.env.A2A_TOPIC_ID) {
        await hederaClient.submitMessage(process.env.A2A_TOPIC_ID, JSON.stringify({
          event: 'A2ACommunicationCompleted',
          interactionId,
          fromAgent: interaction.fromAgent,
          toAgent: interaction.toAgent,
          timestamp: new Date().toISOString()
        }));
      }

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

