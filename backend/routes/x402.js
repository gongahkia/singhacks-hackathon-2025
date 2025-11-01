// routes/x402.js
const express = require('express');
const router = express.Router();
const hederaClient = require('../services/hedera-client');

// Issue 402 challenge
router.post('/challenge', async (req, res) => {
  const { amountHbar, memo } = req.body;
  const challenge = {
    status: 402,
    payment: {
      network: process.env.HEDERA_NETWORK || 'testnet',
      asset: 'HBAR',
      amount: amountHbar,
      memo: memo || 'x402-payment',
      payTo: process.env.HEDERA_ACCOUNT_ID || '0.0.0',
    }
  };
  res.status(402).json(challenge);
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
