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
   * Submit reputation feedback using ERC-8004 ReputationRegistry
   * @param {string} fromAgentAddress - Client/feedback giver address
   * @param {string|number} toAgentId - ERC-8004 agent ID (or address for backward compat)
   * @param {number} rating - Rating (1-5 or 0-100 scale)
   * @param {string} comment - Optional comment
   * @param {string} paymentTxHash - Optional x402 payment transaction hash
   * @param {Object} options - Optional: tag1, tag2, feedbackUri
   * @returns {Promise<Object>} Feedback submission result
   */
  async submitFeedback(fromAgentAddress, toAgentId, rating, comment = '', paymentTxHash = null, options = {}) {
    this.ensureInitialized();
    
    try {
      await erc8004Service.initialize();
      
      if (!erc8004Service.isAvailable()) {
        throw new Error('ERC-8004 service not available');
      }
      
      // Determine if toAgentId is an address or ERC-8004 agentId
      let erc8004AgentId = null;
      let toAgentAddress = null;
      
      // Try to resolve agentId from address
      if (typeof toAgentId === 'string' && toAgentId.startsWith('0x')) {
        toAgentAddress = toAgentId;
        // Try to get ERC-8004 ID from agent service
        const agentService = require('./agent-service');
        const AgentServiceClass = agentService.constructor;
        erc8004AgentId = AgentServiceClass.getERC8004AgentId(toAgentAddress);
        if (!erc8004AgentId) {
          throw new Error(`No ERC-8004 agent ID found for address ${toAgentAddress}`);
        }
      } else {
        erc8004AgentId = parseInt(toAgentId);
      }
      
      // Convert rating to 0-100 scale (if 1-5, convert)
      let score = rating;
      if (rating >= 1 && rating <= 5) {
        score = (rating / 5) * 100; // Convert 1-5 to 0-100
      }
      if (score < 0 || score > 100) {
        throw new Error('Rating must be between 1-5 or 0-100');
      }
      
      // Get agent owner wallet (for feedbackAuth signature)
      // For permissionless agents, use their wallet; for permissioned, use backend wallet
      const agentService = require('./agent-service');
      const AgentServiceClass = agentService.constructor;
      let agentOwnerWallet = this.wallet; // Default to backend wallet
      
      // Check if agent is permissionless (has its own wallet)
      const agentDataEntry = Array.from(AgentServiceClass.agentIdMapping.entries())
        .find(([id, data]) => data.erc8004AgentId === erc8004AgentId.toString());
      const agentData = agentDataEntry ? agentDataEntry[1] : null;
      
      if (agentData?.paymentMode === 'permissionless' && agentData.agentWalletAddress) {
        // For permissionless agents, we need the agent owner to sign
        // For now, use backend wallet (in production, agent owner would sign)
        agentOwnerWallet = this.wallet;
      }
      
      // Generate feedbackAuth signature
      const feedbackAuthData = await erc8004Service.generateFeedbackAuth(
        agentOwnerWallet,
        erc8004AgentId,
        fromAgentAddress,
        1, // indexLimit
        3600 // 1 hour expiry
      );
      
      // Create feedback URI (include payment proof if available)
      let feedbackUri = options.feedbackUri || '';
      let feedbackHash = options.feedbackHash || ethers.ZeroHash;
      
      if (paymentTxHash && paymentTxHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        // Include x402 payment proof in feedback URI
        const paymentProof = {
          txHash: paymentTxHash,
          network: 'hedera-testnet',
          timestamp: new Date().toISOString()
        };
        feedbackUri = feedbackUri || `https://heracles.hedera/feedback/${erc8004AgentId}/${Date.now()}`;
        // Store payment proof in metadata (could be IPFS or backend storage)
        feedbackHash = ethers.id(paymentTxHash); // Hash of payment tx
      }
      
      if (comment) {
        // Include comment in feedback URI metadata
        if (!feedbackUri) {
          feedbackUri = `https://heracles.hedera/feedback/${erc8004AgentId}/${Date.now()}`;
        }
      }
      
      // Convert tags to bytes32
      const tag1 = options.tag1 ? (typeof options.tag1 === 'string' && options.tag1.startsWith('0x') 
        ? options.tag1 
        : ethers.id(options.tag1)) : ethers.ZeroHash;
      const tag2 = options.tag2 ? (typeof options.tag2 === 'string' && options.tag2.startsWith('0x') 
        ? options.tag2 
        : ethers.id(options.tag2)) : ethers.ZeroHash;
      
      // Create client wallet (for submitting feedback)
      // In production, this would be the actual client's wallet
      // For now, use backend wallet if fromAgentAddress matches, otherwise create a wallet
      let clientWallet = this.wallet;
      if (fromAgentAddress.toLowerCase() !== this.wallet.address.toLowerCase()) {
        // In production, you'd get the actual client wallet from session/auth
        // For demo, we'll use backend wallet but log the client address
        console.log(`⚠️  Using backend wallet for client ${fromAgentAddress} - in production, use actual client wallet`);
      }
      
      // Submit feedback to ERC-8004 ReputationRegistry
      const result = await erc8004Service.giveFeedback(
        clientWallet,
        erc8004AgentId,
        Math.round(score),
        tag1,
        tag2,
        feedbackUri,
        feedbackHash,
        feedbackAuthData.feedbackAuth
      );
      
      // HCS logging
      const reputationTopicId = await hederaClient.ensureTopic('REPUTATION_TOPIC_ID', 'Reputation', 'Reputation feedback events');
      await hederaClient.submitMessage(reputationTopicId, JSON.stringify({
        event: 'ReputationFeedbackSubmitted',
        fromAgent: fromAgentAddress,
        toAgentId: erc8004AgentId,
        toAgentAddress: toAgentAddress,
        rating: score,
        comment: comment,
        paymentTxHash: paymentTxHash,
        txHash: result.txHash,
        timestamp: new Date().toISOString()
      }));
      
      return {
        success: true,
        txHash: result.txHash,
        fromAgent: fromAgentAddress,
        toAgentId: erc8004AgentId,
        toAgentAddress: toAgentAddress,
        rating: score,
        erc8004AgentId: erc8004AgentId
      };
    } catch (error) {
      throw new Error(`Failed to submit feedback: ${error.message}`);
    }
  }

  /**
   * Get reputation feedback for an agent (ERC-8004 ReputationRegistry)
   * @param {string|number} agentIdentifier - Agent address or ERC-8004 agent ID
   * @param {Object} options - Optional filters: clientAddresses, tag1, tag2, includeRevoked
   * @returns {Promise<Array>} Reputation feedback array
   */
  async getAgentReputation(agentIdentifier, options = {}) {
    this.ensureInitialized();
    
    try {
      await erc8004Service.initialize();
      
      if (!erc8004Service.isAvailable()) {
        // Fallback to empty array if ERC-8004 not available
        console.warn('ERC-8004 not available, returning empty reputation');
        return [];
      }
      
      // Resolve ERC-8004 agent ID
      let erc8004AgentId = null;
      if (typeof agentIdentifier === 'string' && agentIdentifier.startsWith('0x')) {
        const agentService = require('./agent-service');
        const AgentServiceClass = agentService.constructor;
        erc8004AgentId = AgentServiceClass.getERC8004AgentId(agentIdentifier);
        if (!erc8004AgentId) {
          // No ERC-8004 ID found, return empty array
          return [];
        }
      } else {
        erc8004AgentId = parseInt(agentIdentifier);
      }
      
      // Convert tag strings to bytes32 if needed
      let tag1 = options.tag1 || ethers.ZeroHash;
      let tag2 = options.tag2 || ethers.ZeroHash;
      if (typeof tag1 === 'string' && tag1.length > 0 && !tag1.startsWith('0x')) {
        tag1 = ethers.id(tag1);
      }
      if (typeof tag2 === 'string' && tag2.length > 0 && !tag2.startsWith('0x')) {
        tag2 = ethers.id(tag2);
      }
      
      // Get all feedback from ERC-8004 ReputationRegistry
      const feedback = await erc8004Service.readAllFeedback(
        erc8004AgentId,
        options.clientAddresses || [],
        tag1,
        tag2,
        options.includeRevoked !== false // Default to including revoked
      );
      
      // Transform ERC-8004 feedback format to our format
      return feedback.clients.map((clientAddress, index) => ({
        fromAgent: clientAddress,
        toAgent: agentIdentifier,
        toAgentId: erc8004AgentId,
        rating: feedback.scores[index]?.toString() || '0',
        score: feedback.scores[index] || 0,
        tag1: feedback.tag1s[index] || null,
        tag2: feedback.tag2s[index] || null,
        isRevoked: feedback.revokedStatuses[index] || false,
        timestamp: new Date().toISOString() // ERC-8004 doesn't store timestamp in feedback
      }));
    } catch (error) {
      console.error(`Failed to get ERC-8004 reputation: ${error.message}`);
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  /**
   * Establish trust from successful payment
   * NOTE: Custom contract removed - now just logs to HCS and returns success
   * Trust is established via ERC-8004 reputation feedback instead
   */
  async establishTrustFromPayment(agent1, agent2, transactionHash) {
    try {
      // Since we removed custom contract, we just log the trust establishment
      // Actual trust is tracked via ERC-8004 reputation feedback
      
      // HCS logging is mandatory - ensure topic exists
      const paymentTopicId = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
      await hederaClient.submitMessage(paymentTopicId, JSON.stringify({
          event: 'TrustEstablishedFromPayment',
          agent1,
          agent2,
          transactionHash,
          timestamp: new Date().toISOString(),
          note: 'Trust tracked via ERC-8004 reputation feedback'
        }));

      return {
        success: true,
        txHash: transactionHash, // Use transactionHash as reference
        agent1,
        agent2,
        note: 'Trust established via payment. Use ERC-8004 reputation feedback for on-chain trust tracking.'
      };
    } catch (error) {
      // Non-critical error, log but don't fail
      console.warn('Failed to log trust establishment:', error.message);
      return {
        success: true, // Still return success as trust is tracked via ERC-8004
        txHash: transactionHash,
        agent1,
        agent2,
        warning: 'HCS logging failed, but trust is tracked via ERC-8004'
      };
    }
  }

  /**
   * Get hybrid trust score (combines custom + ERC-8004 official)
   * @param {string} agentAddress - Agent's EVM address
   * @param {number} officialAgentId - Agent's ERC-8004 ID (optional)
   * @returns {Promise<Object>} Hybrid trust score data
   */
  async getHybridTrustScore(agentAddress, officialAgentId = null) {
    // Don't require agentRegistry initialization for hybrid trust score
    // Only initialize provider/wallet if needed (we don't need contract for this method)
    if (!this.provider) {
      const { RPC_URL } = process.env;
      if (!RPC_URL) throw new Error('RPC_URL not set');
      this.provider = new ethers.JsonRpcProvider(RPC_URL);
    }
    
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
      // 1. ERC-8004 Official Reputation (BASE - 50%)
      let erc8004Score = 0;
      let erc8004Count = 0;
      let erc8004Weight = 0.5; // CHANGED: 70% -> 50%
      
      if (officialAgentId !== null) {
        try {
          await erc8004Service.initialize();
          const officialRep = await erc8004Service.getReputationSummary(officialAgentId);
          erc8004Score = officialRep.averageScore || 0;
          erc8004Count = officialRep.count || 0;
        } catch (error) {
          console.warn('ERC-8004 reputation not available:', error.message);
          erc8004Weight = 0; // If no ERC-8004, redistribute weights
        }
      }
      
      // 2. Custom Metrics from backend agentIdMapping (25% - adjusted for 50% ERC-8004)
      // Since we removed custom contract, use backend agent data
      let customScore = 0;
      try {
        const agentService = require('./agent-service');
        const AgentServiceClass = agentService.constructor;
        // Try to find agent in mapping
        const agentEntry = Array.from(AgentServiceClass.agentIdMapping.entries())
          .find(([id, data]) => data.registeredAddress?.toLowerCase() === agentAddress.toLowerCase());
        if (agentEntry) {
          customScore = Number(agentEntry[1].trustScore || 0);
        }
      } catch (e) {
        console.warn('Could not fetch custom score:', e.message);
      }
      const customWeight = 0.25; // CHANGED: 15% -> 25% (adjusted for 50% ERC-8004)
      
      // 3. Transaction Success Rate (15% - adjusted for 50% ERC-8004)
      // Since we removed custom contract, estimate from reputation feedback
      let successfulTxs = 0;
      let totalInteractions = [];
      try {
        // Use reputation feedback with payment txHash as proxy for successful transactions
        const reputation = await this.getAgentReputation(agentAddress);
        totalInteractions = reputation;
        successfulTxs = reputation.filter(f => f.paymentTxHash && !f.isRevoked).length;
      } catch (error) {
        console.warn('Could not fetch transaction metrics:', error.message);
      }
      const totalInteractionsCount = Array.isArray(totalInteractions) ? totalInteractions.length : 0;
      const transactionSuccessRate = totalInteractionsCount > 0 
        ? Math.min(100, (successfulTxs / totalInteractionsCount) * 100)
        : 50; // Default 50% if no transactions yet
      const txWeight = 0.15; // CHANGED: 10% -> 15% (adjusted for 50% ERC-8004)
      
      // 4. Payment Completion Rate (10% - adjusted for 50% ERC-8004)
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
      const paymentWeight = 0.1; // CHANGED: 5% -> 10% (adjusted for 50% ERC-8004)
      
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
            source: 'Backend agent metrics'
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
          ? 'ERC-8004 (50%) + Custom (25%) + Tx Success (15%) + Payment Completion (10%)'
          : 'Custom (50%) + Tx Success (30%) + Payment Completion (20%)'
      };
    } catch (error) {
      // Graceful degradation: return a minimal valid structure instead of throwing
      console.error(`Failed to calculate hybrid trust score for ${agentAddress}:`, error.message);
      
      // Return a safe fallback structure
      return {
        final: 0,
        hybrid: 0,
        breakdown: {
          erc8004: { score: 0, count: 0, weight: 0, available: false },
          custom: { score: 0, weight: 0, source: 'Error - fallback' },
          transactionSuccess: { rate: 0, successful: 0, total: 0, weight: 0 },
          paymentCompletion: { rate: 0, completed: 0, total: 0, weight: 0 }
        },
        custom: 0,
        official: 0,
        officialFeedbackCount: 0,
        weights: {
          custom: 0,
          official: 0,
          transactionSuccess: 0,
          paymentCompletion: 0
        },
        formula: 'Error calculating trust score',
        error: error.message
      };
    }
  }
}

module.exports = new ReputationService();

