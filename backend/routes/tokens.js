// routes/tokens.js
const express = require('express');
const router = express.Router();
const tokenService = require('../services/token-service');

// GET balances (HBAR + token)
router.get('/:accountId/balances/:tokenId', async (req, res, next) => {
  try {
    const result = await tokenService.getBalances(req.params.accountId, req.params.tokenId);
    res.json(result);
  } catch (e) { next(e); }
});

// POST transfer fungible token
router.post('/transfer', async (req, res, next) => {
  try {
    const { tokenId, fromId, fromKey, toId, amount } = req.body;
    if (!tokenId || !fromId || !fromKey || !toId || !amount) {
      return res.status(400).json({ error: 'tokenId, fromId, fromKey, toId, amount required' });
    }
    const result = await tokenService.transferToken(tokenId, fromId, fromKey, toId, Number(amount));
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
