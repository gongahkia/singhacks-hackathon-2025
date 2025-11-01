// routes/ai.js
const express = require('express');
const router = express.Router();
const groqService = require('../services/groq-service');

// POST /api/ai/chat - Chat with Groq AI
router.post('/chat', async (req, res) => {
  try {
    const { input, availableAgents } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Input is required and must be a string'
      });
    }

    // If availableAgents provided, use searchAgents method
    if (availableAgents && Array.isArray(availableAgents) && availableAgents.length > 0) {
      const result = await groqService.searchAgents(input, availableAgents);
      // Format result to match chat response format
      return res.json({
        success: true,
        data: {
          message: result.message || `Found ${result.matchedAgents?.length || 0} agents matching your query.`,
          reasoning: result.reasoning || [],
          breakpoints: result.breakpoints || [],
          matchedAgents: result.matchedAgents || [],
          action: result.action || { type: "show_agents", payload: {} }
        }
      });
    }

    const result = await groqService.chat(input);
    res.json(result);
  } catch (error) {
    console.error('Groq chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ai/search-agents - AI-powered agent search
router.post('/search-agents', async (req, res, next) => {
  try {
    const { query, availableAgents } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    if (!availableAgents || !Array.isArray(availableAgents)) {
      return res.status(400).json({
        success: false,
        error: 'availableAgents is required and must be an array'
      });
    }

    const result = await groqService.searchAgents(query, availableAgents);
    
    res.json(result);
  } catch (error) {
    console.error('AI search error:', error);
    next(error);
  }
});

// POST /api/ai/analyze-transaction - AI transaction analysis
router.post('/analyze-transaction', async (req, res, next) => {
  try {
    const { steps } = req.body;
    
    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'Transaction steps are required'
      });
    }

    const analysis = await groqService.chat(
      `Analyze this transaction flow and provide insights: ${JSON.stringify(steps)}`,
      'You are a blockchain transaction analyst. Provide concise insights about transaction speed, trust score changes, and potential optimizations.'
    );
    
    res.json({ 
      insights: analysis.data?.message || analysis.raw 
    });
  } catch (error) {
    console.error('Transaction analysis error:', error);
    next(error);
  }
});

// POST /api/ai/suggest-capabilities - AI capability suggestions
router.post('/suggest-capabilities', async (req, res, next) => {
  try {
    const { description } = req.body;
    
    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Agent description is required'
      });
    }

    const result = await groqService.chat(
      `Based on this agent description: "${description}", suggest 3-5 relevant capabilities. Return ONLY a JSON array of strings, no other text. Example: ["capability1", "capability2", "capability3"]`,
      'You analyze agent descriptions and suggest capabilities. Return ONLY a valid JSON array of strings, no explanation or other text.'
    );
    
    // Parse suggestions from the response
    let suggestions = [];
    if (result.data && result.data.message) {
      const message = result.data.message;
      // Try to extract JSON array from the message
      const jsonMatch = message.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          suggestions = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(suggestions)) {
            suggestions = [];
          }
        } catch (parseError) {
          // If parsing fails, try to extract capabilities from text
          const lines = message.split('\n').filter(line => line.trim());
          suggestions = lines
            .map(line => line.replace(/^[-*•]\s*/, '').replace(/"/g, '').trim())
            .filter(cap => cap.length > 0)
            .slice(0, 5);
        }
      } else {
        // Fallback: extract from text lines
        const lines = message.split('\n').filter(line => line.trim());
        suggestions = lines
          .map(line => line.replace(/^[-*•]\s*/, '').replace(/"/g, '').trim())
          .filter(cap => cap.length > 0 && !cap.toLowerCase().includes('example'))
          .slice(0, 5);
      }
    }
    
    // Ensure we return at least some suggestions
    if (suggestions.length === 0) {
      suggestions = ['data-analysis', 'automation', 'blockchain'];
    }
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Capability suggestion error:', error);
    next(error);
  }
});

// POST /api/ai/reinitialize - Reinitialize Groq client (after settings update)
router.post('/reinitialize', (req, res) => {
  try {
    groqService.reinitialize();
    res.json({
      success: true,
      message: 'Groq client reinitialized',
      configured: groqService.isConfigured()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/ai/status - Check Groq configuration status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: groqService.isConfigured()
  });
});

module.exports = router;
