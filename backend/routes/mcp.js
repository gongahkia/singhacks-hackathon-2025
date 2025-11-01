// routes/mcp.js
const express = require('express');
const router = express.Router();
const a2aService = require('../services/a2a-service');
const hederaClient = require('../services/hedera-client');

// MCP message endpoint
router.post('/messages', async (req, res, next) => {
  try {
    const { fromAgent, toAgent, capability, message } = req.body;
    
    if (!fromAgent || !toAgent || !capability) {
      return res.status(400).json({ 
        error: 'fromAgent, toAgent, and capability are required' 
      });
    }
    
    const result = await a2aService.initiateMCPCommunication(
      fromAgent,
      toAgent,
      capability,
      message || 'MCP communication request'
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get MCP messages for agent
router.get('/agents/:address/messages', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    const mcpTopicId = process.env.MCP_TOPIC_ID;
    if (!mcpTopicId) {
      return res.json({ messages: [] });
    }

    const messages = await hederaClient.getTopicMessages(mcpTopicId);
    const agentMessages = messages.filter(
      msg => msg.from === address || msg.to === address
    );

    res.json({ messages: agentMessages });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

