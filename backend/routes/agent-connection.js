// routes/agent-connection.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const agentService = require('../services/agent-service');
const paymentService = require('../services/payment-service');
const a2aService = require('../services/a2a-service');

// Get the AgentService class to access static methods
const AgentService = agentService.constructor;

// In-memory store: userWallet -> agentId (in production, use database)
const userAgentConnections = new Map();

// Connect user wallet to agent
router.post('/connect', async (req, res, next) => {
  try {
    const { agentId, userWalletAddress, signature } = req.body;
    
    if (!agentId || !userWalletAddress) {
      return res.status(400).json({ error: 'agentId and userWalletAddress required' });
    }
    
    // Verify signature if provided
    if (signature) {
      const message = `Connect wallet ${userWalletAddress} to agent ${agentId}`;
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== userWalletAddress.toLowerCase()) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }
    
    // Verify agent exists - try by agentId first, then by address if agentId looks like an address
    let agent = null;
    try {
      agent = await agentService.getAgentById(agentId);
    } catch (error) {
      // If agentId is an address format, try direct address lookup
      if (agentId && (agentId.startsWith('0x') || agentId.startsWith('0.0.'))) {
        try {
          agent = await agentService.getAgent(agentId);
        } catch (addrError) {
          return res.status(404).json({ error: `Agent ${agentId} not found (tried both agentId and address lookup)` });
        }
      } else {
        return res.status(404).json({ error: `Agent ${agentId} not found` });
      }
    }
    
    // Store connection
    userAgentConnections.set(userWalletAddress.toLowerCase(), {
      agentId,
      userWallet: userWalletAddress,
      connectedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      agentId,
      userWallet: userWalletAddress,
      connected: true
    });
  } catch (e) { next(e); }
});

// Get connected agent for user wallet
router.get('/user/:walletAddress', async (req, res, next) => {
  try {
    const connection = userAgentConnections.get(req.params.walletAddress.toLowerCase());
    if (!connection) {
      return res.status(404).json({ error: 'No agent connected to this wallet' });
    }
    
    const agent = await agentService.getAgentById(connection.agentId);
    
    res.json({
      ...connection,
      agent
    });
  } catch (e) { next(e); }
});

// Get all wallet connections for an agent
router.get('/agent/:agentId/wallets', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const connectedWallets = [];
    
    // Find all wallets connected to this agent
    for (const [wallet, connection] of userAgentConnections.entries()) {
      if (connection.agentId === agentId) {
        connectedWallets.push({
          wallet: connection.userWallet,
          connectedAt: connection.connectedAt
        });
      }
    }
    
    res.json({
      agentId,
      connectedWallets,
      count: connectedWallets.length
    });
  } catch (e) { next(e); }
});

// Get all agents with their wallet connections
router.get('/connections', async (req, res, next) => {
  try {
    const allConnections = [];
    
    for (const [wallet, connection] of userAgentConnections.entries()) {
      allConnections.push({
        wallet: connection.userWallet,
        agentId: connection.agentId,
        connectedAt: connection.connectedAt
      });
    }
    
    res.json({
      connections: allConnections,
      count: allConnections.length
    });
  } catch (e) { next(e); }
});

