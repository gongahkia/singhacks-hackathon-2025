// routes/a2a.js
const express = require('express');
const router = express.Router();
const a2aService = require('../services/a2a-service');

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

module.exports = router;

