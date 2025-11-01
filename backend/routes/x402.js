// routes/x402.js
const express = require('express');
const router = express.Router();
const hederaClient = require('../services/hedera-client');
const x402Service = require('../services/x402-facilitator-service');

// Issue 402 challenge - Get payment requirements
router.post('/challenge', async (req, res) => {
  try {
    const { amount, currency, payTo, memo } = req.body;
    
    if (!amount || !payTo) {
      return res.status(400).json({ error: 'amount and payTo are required' });
    }
    
    const asset = currency === 'USDC' ? (process.env.USDC_TOKEN_ID || '0.0.429274') : 'HBAR';
    const network = process.env.HEDERA_NETWORK || 'hedera-testnet';
    
    const challenge = await x402Service.createChallenge(
      amount,
      asset,
      payTo,
      memo || 'Agent payment',
      network
    );
    
    res.status(402).json(challenge);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Verify settlement via mirror node
router.post('/verify', async (req, res, next) => {
  try {
    const { txId, expectedAmount, expectedPayTo } = req.body;
    if (!txId) return res.status(400).json({ error: 'txId required' });

    const tx = await hederaClient.getTransaction(txId);
    const success = (tx.result === 'SUCCESS') || (tx.status === 'SUCCESS');
    if (!success) return res.status(400).json({ error: 'Settlement not found or failed' });

    // Optional: validate recipient and amount from transfers
    if (expectedPayTo && expectedAmount) {
      const transfers = tx.transfers || [];
      const match = transfers.find(t => t.account === expectedPayTo && parseFloat(t.amount) >= parseFloat(expectedAmount));
      if (!match) {
        return res.status(400).json({ error: 'Payment amount or recipient mismatch', expected: { payTo: expectedPayTo, amount: expectedAmount } });
      }
    }

    return res.json({ verified: true, tx });
  } catch (e) { next(e); }
});

module.exports = router;
