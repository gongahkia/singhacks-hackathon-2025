// routes/x402-enhanced.js
// Enhanced x402 routes with conditional payments and automatic settlement
const express = require('express');
const router = express.Router();
const x402EnhancedService = require('../services/x402-enhanced-service');
const agentService = require('../services/agent-service');

/**
 * Create conditional payment challenge based on agent capabilities and trust
 * POST /api/x402-enhanced/conditional-challenge
 * Body: { agentAddress, capability, basePrice?, serviceDescription?, currency? }
 */
router.post('/conditional-challenge', async (req, res, next) => {
  try {
    const { agentAddress, capability, basePrice, serviceDescription, currency } = req.body;

    if (!agentAddress || !capability) {
      return res.status(400).json({ error: 'agentAddress and capability are required' });
    }

    const challenge = await x402EnhancedService.createConditionalPaymentChallenge(
      agentAddress,
      capability,
      basePrice || null,
      { serviceDescription, currency }
    );

    res.status(402).json(challenge);
  } catch (e) {
    next(e);
  }
});

/**
 * Verify and settle payment with automatic ERC-8004 feedback linking
 * POST /api/x402-enhanced/verify-settle
 * Body: { txId, agentAddress, capability, expectedAmount, expectedPayTo, payerAddress, autoFeedback?, feedbackRating? }
 */
router.post('/verify-settle', async (req, res, next) => {
  try {
    const { 
      txId, 
      agentAddress, 
      capability, 
      expectedAmount, 
      expectedPayTo,
      payerAddress,
      autoFeedback,
      feedbackRating
    } = req.body;

    if (!txId || !agentAddress || !capability) {
      return res.status(400).json({ error: 'txId, agentAddress, and capability are required' });
    }

    const result = await x402EnhancedService.verifyAndSettlePayment(
      txId,
      {
        agentAddress,
        capability,
        expectedAmount: expectedAmount || '0.001',
        expectedPayTo: expectedPayTo || agentAddress,
        payerAddress
      },
      {
        autoFeedback: autoFeedback !== false, // Default to true
        feedbackRating: feedbackRating || 5
      }
    );

    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * Create high-value escrow
 * POST /api/x402-enhanced/high-value-escrow
 * Body: { payee, amount, description, capability?, payerAddress?, payerPrivateKey? }
 */
router.post('/high-value-escrow', async (req, res, next) => {
  try {
    const { payee, amount, description, capability, payerAddress, payerPrivateKey } = req.body;

    if (!payee || !amount || !description) {
      return res.status(400).json({ error: 'payee, amount, and description are required' });
    }

    const result = await x402EnhancedService.createHighValueEscrow(
      payee,
      amount,
      description,
      { capability, payerAddress, payerPrivateKey }
    );

    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * Auto-settle payment after service completion
 * POST /api/x402-enhanced/auto-settle
 * Body: { txId, agentAddress, capability, payerAddress, amount, serviceResult? }
 */
router.post('/auto-settle', async (req, res, next) => {
  try {
    const { txId, agentAddress, capability, payerAddress, amount, serviceResult } = req.body;

    if (!txId || !agentAddress || !capability || !payerAddress) {
      return res.status(400).json({ 
        error: 'txId, agentAddress, capability, and payerAddress are required' 
      });
    }

    const result = await x402EnhancedService.autoSettleAfterCompletion(
      txId,
      {
        agentAddress,
        capability,
        payerAddress,
        amount: amount || '0.001',
        serviceResult: serviceResult || { success: true }
      }
    );

    res.json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

