// routes/agents.js
const express = require('express');
const router = express.Router();
const agentService = require('../services/agent-service');

// Register a new agent
router.post('/', async (req, res, next) => {
  try {
    const { name, capabilities, metadata } = req.body;
    if (!name || !capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
      return res.status(400).json({ error: 'Name and capabilities array are required' });
    }
    const result = await agentService.registerAgent(name, capabilities, metadata || '');
    res.json(result);
  } catch (e) { next(e); }
});

// Get all agents
router.get('/', async (_req, res, next) => {
  try {
    const agents = await agentService.getAllAgents();
    res.json({ agents, count: agents.length });
  } catch (e) { next(e); }
});

// Search agents by capability
router.get('/search', async (req, res, next) => {
  try {
    const { capability } = req.query;
    if (!capability) return res.status(400).json({ error: 'Capability parameter required' });
    const agents = await agentService.searchAgents(capability);
    res.json({ agents, capability, count: agents.length });
  } catch (e) { next(e); }
});

// Get specific agent
router.get('/:address', async (req, res, next) => {
  try {
    const agent = await agentService.getAgent(req.params.address);
    res.json(agent);
  } catch (e) { next(e); }
});

// Update agent capabilities
router.put('/capabilities', async (req, res, next) => {
  try {
    const { capabilities } = req.body;
    if (!capabilities || !Array.isArray(capabilities)) {
      return res.status(400).json({ error: 'Capabilities array required' });
    }
    const result = await agentService.updateCapabilities(capabilities);
    res.json(result);
  } catch (e) { next(e); }
});

// Get agent reputation
router.get('/:address/reputation', async (req, res, next) => {
  try {
    const reputation = await agentService.getAgentReputation(req.params.address);
    res.json({ reputation, count: reputation.length });
  } catch (e) { next(e); }
});

// Get agent interactions
router.get('/:address/interactions', async (req, res, next) => {
  try {
    const interactions = await agentService.getAgentInteractions(req.params.address);
    res.json({ interactions, count: interactions.length });
  } catch (e) { next(e); }
});

module.exports = router;
