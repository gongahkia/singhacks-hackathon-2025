// routes/unified-agents.js
// Unified agent discovery routes with multi-criteria search
const express = require('express');
const router = express.Router();
const unifiedAgentService = require('../services/unified-agent-service');

/**
 * Get unified agent data (combines ERC-8004 + reputation + validation)
 * GET /api/unified-agents/:identifier
 * Query params: includeReputation, includeValidation, includeERC8004, includeDetailedReputation
 */
router.get('/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const { 
      includeReputation, 
      includeValidation, 
      includeERC8004,
      includeDetailedReputation 
    } = req.query;

    const options = {
      includeReputation: includeReputation !== 'false',
      includeValidation: includeValidation !== 'false',
      includeERC8004: includeERC8004 !== 'false',
      includeDetailedReputation: includeDetailedReputation === 'true'
    };

    const agent = await unifiedAgentService.getUnifiedAgent(identifier, options);

    if (!agent) {
      return res.status(404).json({ error: `Agent ${identifier} not found` });
    }

    res.json(agent);
  } catch (e) {
    next(e);
  }
});

/**
 * Enhanced agent discovery with multi-criteria search
 * POST /api/unified-agents/discover
 * Body: { capabilities, minTrustScore, maxTrustScore, validatedOnly, minValidationScore, paymentMode, query, limit }
 */
router.post('/discover', async (req, res, next) => {
  try {
    const {
      capabilities,
      minTrustScore,
      maxTrustScore,
      validatedOnly,
      minValidationScore,
      paymentMode,
      query,
      limit
    } = req.body;

    const criteria = {
      capabilities: Array.isArray(capabilities) ? capabilities : (capabilities ? [capabilities] : []),
      minTrustScore: minTrustScore !== undefined ? parseInt(minTrustScore) : undefined,
      maxTrustScore: maxTrustScore !== undefined ? parseInt(maxTrustScore) : undefined,
      validatedOnly: validatedOnly === true || validatedOnly === 'true',
      minValidationScore: minValidationScore !== undefined ? parseInt(minValidationScore) : undefined,
      paymentMode: paymentMode || undefined,
      query: query || undefined,
      limit: limit !== undefined ? parseInt(limit) : undefined
    };

    const agents = await unifiedAgentService.discoverAgents(criteria);

    res.json({
      agents,
      count: agents.length,
      criteria
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Get agent recommendations
 * POST /api/unified-agents/recommendations
 * Body: { capabilities, minTrustScore, validatedOnly, limit? }
 */
router.post('/recommendations', async (req, res, next) => {
  try {
    const {
      capabilities,
      minTrustScore,
      validatedOnly,
      limit
    } = req.body;

    const criteria = {
      capabilities: Array.isArray(capabilities) ? capabilities : (capabilities ? [capabilities] : []),
      minTrustScore: minTrustScore !== undefined ? parseInt(minTrustScore) : undefined,
      validatedOnly: validatedOnly === true || validatedOnly === 'true'
    };

    const recommendations = await unifiedAgentService.getRecommendations(
      criteria,
      limit !== undefined ? parseInt(limit) : 5
    );

    res.json({
      recommendations,
      count: recommendations.length,
      criteria
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Clear cache (admin endpoint)
 * POST /api/unified-agents/cache/clear
 * Query params: key (optional - clear specific key or all)
 */
router.post('/cache/clear', async (req, res, next) => {
  try {
    const { key } = req.query;
    
    unifiedAgentService.clearCache(key || null);
    
    res.json({
      success: true,
      message: key ? `Cache cleared for key: ${key}` : 'All cache cleared'
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

