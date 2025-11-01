// routes/payments.js
const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment-service');

// Create escrow payment
router.post('/', async (req, res, next) => {
  try {
    const { payee, amount, description, payer, payerPrivateKey, signedTx, expirationDays } = req.body;
    if (!payee || !amount || !description) {
      return res.status(400).json({ error: 'Payee, amount, and description are required' });
    }
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    
    // Phase 1 (Demo): If payer and payerPrivateKey provided, use agent wallet
    // Phase 2 (Production): If signedTx provided, use signed transaction
    const result = await paymentService.createEscrow(
      payee, 
      amount, 
      description,
      payer || null,        // Agent address (optional)
      payerPrivateKey || null, // Agent private key (optional, DEMO ONLY)
      signedTx || null,     // Signed transaction (optional, Phase 2)
      expirationDays || 0
    );
    res.json(result);
  } catch (e) { next(e); }
});

// Release escrow
router.post('/:escrowId/release', async (req, res, next) => {
  try {
    const { releaser, releaserPrivateKey } = req.body;
    // Phase 1 (Demo): If releaser and releaserPrivateKey provided, use agent wallet
    const result = await paymentService.releaseEscrow(
      req.params.escrowId,
      releaser || null,
      releaserPrivateKey || null
    );
    res.json(result);
  } catch (e) { next(e); }
});

// Refund escrow
router.post('/:escrowId/refund', async (req, res, next) => {
  try {
    const result = await paymentService.refundEscrow(req.params.escrowId);
    res.json(result);
  } catch (e) { next(e); }
});

// Get escrow details
router.get('/:escrowId', async (req, res, next) => {
  try {
    const escrow = await paymentService.getEscrow(req.params.escrowId);
    res.json(escrow);
  } catch (e) { next(e); }
});

// Get payer's escrows
router.get('/payer/:address', async (req, res, next) => {
  try {
    const escrows = await paymentService.getPayerEscrows(req.params.address);
    res.json({ escrows, count: escrows.length });
  } catch (e) { next(e); }
});

module.exports = router;
