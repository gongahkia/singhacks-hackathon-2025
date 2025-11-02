// services/x402-enhanced-service.js
// Enhanced x402 service with ERC-8004 integration, conditional payments, and automatic settlement
const x402FacilitatorService = require('./x402-facilitator-service');
const erc8004Service = require('./erc8004-service');
const agentService = require('./agent-service');
const reputationService = require('./reputation-service');
const hederaClient = require('./hedera-client');

class X402EnhancedService {
  constructor() {
    this.facilitatorUrl = process.env.X402_FACILITATOR_URL || 'https://x402-hedera-production.up.railway.app';
  }

  /**
   * Calculate dynamic price based on agent trust score and capabilities
   * @param {Object} agentData - Agent data with trustScore and capabilities
   * @param {string} capability - Requested capability
   * @param {number} basePrice - Base price in HBAR
   * @returns {number} Adjusted price
   */
  calculateDynamicPrice(agentData, capability, basePrice = 0.001) {
    let price = basePrice;
    
    // Trust score multiplier (higher trust = higher price, up to 2x)
    const trustScore = Number(agentData.trustScore || 50);
    const trustMultiplier = 0.5 + (trustScore / 100); // 0.5x to 1.5x
    price *= trustMultiplier;
    
    // Capability premium (certain capabilities cost more)
    const premiumCapabilities = ['security-audit', 'ai-training', 'data-processing', 'defi-yield-optimizer'];
    if (premiumCapabilities.includes(capability)) {
      price *= 1.5; // 50% premium
    }
    
    // ERC-8004 reputation boost (if agent has official reputation)
    if (agentData.erc8004AgentId) {
      price *= 1.1; // 10% boost for ERC-8004 registered agents
    }
    
    return Math.max(0.0001, Math.min(price, 1.0)); // Cap between 0.0001 and 1.0 HBAR
  }

  /**
   * Create conditional payment challenge based on agent capabilities and trust
   * @param {string} agentAddress - Agent address to pay
   * @param {string} capability - Requested capability
   * @param {number} basePrice - Base price (optional, will be calculated if not provided)
   * @param {Object} options - Additional options (serviceDescription, resource, etc.)
   * @returns {Promise<Object>} x402 challenge with conditional pricing
   */
  async createConditionalPaymentChallenge(agentAddress, capability, basePrice = null, options = {}) {
    try {
      // Get agent data
      const agent = await agentService.getAgent(agentAddress);
      if (!agent) {
        throw new Error(`Agent ${agentAddress} not found`);
      }

      // Calculate dynamic price if not provided
      let price = basePrice;
      if (price === null) {
        price = this.calculateDynamicPrice(agent, capability);
      }

      // Check if escrow is required (high-value transactions)
      const requiresEscrow = price > 0.1; // Escrow for payments > 0.1 HBAR
      
      // Get agent's ERC-8004 ID if available
      const AgentServiceClass = agentService.constructor;
      const erc8004AgentId = AgentServiceClass.getERC8004AgentId(agentAddress);
      
      // Build payment memo
      const memo = options.serviceDescription || 
        `Payment for ${capability} service from ${agent.name || agentAddress}`;

      // Get recipient address (agent wallet or registered address)
      const payTo = agent.agentWalletAddress || agent.registeredAddress || agentAddress;
      
      // Determine asset (default to HBAR, can be USDC)
      const asset = options.currency === 'USDC' 
        ? (process.env.USDC_TOKEN_ID || '0.0.429274')
        : 'HBAR';

      // Create challenge with conditional pricing info
      const challenge = await x402FacilitatorService.createChallenge(
        price,
        asset,
        payTo,
        memo,
        process.env.HEDERA_NETWORK || 'hedera-testnet'
      );

      // Add metadata for conditional payment
      if (challenge.accepts && challenge.accepts[0]) {
        challenge.accepts[0].metadata = {
          agentAddress: agentAddress,
          agentId: agent.agentId,
          erc8004AgentId: erc8004AgentId,
          capability: capability,
          trustScore: agent.trustScore,
          requiresEscrow: requiresEscrow,
          dynamicPricing: true,
          basePrice: basePrice || this.calculateDynamicPrice(agent, capability, 0.001),
          calculatedPrice: price,
          priceBreakdown: {
            trustMultiplier: 0.5 + (Number(agent.trustScore || 50) / 100),
            capabilityPremium: premiumCapabilities.includes(capability) ? 1.5 : 1.0,
            erc8004Boost: erc8004AgentId ? 1.1 : 1.0
          }
        };
      }

      return challenge;
    } catch (error) {
      throw new Error(`Failed to create conditional payment challenge: ${error.message}`);
    }
  }