// Use agent to pay another agent (user can choose: My Wallet or Agent Wallet)
router.post('/pay-agent', async (req, res, next) => {
  try {
    const { fromAgentId, toAgentId, amount, currency, userWalletAddress, signedPaymentHeader, useAgentWallet } = req.body;
    
    // Get agent details
    const toAgent = await agentService.getAgentById(toAgentId);
    const fromAgent = await agentService.getAgentById(fromAgentId);
    
    if (!fromAgent || !toAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // User explicitly chooses: useAgentWallet = true means use agent's wallet, false means user's wallet
    // Default to false (user's wallet) if not specified
    const useAgentWalletFinal = useAgentWallet === true;
    
    // Debug logging
    console.log(`[pay-agent] fromAgentId: ${fromAgentId}, useAgentWallet: ${useAgentWalletFinal}, userWalletAddress: ${userWalletAddress}`);
    
    let paymentResult = null;
    let fromAddress = null;
    
    if (useAgentWalletFinal) {
      // User chose: Use Agent Wallet
      // Try to get wallet by agentId first, then by address
      let agentWallet = AgentService.getAgentWallet(fromAgentId);
      
      // If not found by agentId, try using the fromAgent's agentWalletAddress or address
      if (!agentWallet && fromAgent) {
        const agentWalletAddress = fromAgent.agentWalletAddress || fromAgent.registeredAddress || fromAgent.address;
        if (agentWalletAddress) {
          // Try lookup by address
          agentWallet = AgentService.getAgentWallet(agentWalletAddress);
          // Also try by agentId if we have it
          if (!agentWallet && fromAgent.agentId) {
            agentWallet = AgentService.getAgentWallet(fromAgent.agentId);
          }
        }
      }
      
      if (!agentWallet) {
        return res.status(400).json({ 
          error: `Agent ${fromAgentId} does not have a wallet. Cannot use agent wallet for payment. ` +
                 `Make sure ALICE_PRIVATE_KEY and BOB_PRIVATE_KEY are set in .env file and server was restarted.`,
          debug: {
            fromAgentId,
            fromAgentAgentId: fromAgent?.agentId,
            fromAgentWalletAddress: fromAgent?.agentWalletAddress,
            hasWalletKeys: AgentService.agentWalletKeys.size > 0,
            walletKeyAgentIds: Array.from(AgentService.agentWalletKeys.keys())
          }
        });
      }
      
      fromAddress = agentWallet.address;
      
      // Use payment service with agent's private key
      const payTo = toAgent.agentWalletAddress || toAgent.registeredAddress || toAgent.address;
      
      console.log(`[pay-agent] Creating payment: ${fromAddress} -> ${payTo}, amount: ${amount} ${currency || 'HBAR'}`);
      console.log(`[pay-agent] Agent wallet address: ${agentWallet.address}, private key present: ${!!agentWallet.privateKey}`);
      
      try {
        paymentResult = await paymentService.createMultiCurrencyEscrow(
          currency || 'HBAR',
          payTo,
          amount,
          `Payment from ${fromAgentId} (agent wallet) to ${toAgentId}`,
          fromAddress,
          agentWallet.privateKey // Agent's private key for signing
        );
        console.log(`[pay-agent] Payment result:`, JSON.stringify(paymentResult, null, 2));
      } catch (paymentError) {
        console.error(`[pay-agent] Payment failed:`, paymentError);
        console.error(`[pay-agent] Error details:`, {
          message: paymentError.message,
          stack: paymentError.stack,
          code: paymentError.code,
          reason: paymentError.reason
        });
        throw paymentError;
      }
      
    } else {
      // User chose: Use My Wallet
      if (!userWalletAddress) {
        return res.status(400).json({ 
          error: 'userWalletAddress required when using your wallet' 
        });
      }
      
      // Verify user is connected to fromAgentId (optional check)
      const connection = userAgentConnections.get(userWalletAddress.toLowerCase());
      if (connection && connection.agentId !== fromAgentId) {
        console.warn(`Wallet ${userWalletAddress} connected to different agent ${connection.agentId}, but proceeding with payment`);
      }
      
      fromAddress = userWalletAddress;
      
      // For user wallet mode, we expect a signed payment header from x402
      if (signedPaymentHeader) {
        // Use x402 facilitator to verify and settle
        const x402Service = require('../services/x402-facilitator-service');
        
        try {
          const payTo = toAgent.agentWalletAddress || toAgent.registeredAddress || toAgent.address;
          
          // If signedPaymentHeader provided, extract txId and verify
          // For full x402, we'd parse the header and use facilitator
          paymentResult = await paymentService.createMultiCurrencyEscrow(
            currency || 'HBAR',
            payTo,
            amount,
            `Payment from ${fromAgentId} (via ${userWalletAddress}) to ${toAgentId}`,
            userWalletAddress,
            null // User signed, not agent
          );
        } catch (x402Error) {
          return res.status(400).json({ 
            error: `x402 payment failed: ${x402Error.message}` 
          });
        }
      } else {
        // Direct payment - user should sign in frontend (or use x402 header)
        return res.status(400).json({ 
          error: 'signedPaymentHeader required when using your wallet. Please sign the payment with your wallet.',
          requiresSignature: true
        });
      }
    }
    
    // Log A2A interaction using agent addresses (not user wallet)
    try {
      const fromAgentAddress = fromAgent.agentWalletAddress || fromAgent.registeredAddress || fromAgent.address;
      const toAgentAddress = toAgent.agentWalletAddress || toAgent.registeredAddress || toAgent.address;
      
      await a2aService.initiateCommunication(
        fromAgentAddress,
        toAgentAddress,
        'payment',
        useAgentWalletFinal ? AgentService.getAgentWallet(fromAgentId)?.privateKey : null
      );
    } catch (a2aError) {
      console.warn('A2A communication logging failed (non-critical):', a2aError.message);
    }
    
    // Ensure response includes escrowId and txHash at top level for compatibility
    res.json({
      success: true,
      payment: paymentResult,
      escrowId: paymentResult?.escrowId,
      txHash: paymentResult?.txHash,
      fromAgent: fromAgentId,
      toAgent: toAgentId,
      useAgentWallet: useAgentWalletFinal,
      fromAddress: fromAddress,
      message: useAgentWalletFinal
        ? `Agent ${fromAgentId} paid ${toAgentId} using agent wallet`
        : `Agent ${fromAgentId} paid ${toAgentId} using your wallet ${userWalletAddress}`
    });
  } catch (e) { next(e); }
});

module.exports = router;

