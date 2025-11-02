// routes/reputation.js
const express = require('express');
const router = express.Router();
const reputationService = require('../services/reputation-service');

// Submit reputation feedback (ERC-8004 ReputationRegistry)
router.post('/feedback', async (req, res, next) => {
  try {
    const { fromAgent, toAgent, rating, comment, paymentTxHash, tag1, tag2, feedbackUri } = req.body;
    if (!fromAgent || !toAgent || !rating) {
      return res.status(400).json({ error: 'fromAgent, toAgent, and rating (1-5 or 0-100) are required' });
    }
    if ((rating < 1 || rating > 5) && (rating < 0 || rating > 100)) {
      return res.status(400).json({ error: 'Rating must be between 1-5 or 0-100' });
    }
    const options = {};
    if (tag1) options.tag1 = tag1;
    if (tag2) options.tag2 = tag2;
    if (feedbackUri) options.feedbackUri = feedbackUri;
    
    const result = await reputationService.submitFeedback(
      fromAgent,
      toAgent,
      rating,
      comment || '',
      paymentTxHash || null,
      options
    );
    res.json(result);
  } catch (e) { next(e); }
});

// Get agent reputation (ERC-8004 ReputationRegistry)
router.get('/agents/:address/reputation', async (req, res, next) => {
  try {
    const { address } = req.params;
    const { clientAddresses, tag1, tag2, includeRevoked } = req.query;
    
    const options = {};
    if (clientAddresses) {
      options.clientAddresses = Array.isArray(clientAddresses) ? clientAddresses : [clientAddresses];
    }
    if (tag1) options.tag1 = tag1;
    if (tag2) options.tag2 = tag2;
    if (includeRevoked !== undefined) {
      options.includeRevoked = includeRevoked === 'true';
    }
    
    const reputation = await reputationService.getAgentReputation(address, options);
    res.json({ reputation, count: reputation.length });
  } catch (e) { next(e); }
});

// Establish trust from payment (called automatically on escrow release)
router.post('/trust/payment', async (req, res, next) => {
  try {
    const { agent1, agent2, transactionHash } = req.body;
    if (!agent1 || !agent2 || !transactionHash) {
      return res.status(400).json({ error: 'agent1, agent2, and transactionHash are required' });
    }
    const result = await reputationService.establishTrustFromPayment(agent1, agent2, transactionHash);
    res.json(result);
  } catch (e) { next(e); }
});

// Get hybrid trust score (custom + ERC-8004)
router.get('/agents/:address/hybrid-trust', async (req, res, next) => {
  try {
    const { address } = req.params;
    const { officialAgentId } = req.query;
    
    // If not provided, try to auto-fetch from mapping
    let erc8004Id = officialAgentId ? parseInt(officialAgentId) : null;
    if (!erc8004Id) {
      const agentService = require('../services/agent-service');
      const mappedId = agentService.constructor.getERC8004AgentId(address);
      erc8004Id = mappedId ? parseInt(mappedId) : null;
    }
    
    const hybridTrust = await reputationService.getHybridTrustScore(
      address,
      erc8004Id
    );
    
    // Ensure response always has the required structure
    if (!hybridTrust || typeof hybridTrust !== 'object') {
      return res.json({
        final: 0,
        hybrid: 0,
        custom: 0,
        official: 0,
        officialFeedbackCount: 0,
        weights: {
          custom: 0,
          official: 0,
          transactionSuccess: 0,
          paymentCompletion: 0
        },
        breakdown: {
          erc8004: { score: 0, count: 0, weight: 0, available: false },
          custom: { score: 0, weight: 0, source: 'Error - invalid response' },
          transactionSuccess: { rate: 0, successful: 0, total: 0, weight: 0 },
          paymentCompletion: { rate: 0, completed: 0, total: 0, weight: 0 }
        }
      });
    }
    
    res.json(hybridTrust);
  } catch (e) {
    // Return safe fallback instead of 500 error
    console.error('Error in hybrid-trust endpoint:', e.message);
    res.json({
      final: 0,
      hybrid: 0,
      custom: 0,
      official: 0,
      officialFeedbackCount: 0,
      weights: {
        custom: 0,
        official: 0,
        transactionSuccess: 0,
        paymentCompletion: 0
      },
      breakdown: {
        erc8004: { score: 0, count: 0, weight: 0, available: false },
        custom: { score: 0, weight: 0, source: 'Error - exception' },
        transactionSuccess: { rate: 0, successful: 0, total: 0, weight: 0 },
        paymentCompletion: { rate: 0, completed: 0, total: 0, weight: 0 }
      },
      error: e.message
    });
  }
});

module.exports = router;

