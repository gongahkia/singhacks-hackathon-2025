// routes/agents.js
const express = require('express');
const router = express.Router();
const agentService = require('../services/agent-service');

// Register agent
router.post('/', async (req, res) => {
  try {
    const agent = await agentService.registerAgent(req.body);
    res.status(201).json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all agents
router.get('/', async (req, res) => {
  try {
    const agents = await agentService.listAgents();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search agents by capability
router.get('/search', async (req, res) => {
  try {
    const { capability } = req.query;
    const agents = await agentService.searchAgents(capability);
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
