// services/reputation-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');
const erc8004Service = require('./erc8004-service');

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

  /**
   * Get hybrid trust score (combines custom + ERC-8004 official)
   * @param {string} agentAddress - Agent's EVM address
   * @param {number} officialAgentId - Agent's ERC-8004 ID (optional)
   * @returns {Promise<Object>} Hybrid trust score data
   */
  async getHybridTrustScore(agentAddress, officialAgentId = null) {
    this.ensureInitialized();
    
    // Auto-fetch ERC-8004 agent ID if not provided
    if (officialAgentId === null) {
      const agentService = require('./agent-service');
      const mappedId = agentService.constructor.getERC8004AgentId(agentAddress);
      officialAgentId = mappedId ? parseInt(mappedId) : null;
      if (officialAgentId !== null) {
        console.log(`Found ERC-8004 Agent ID ${officialAgentId} for ${agentAddress}`);
      }
    }
    
    try {
      // 1. ERC-8004 Official Reputation (BASE - 70%)
      let erc8004Score = 0;
      let erc8004Count = 0;
      let erc8004Weight = 0.7; // CHANGED: 40% -> 70%
      
      if (officialAgentId !== null) {
        try {
          await erc8004Service.initialize();
          const officialRep = await erc8004Service.getOfficialReputation(officialAgentId);
          erc8004Score = officialRep.averageScore;
          erc8004Count = officialRep.count;
        } catch (error) {
          console.warn('ERC-8004 reputation not available:', error.message);
          erc8004Weight = 0; // If no ERC-8004, redistribute weights
        }
      }
      
      // 2. Custom Metrics from AgentRegistry (15% - was 30%)
      const agent = await this.agentRegistry.getAgent(agentAddress);
      const customScore = Number(agent.trustScore);
      const customWeight = 0.15; // CHANGED: 30% -> 15%
      
      // 3. Transaction Success Rate (10% - was 20%)
      let successfulTxs = 0;
      let totalInteractions = [];
      try {
        successfulTxs = Number(agent.successfulTransactions || await this.agentRegistry.successfulTransactions(agentAddress) || 0);
        totalInteractions = await this.agentRegistry.getAgentInteractions(agentAddress) || [];
      } catch (error) {
        console.warn('Could not fetch transaction metrics:', error.message);
      }
      const totalInteractionsCount = Array.isArray(totalInteractions) ? totalInteractions.length : 0;
      const transactionSuccessRate = totalInteractionsCount > 0 
        ? Math.min(100, (successfulTxs / totalInteractionsCount) * 100)
        : 50; // Default 50% if no transactions yet
      const txWeight = 0.1; // CHANGED: 20% -> 10%
      
      // 4. Payment Completion Rate (5% - was 10%)
      let reputation = [];
      try {
        reputation = await this.getAgentReputation(agentAddress);
      } catch (error) {
        console.warn('Could not fetch reputation for payment completion:', error.message);
      }
      const paymentsWithFeedback = reputation.filter(f => 
        f.paymentTxHash && 
        f.paymentTxHash !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      );
      const paymentCompletionRate = reputation.length > 0
        ? Math.min(100, (paymentsWithFeedback.length / reputation.length) * 100)
        : 50; // Default 50%
      const paymentWeight = 0.05; // CHANGED: 10% -> 5%
      
      // Adjust weights if ERC-8004 not available
      let finalCustomWeight = customWeight;
      let finalTxWeight = txWeight;
      let finalPaymentWeight = paymentWeight;
      if (erc8004Weight === 0) {
        // If no ERC-8004, redistribute: Custom 50%, Tx 30%, Payment 20%
        finalCustomWeight = 0.5;
        finalTxWeight = 0.3;
        finalPaymentWeight = 0.2;
      }
      
      // Calculate weighted score
      const finalScore = 
        (erc8004Score * erc8004Weight) +
        (customScore * finalCustomWeight) +
        (transactionSuccessRate * finalTxWeight) +
        (paymentCompletionRate * finalPaymentWeight);
      
      return {
        final: Math.round(finalScore),
        hybrid: Math.round(finalScore), // Keep for backward compatibility
        breakdown: {
          erc8004: {
            score: erc8004Score,
            count: erc8004Count,
            weight: erc8004Weight,
            available: erc8004Count > 0
          },
          custom: {
            score: customScore,
            weight: finalCustomWeight,
            source: 'AgentRegistry on-chain metrics'
          },
          transactionSuccess: {
            rate: transactionSuccessRate,
            successful: successfulTxs,
            total: totalInteractionsCount,
            weight: finalTxWeight
          },
          paymentCompletion: {
            rate: paymentCompletionRate,
            completed: paymentsWithFeedback.length,
            total: reputation.length,
            weight: finalPaymentWeight
          }
        },
        custom: customScore, // Keep for backward compatibility
        official: erc8004Score,
        officialFeedbackCount: erc8004Count,
        weights: {
          custom: finalCustomWeight,
          official: erc8004Weight,
          transactionSuccess: finalTxWeight,
          paymentCompletion: finalPaymentWeight
        },
        formula: erc8004Count > 0 
          ? 'ERC-8004 (70%) + Custom (15%) + Tx Success (10%) + Payment Completion (5%)'
          : 'Custom (50%) + Tx Success (30%) + Payment Completion (20%)'
      };
    } catch (error) {
      throw new Error(`Failed to calculate enhanced trust score: ${error.message}`);
    }
  }
}

module.exports = new ReputationService();

