// routes/agents.js
const express = require('express');
const router = express.Router();
const agentService = require('../services/agent-service');

// Register a new agent (traditional - requires wallet)
router.post('/', async (req, res, next) => {
  try {
    const { name, capabilities, metadata, signedTx } = req.body;
    if (!name || !capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
      return res.status(400).json({ error: 'Name and capabilities array are required' });
    }
    // Phase 2: If signedTx provided, use signed transaction (production mode)
    // Otherwise use backend wallet (backward compatibility)
    const result = await agentService.registerAgent(name, capabilities, metadata || '', signedTx || null);
    res.json(result);
  } catch (e) { next(e); }
});

// Register agent without wallet (walletless registration)
router.post('/register-agent', async (req, res, next) => {
  try {
    const { agentId, name, capabilities, metadata, paymentMode, agentPrivateKey } = req.body;
    
    if (!name || !capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
      return res.status(400).json({ error: 'Name and capabilities array are required' });
    }
    
    // Validate paymentMode
    const validPaymentMode = paymentMode === 'permissionless' ? 'permissionless' : 'permissioned';
    
    // Generate unique agent ID if not provided
    const uniqueAgentId = agentId || `agent-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    // Register using service wallet
    const result = await agentService.registerAgentWithoutWallet(
      uniqueAgentId,
      name,
      capabilities,
      metadata || '',
      null, // signedTx
      validPaymentMode,
      agentPrivateKey || null
    );
    
    res.json({
      success: true,
      agentId: uniqueAgentId,
      name,
      capabilities,
      registeredAddress: result.agentAddress,
      paymentMode: result.paymentMode,
      agentWalletAddress: result.agentWalletAddress,
      ...result
    });
  } catch (e) { 
    if (e.message && e.message.includes('Already registered')) {
      return res.status(400).json({ error: e.message });
    }
    next(e); 
  }
});

// Get agent by ID
router.get('/by-id/:agentId', async (req, res, next) => {
  try {
    const agent = await agentService.getAgentById(req.params.agentId);
    res.json(agent);
  } catch (e) { 
    if (e.message && e.message.includes('not found')) {
      return res.status(404).json({ error: e.message });
    }
    next(e); 
  }
});

// Get all agents (including walletless/seeded agents)
router.get('/', async (_req, res, next) => {
  try {
    // Use getAllAgentsWithIds to include agents from agentIdMapping
    const agents = await agentService.getAllAgentsWithIds();
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

// Get HCS messages for agent
router.get('/:address/hcs-messages', async (req, res, next) => {
  try {
    const { address } = req.params;
    const hederaClient = require('../services/hedera-client');
    
    // Get all relevant topic IDs
    const topics = [
      { id: process.env.PAYMENT_TOPIC_ID, name: 'Payment' },
      { id: process.env.A2A_TOPIC_ID, name: 'A2A' },
      { id: process.env.AGENT_TOPIC_ID, name: 'Agent' },
      { id: process.env.REPUTATION_TOPIC_ID, name: 'Reputation' },
      { id: process.env.MCP_TOPIC_ID, name: 'MCP' }
    ].filter(t => t.id && !t.id.includes('xxxxx') && t.id !== '0.0.0');
    
    // Fetch messages from all topics
    const allMessages = [];
    for (const topic of topics) {
      try {
        const response = await hederaClient.getTopicMessages(topic.id, 100);
        if (response.messages) {
          allMessages.push(...response.messages.map(m => ({
            ...m,
            topicName: topic.name,
            topicId: topic.id
          })));
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${topic.name} topic:`, error.message);
      }
    }
    
    // Parse and filter messages related to this agent
    const agentMessages = [];
    for (const msg of allMessages) {
      try {
        const parsed = typeof msg.message === 'string' ? JSON.parse(Buffer.from(msg.message, 'base64').toString()) : msg.message;
        
        // Check if message involves this agent
        if (
          parsed.fromAgent === address ||
          parsed.toAgent === address ||
          parsed.payer === address ||
          parsed.payee === address ||
          parsed.agent1 === address ||
          parsed.agent2 === address
        ) {
          agentMessages.push({
            event: parsed.event,
            timestamp: parsed.timestamp,
            details: parsed,
            consensusTimestamp: msg.consensus_timestamp,
            topicName: msg.topicName
          });
        }
      } catch (parseError) {
        // Skip unparseable messages
      }
    }
    
    // Sort by timestamp (newest first)
    agentMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.consensusTimestamp).getTime();
      const timeB = new Date(b.timestamp || b.consensusTimestamp).getTime();
      return timeB - timeA;
    });
    
    res.json({ 
      messages: agentMessages.slice(0, 50), // Last 50 messages
      count: agentMessages.length 
    });
  } catch (error) {
    console.error('HCS messages fetch error:', error);
    next(error);
  }
});

module.exports = router;
