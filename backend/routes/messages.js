// routes/messages.js
const express = require('express');
const router = express.Router();
const hederaClient = require('../services/hedera-client');

// Initialize all required HCS topics (creates if missing)
router.post('/topics/initialize', async (req, res, next) => {
  try {
    const topics = {};
    
    // Create/validate all required topics
    topics.AGENT_TOPIC_ID = await hederaClient.ensureTopic('AGENT_TOPIC_ID', 'Agent', 'Agent registration events');
    topics.PAYMENT_TOPIC_ID = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
    topics.A2A_TOPIC_ID = await hederaClient.ensureTopic('A2A_TOPIC_ID', 'A2A', 'Agent-to-agent communication events');
    
    res.json({
      success: true,
      message: 'All HCS topics initialized',
      topics,
      note: 'Add these topic IDs to your .env file to persist them'
    });
  } catch (e) { next(e); }
});

// Create new topic
router.post('/topics', async (req, res, next) => {
  try {
    const { memo } = req.body;
    const topicId = await hederaClient.createTopic(memo || 'Agent messages');
    res.json({ topicId });
  } catch (e) { next(e); }
});

// Submit message to topic
router.post('/topics/:topicId/messages', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const result = await hederaClient.submitMessage(req.params.topicId, message);
    res.json(result);
  } catch (e) { next(e); }
});

// Retrieve topic messages from mirror node
router.get('/topics/:topicId/messages', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const data = await hederaClient.getTopicMessages(req.params.topicId, limit);
    res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
