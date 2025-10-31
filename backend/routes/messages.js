// routes/messages.js
const express = require('express');
const router = express.Router();
const hederaClient = require('../services/hedera-client');

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

module.exports = router;
// Retrieve topic messages from mirror node
router.get('/topics/:topicId/messages', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const data = await hederaClient.getTopicMessages(req.params.topicId, limit);
    res.json(data);
  } catch (e) { next(e); }
});
