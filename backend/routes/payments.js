// routes/payments.js
const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment-service');

// Create escrow
router.post('/', async (req, res) => {
  try {
    const escrow = await paymentService.createEscrow(req.body);
    res.status(201).json(escrow);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Release escrow
router.post('/:id/release', async (req, res) => {
  try {
    const result = await paymentService.releaseEscrow(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
