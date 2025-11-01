// routes/transactions.js
// Phase 2: Endpoints for handling signed transactions
const express = require('express');
const router = express.Router();
const transactionService = require('../services/transaction-service');

// Prepare transaction request (for frontend to sign)
router.post('/prepare', async (req, res, next) => {
  try {
    const { to, data, value, from } = req.body;
    
    if (!to || !data) {
      return res.status(400).json({ error: 'to and data are required' });
    }

    const txRequest = await transactionService.prepareTransactionRequest({
      to,
      data,
      value: value ? BigInt(value) : undefined,
      from,
    });

    res.json(txRequest);
  } catch (e) {
    next(e);
  }
});

// Send a signed transaction
router.post('/send', async (req, res, next) => {
  try {
    const { signedTx } = req.body;
    
    if (!signedTx) {
      return res.status(400).json({ error: 'signedTx is required' });
    }

    const result = await transactionService.sendSignedTransaction(signedTx);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Verify a transaction signature
router.post('/verify', async (req, res, next) => {
  try {
    const { txRequest, signature } = req.body;
    
    if (!txRequest || !signature) {
      return res.status(400).json({ error: 'txRequest and signature are required' });
    }

    const result = await transactionService.verifyTransactionSignature(txRequest, signature);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

