// routes/reputation.js
const express = require('express');
const router = express.Router();
const reputationService = require('../services/reputation-service');

// Submit reputation feedback
router.post('/feedback', async (req, res, next) => {
  try {
    const { fromAgent, toAgent, rating, comment, paymentTxHash } = req.body;
    if (!fromAgent || !toAgent || !rating) {
      return res.status(400).json({ error: 'fromAgent, toAgent, and rating (1-5) are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const result = await reputationService.submitFeedback(
      fromAgent,
      toAgent,
      rating,
      comment || '',
      paymentTxHash || '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
    res.json(result);
  } catch (e) { next(e); }
});

// Get agent reputation
router.get('/agents/:address/reputation', async (req, res, next) => {
  try {
    const { address } = req.params;
    const reputation = await reputationService.getAgentReputation(address);
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
    
    res.json(hybridTrust);
  } catch (e) { next(e); }
});

module.exports = router;

