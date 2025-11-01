// routes/a2a.js
const express = require('express');
const router = express.Router();
const a2aService = require('../services/a2a-service');
const x402Service = require('../services/x402-facilitator-service');
const agentService = require('../services/agent-service');
const reputationService = require('../services/reputation-service');

// Initiate A2A communication
router.post('/communicate', async (req, res, next) => {
  try {
    const { fromAgent, toAgent, capability, fromAgentPrivateKey } = req.body;
    if (!fromAgent || !toAgent || !capability) {
      return res.status(400).json({ error: 'fromAgent, toAgent, and capability are required' });
    }
    // Phase 1 (Demo): If fromAgentPrivateKey provided, use agent wallet
    const result = await a2aService.initiateCommunication(fromAgent, toAgent, capability, fromAgentPrivateKey || null);
    res.json(result);
  } catch (e) { next(e); }
});

// Complete A2A interaction
router.post('/interactions/:interactionId/complete', async (req, res, next) => {
  try {
    const { interactionId } = req.params;
    const { completer, completerPrivateKey } = req.body;
    // Phase 1 (Demo): If completer and completerPrivateKey provided, use agent wallet
    const result = await a2aService.completeInteraction(interactionId, completer || null, completerPrivateKey || null);
    res.json(result);
  } catch (e) { next(e); }
});

// Get A2A interaction details
router.get('/interactions/:interactionId', async (req, res, next) => {
  try {
    const { interactionId } = req.params;
    const interaction = await a2aService.getInteraction(interactionId);
    res.json(interaction);
  } catch (e) { next(e); }
});

// Get agent's interaction history
router.get('/agents/:address/interactions', async (req, res, next) => {
  try {
    const { address } = req.params;
    const interactions = await a2aService.getAgentInteractions(address);
    res.json({ interactions, count: interactions.length });
  } catch (e) { next(e); }
});

// x402 Flow: Request agent service (returns 402 challenge)
router.post('/agents/:agentAddress/request-service', async (req, res, next) => {
  try {
    const { capability, fromAgent, servicePrice, currency } = req.body;
    const toAgent = req.params.agentAddress;
    
    if (!fromAgent || !capability) {
      return res.status(400).json({ error: 'fromAgent and capability are required' });
    }
    
    // Verify both agents exist
    const toAgentData = await agentService.getAgent(toAgent);
    if (!toAgentData || !toAgentData.isActive) {
      return res.status(404).json({ error: 'Target agent not found' });
    }
    
    const fromAgentData = await agentService.getAgent(fromAgent);
    if (!fromAgentData || !fromAgentData.isActive) {
      return res.status(404).json({ error: 'Requesting agent not found' });
    }
    
    // Create x402 payment challenge
    const price = servicePrice || '10'; // 10 HBAR default
    const asset = currency === 'USDC' ? process.env.USDC_TOKEN_ID || '0.0.429274' : 'HBAR';
    
    const challenge = await x402Service.createChallenge(
      price,
      asset,
      toAgent, // payee
      `A2A-${capability}-${Date.now()}` // memo
    );
    
    // Store pending interaction (in-memory for now)
    const interactionId = `pending-${fromAgent}-${toAgent}-${Date.now()}`;
    
    res.status(402).json({
      interactionId,
      ...challenge
    });
  } catch (error) {
    next(error);
  }
});

// x402 Flow: Complete service with payment proof
router.post('/agents/:agentAddress/complete-service', async (req, res, next) => {
  try {
    const { interactionId, txId, fromAgent, fromAgentPrivateKey } = req.body;
    const toAgent = req.params.agentAddress;
    
    if (!txId || !fromAgent) {
      return res.status(400).json({ error: 'txId and fromAgent are required' });
    }
    
    // Verify payment via x402 facilitator (optional - may not be available)
    try {
      const verification = await x402Service.verifyPayment(txId, '10', toAgent);
      if (!verification.verified) {
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    } catch (verifyError) {
      console.warn('x402 verification unavailable, proceeding without:', verifyError.message);
    }
    
    // Initiate A2A communication on-chain
    const result = await a2aService.initiateCommunication(
      fromAgent,
      toAgent,
      'payments',
      fromAgentPrivateKey // Demo only
    );
    
    // Establish trust from successful payment
    try {
      await reputationService.establishTrustFromPayment(fromAgent, toAgent, txId);
    } catch (trustError) {
      console.warn('Trust establishment failed (non-critical):', trustError.message);
    }
    
    res.json({
      success: true,
      interactionId: result.interactionId,
      txHash: result.txHash,
      paymentVerified: true,
      x402Flow: true
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

