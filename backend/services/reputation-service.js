// services/reputation-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

let AgentRegistryABI;
let deploymentInfo;
try {
  AgentRegistryABI = require('../../contracts/artifacts/src/AgentRegistry.sol/AgentRegistry.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  AgentRegistryABI = [];
  deploymentInfo = { contracts: { AgentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000' } };
}

class ReputationService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.agentRegistry = null;
    // Lazy init to avoid crashing server when env vars are missing at boot
  }

  ensureInitialized() {
    if (this.wallet) return;

    const { RPC_URL, EVM_PRIVATE_KEY } = process.env;
    if (!EVM_PRIVATE_KEY || !EVM_PRIVATE_KEY.startsWith('0x')) {
      throw new Error('EVM_PRIVATE_KEY must be set (hex 0x...) for reputation operations');
    }

    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(EVM_PRIVATE_KEY, this.provider);
    this.agentRegistry = new ethers.Contract(
      deploymentInfo.contracts.AgentRegistry,
      AgentRegistryABI,
      this.wallet
    );
  }

  /**
   * Submit reputation feedback (ERC-8004 Reputation Registry)
   */
  async submitFeedback(fromAgent, toAgent, rating, comment = '', paymentTxHash = '0x0000000000000000000000000000000000000000000000000000000000000000') {
    this.ensureInitialized();
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const tx = await this.agentRegistry.submitFeedback(
        toAgent,
        rating,
        comment,
        paymentTxHash
      );
      const receipt = await tx.wait();

      // HCS logging is mandatory - ensure topic exists
      const agentTopicId = await hederaClient.ensureTopic('AGENT_TOPIC_ID', 'Agent', 'Agent registration events');
      await hederaClient.submitMessage(agentTopicId, JSON.stringify({
          event: 'ReputationFeedbackSubmitted',
          fromAgent,
          toAgent,
          rating,
          paymentTxHash,
          txHash: receipt.hash,
          timestamp: new Date().toISOString()
        }));

      return {
        success: true,
        txHash: receipt.hash,
        fromAgent,
        toAgent,
        rating
      };
    } catch (error) {
      throw new Error(`Failed to submit feedback: ${error.message}`);
    }
  }

  /**
   * Get reputation feedback for an agent
   */
  async getAgentReputation(agentAddress) {
    this.ensureInitialized();
    try {
      const feedbacks = await this.agentRegistry.getAgentReputation(agentAddress);
      return feedbacks.map(f => ({
        fromAgent: f.fromAgent,
        toAgent: f.toAgent,
        rating: f.rating?.toString?.() || '0',
        comment: f.comment,
        paymentTxHash: f.paymentTxHash,
        timestamp: f.timestamp ? new Date(Number(f.timestamp) * 1000).toISOString() : undefined
      }));
    } catch (error) {
      throw new Error(`Failed to get reputation: ${error.message}`);
    }
  }

  /**
   * Establish trust from successful payment
   */
  async establishTrustFromPayment(agent1, agent2, transactionHash) {
    this.ensureInitialized();
    try {
      const txHashBytes = ethers.isHexString(transactionHash) 
        ? transactionHash 
        : ethers.hexlify(ethers.toUtf8Bytes(transactionHash));
      
      const tx = await this.agentRegistry.establishTrustFromPayment(
        agent1,
        agent2,
        txHashBytes
      );
      const receipt = await tx.wait();

      // HCS logging is mandatory - ensure topic exists
      const paymentTopicId = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
      await hederaClient.submitMessage(paymentTopicId, JSON.stringify({
          event: 'TrustEstablishedFromPayment',
          agent1,
          agent2,
          transactionHash,
          txHash: receipt.hash,
          timestamp: new Date().toISOString()
        }));

      return {
        success: true,
        txHash: receipt.hash,
        agent1,
        agent2
      };
    } catch (error) {
      throw new Error(`Failed to establish trust: ${error.message}`);
    }
  }
}

module.exports = new ReputationService();