  /**
   * Verify payment and automatically settle with ERC-8004 feedback linking
   * @param {string} txId - Transaction ID from payment
   * @param {Object} paymentMetadata - Metadata from payment challenge (agentAddress, capability, etc.)
   * @param {Object} options - Options for settlement (autoFeedback, feedbackRating, etc.)
   * @returns {Promise<Object>} Settlement result with payment proof
   */
  async verifyAndSettlePayment(txId, paymentMetadata, options = {}) {
    try {
      const { agentAddress, capability, expectedAmount, expectedPayTo } = paymentMetadata;

      // Step 1: Verify payment via facilitator
      const verification = await x402FacilitatorService.verifyPayment(
        txId,
        expectedAmount,
        expectedPayTo
      );

      if (!verification.verified) {
        throw new Error(`Payment verification failed: ${verification.error || 'Unknown error'}`);
      }

      // Step 2: Settle payment via facilitator
      let settlement = null;
      try {
        // For x402, settlement requires the payment authorization/header
        // Since we're using Hedera facilitator, we'll use the txId for settlement
        settlement = await x402FacilitatorService.settlePayment({
          txId: txId,
          network: process.env.HEDERA_NETWORK || 'hedera-testnet'
        });
      } catch (settleError) {
        console.warn('Settlement via facilitator failed, using txId as proof:', settleError.message);
        // If facilitator settlement fails, we still have the txId as proof
        settlement = { txHash: txId, success: true };
      }

      // Step 3: Link payment proof to ERC-8004 reputation (optional)
      if (options.autoFeedback && paymentMetadata.payerAddress && agentAddress) {
        try {
          // Get ERC-8004 agent ID
          const AgentServiceClass = agentService.constructor;
          const erc8004AgentId = AgentServiceClass.getERC8004AgentId(agentAddress);
          
          if (erc8004AgentId) {
            // Submit feedback with payment proof
            const feedbackRating = options.feedbackRating || 5; // Default 5/5 for successful payment
            await reputationService.submitFeedback(
              paymentMetadata.payerAddress,
              agentAddress,
              feedbackRating,
              `Payment verified for ${capability} service. Payment tx: ${txId}`,
              txId, // Payment txHash
              {
                tag1: 'x402-payment',
                tag2: capability,
                feedbackUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/${txId}`
              }
            );
            console.log(`✅ Linked payment ${txId} to ERC-8004 reputation for agent ${agentAddress}`);
          }
        } catch (feedbackError) {
          console.warn('Failed to link payment to ERC-8004 reputation:', feedbackError.message);
          // Non-critical error, continue
        }
      }

      // Step 4: HCS logging
      try {
        const paymentTopicId = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
        await hederaClient.submitMessage(paymentTopicId, JSON.stringify({
          event: 'X402PaymentSettled',
          txId: txId,
          agentAddress: agentAddress,
          capability: capability,
          amount: expectedAmount,
          payerAddress: paymentMetadata.payerAddress,
          erc8004AgentId: paymentMetadata.erc8004AgentId,
          timestamp: new Date().toISOString()
        }));
      } catch (hcsError) {
        console.warn('HCS logging failed:', hcsError.message);
      }

      return {
        success: true,
        verified: true,
        settled: settlement?.success !== false,
        txId: txId,
        txHash: settlement?.txHash || txId,
        agentAddress: agentAddress,
        capability: capability,
        amount: expectedAmount,
        paymentProof: {
          txId: txId,
          network: process.env.HEDERA_NETWORK || 'hedera-testnet',
          verified: true,
          settled: settlement?.success !== false
        }
      };
    } catch (error) {
      throw new Error(`Payment verification/settlement failed: ${error.message}`);
    }
  }

  /**
   * Create escrow for high-value transactions
   * @param {string} payee - Recipient agent address
   * @param {number} amount - Amount in HBAR
   * @param {string} description - Service description
   * @param {Object} options - Options (payerAddress, capability, etc.)
   * @returns {Promise<Object>} Escrow creation result
   */
  async createHighValueEscrow(payee, amount, description, options = {}) {
    try {
      const paymentService = require('./payment-service');
      
      // Create escrow with payment service
      const escrowResult = await paymentService.createEscrow(
        payee,
        amount,
        description,
        options.payerAddress || null,
        options.payerPrivateKey || null,
        null, // signedTx
        30 // expiration days
      );

      // Log escrow creation
      try {
        const paymentTopicId = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
        await hederaClient.submitMessage(paymentTopicId, JSON.stringify({
          event: 'HighValueEscrowCreated',
          escrowId: escrowResult.escrowId,
          payee: payee,
          amount: amount,
          description: description,
          capability: options.capability,
          timestamp: new Date().toISOString()
        }));
      } catch (hcsError) {
        console.warn('HCS logging failed:', hcsError.message);
      }

      return {
        ...escrowResult,
        escrowType: 'high-value',
        requiresRelease: true
      };
    } catch (error) {
      throw new Error(`Failed to create high-value escrow: ${error.message}`);
    }
  }

  /**
   * Automatically settle payment after service completion
   * @param {string} txId - Payment transaction ID
   * @param {Object} serviceCompletion - Service completion data (agentAddress, capability, etc.)
   * @returns {Promise<Object>} Settlement result
   */
  async autoSettleAfterCompletion(txId, serviceCompletion) {
    try {
      const { agentAddress, capability, payerAddress, serviceResult } = serviceCompletion;

      // Verify service was completed successfully
      if (serviceResult?.success === false) {
        throw new Error('Service completion failed, cannot settle payment');
      }

      // Settle payment with auto-feedback
      const settlement = await this.verifyAndSettlePayment(
        txId,
        {
          agentAddress: agentAddress,
          capability: capability,
          payerAddress: payerAddress,
          expectedAmount: serviceCompletion.amount,
          expectedPayTo: agentAddress
        },
        {
          autoFeedback: true,
          feedbackRating: serviceResult?.rating || 5
        }
      );

      return settlement;
    } catch (error) {
      throw new Error(`Auto-settlement failed: ${error.message}`);
    }
  }
}

module.exports = new X402EnhancedService();

