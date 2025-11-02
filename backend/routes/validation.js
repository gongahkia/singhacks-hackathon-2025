// routes/validation.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const erc8004Service = require('../services/erc8004-service');
const agentService = require('../services/agent-service');
const hederaClient = require('../services/hedera-client');

/**
 * Request validation for an agent
 * POST /api/validation/request
 * Body: { agentId, validatorAddress, requestUri?, requestHash? }
 */
router.post('/request', async (req, res, next) => {
  try {
    const { agentId, validatorAddress, requestUri, requestHash } = req.body;
    
    if (!agentId || !validatorAddress) {
      return res.status(400).json({ error: 'agentId and validatorAddress are required' });
    }
    
    await erc8004Service.initialize();
    
    if (!erc8004Service.isAvailable()) {
      return res.status(503).json({ error: 'ERC-8004 service not available' });
    }
    
    // Get agent owner wallet
    // Resolve agentId to ERC-8004 ID if needed
    let erc8004AgentId = null;
    if (typeof agentId === 'string' && agentId.startsWith('0x')) {
      const AgentServiceClass = agentService.constructor;
      erc8004AgentId = AgentServiceClass.getERC8004AgentId(agentId);
      if (!erc8004AgentId) {
        return res.status(404).json({ error: `No ERC-8004 agent ID found for ${agentId}` });
      }
    } else {
      erc8004AgentId = parseInt(agentId);
    }
    
    // Get agent owner wallet (for signing validation request)
    const AgentServiceClass = agentService.constructor;
    const agentServiceInstance = new AgentServiceClass();
    agentServiceInstance.ensureWallet();
    
    // Get agent data to determine wallet
    const agentEntry = Array.from(AgentServiceClass.agentIdMapping.entries())
      .find(([id, data]) => data.erc8004AgentId === erc8004AgentId.toString());
    
    let agentOwnerWallet = agentServiceInstance.wallet; // Default to backend wallet
    if (agentEntry && agentEntry[1].paymentMode === 'permissionless' && agentEntry[1].agentWalletAddress) {
      // For permissionless agents, use their wallet
      // In production, agent owner would sign
      agentOwnerWallet = agentServiceInstance.wallet;
    }
    
    const result = await erc8004Service.requestValidation(
      agentOwnerWallet,
      erc8004AgentId,
      validatorAddress,
      requestUri || '',
      requestHash || ethers.ZeroHash
    );
    
    // HCS logging
    const validationTopicId = await hederaClient.ensureTopic('VALIDATION_TOPIC_ID', 'Validation', 'Agent validation events');
    await hederaClient.submitMessage(validationTopicId, JSON.stringify({
      event: 'ValidationRequested',
      agentId: erc8004AgentId,
      validatorAddress: validatorAddress,
      requestHash: result.requestHash,
      txHash: result.txHash,
      timestamp: new Date().toISOString()
    }));
    
    res.json({
      success: true,
      requestHash: result.requestHash,
      agentId: erc8004AgentId,
      validatorAddress: validatorAddress,
      txHash: result.txHash
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Submit validation response
 * POST /api/validation/response
 * Body: { requestHash, response, responseUri?, responseHash?, tag? }
 */
router.post('/response', async (req, res, next) => {
  try {
    const { requestHash, response, responseUri, responseHash, tag } = req.body;
    
    if (!requestHash || response === undefined) {
      return res.status(400).json({ error: 'requestHash and response (0-100) are required' });
    }
    
    if (response < 0 || response > 100) {
      return res.status(400).json({ error: 'response must be between 0-100' });
    }
    
    await erc8004Service.initialize();
    
    if (!erc8004Service.isAvailable()) {
      return res.status(503).json({ error: 'ERC-8004 service not available' });
    }
    
    // Get validator wallet (for signing validation response)
    // In production, this would be the actual validator's wallet
    const AgentServiceClass = agentService.constructor;
    const agentServiceInstance = new AgentServiceClass();
    agentServiceInstance.ensureWallet();
    const validatorWallet = agentServiceInstance.wallet;
    
    // Convert tag to bytes32 if needed
    let tagBytes = tag || ethers.ZeroHash;
    if (typeof tag === 'string' && tag.length > 0 && !tag.startsWith('0x')) {
      tagBytes = ethers.id(tag);
    }
    
    const result = await erc8004Service.submitValidationResponse(
      validatorWallet,
      requestHash,
      response,
      responseUri || '',
      responseHash || ethers.ZeroHash,
      tagBytes
    );
    
    // HCS logging
    const validationTopicId = await hederaClient.ensureTopic('VALIDATION_TOPIC_ID', 'Validation', 'Agent validation events');
    await hederaClient.submitMessage(validationTopicId, JSON.stringify({
      event: 'ValidationResponseSubmitted',
      requestHash: requestHash,
      response: response,
      txHash: result.txHash,
      timestamp: new Date().toISOString()
    }));
    
    res.json({
      success: true,
      requestHash: requestHash,
      response: response,
      txHash: result.txHash
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Get validation status
 * GET /api/validation/status/:requestHash
 */
router.get('/status/:requestHash', async (req, res, next) => {
  try {
    const { requestHash } = req.params;
    
    await erc8004Service.initialize();
    
    if (!erc8004Service.isAvailable()) {
      return res.status(503).json({ error: 'ERC-8004 service not available' });
    }
    
    const status = await erc8004Service.getValidationStatus(requestHash);
    
    res.json({
      requestHash: requestHash,
      validatorAddress: status.validatorAddress,
      agentId: status.agentId.toString(),
      response: status.response,
      responseHash: status.responseHash,
      tag: status.tag,
      lastUpdate: status.lastUpdate.toString()
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Get validation summary for an agent
 * GET /api/validation/summary/:agentId
 * Query params: validatorAddresses, tag
 */
router.get('/summary/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { validatorAddresses, tag } = req.query;
    
    await erc8004Service.initialize();
    
    if (!erc8004Service.isAvailable()) {
      return res.status(503).json({ error: 'ERC-8004 service not available' });
    }
    
    // Resolve agentId to ERC-8004 ID if needed
    let erc8004AgentId = null;
    if (typeof agentId === 'string' && agentId.startsWith('0x')) {
      const AgentServiceClass = agentService.constructor;
      erc8004AgentId = AgentServiceClass.getERC8004AgentId(agentId);
      if (!erc8004AgentId) {
        return res.status(404).json({ error: `No ERC-8004 agent ID found for ${agentId}` });
      }
    } else {
      erc8004AgentId = parseInt(agentId);
    }
    
    const { ethers } = require('ethers');
    
    // Convert tag to bytes32 if needed
    let tagBytes = tag || ethers.ZeroHash;
    if (typeof tag === 'string' && tag.length > 0 && !tag.startsWith('0x')) {
      tagBytes = ethers.id(tag);
    }
    
    const validatorAddrs = validatorAddresses 
      ? (Array.isArray(validatorAddresses) ? validatorAddresses : [validatorAddresses])
      : [];
    
    const summary = await erc8004Service.getValidationSummary(
      erc8004AgentId,
      validatorAddrs,
      tagBytes
    );
    
    res.json({
      agentId: erc8004AgentId,
      count: summary.count,
      averageResponse: summary.avgResponse
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Get all validations for an agent
 * GET /api/validation/agent/:agentId
 */
router.get('/agent/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    
    await erc8004Service.initialize();
    
    if (!erc8004Service.isAvailable()) {
      return res.status(503).json({ error: 'ERC-8004 service not available' });
    }
    
    // Resolve agentId to ERC-8004 ID if needed
    let erc8004AgentId = null;
    if (typeof agentId === 'string' && agentId.startsWith('0x')) {
      const AgentServiceClass = agentService.constructor;
      erc8004AgentId = AgentServiceClass.getERC8004AgentId(agentId);
      if (!erc8004AgentId) {
        return res.status(404).json({ error: `No ERC-8004 agent ID found for ${agentId}` });
      }
    } else {
      erc8004AgentId = parseInt(agentId);
    }
    
    const validations = await erc8004Service.getAgentValidations(erc8004AgentId);
    
    // Fetch details for each validation
    const validationDetails = await Promise.all(
      validations.map(async (requestHash) => {
        try {
          const status = await erc8004Service.getValidationStatus(requestHash);
          return {
            requestHash: requestHash,
            validatorAddress: status.validatorAddress,
            agentId: status.agentId.toString(),
            response: status.response,
            responseHash: status.responseHash,
            tag: status.tag,
            lastUpdate: status.lastUpdate.toString()
          };
        } catch (e) {
          return {
            requestHash: requestHash,
            error: e.message
          };
        }
      })
    );
    
    res.json({
      agentId: erc8004AgentId,
      validations: validationDetails,
      count: validationDetails.length
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

