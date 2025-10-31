// routes/messages.js
const express = require('express');
const router = express.Router();
const hcsService = require('../services/hcs-service');

// Send HCS message
router.post('/', async (req, res) => {
  try {
    const { topicId, message } = req.body;
    const result = await hcsService.sendMessage(topicId, message);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
