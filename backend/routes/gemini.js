// routes/gemini.js
const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini-service');

// POST /api/gemini/chat - Chat with Gemini AI
router.post('/chat', async (req, res) => {
  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Input is required and must be a string'
      });
    }

    const result = await geminiService.chat(input);
    res.json(result);
  } catch (error) {
    console.error('Gemini chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/gemini/reinitialize - Reinitialize Gemini client (after settings update)
router.post('/reinitialize', (req, res) => {
  try {
    geminiService.reinitialize();
    res.json({
      success: true,
      message: 'Gemini client reinitialized',
      configured: geminiService.isConfigured()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/gemini/status - Check Gemini configuration status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: geminiService.isConfigured()
  });
});

module.exports = router;
