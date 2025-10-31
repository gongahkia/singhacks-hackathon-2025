// routes/auth.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

router.post('/verify-signature', async (req, res) => {
  const { accountId, evmAddress, message, signature } = req.body;
  if (!message || !signature) return res.status(400).json({ error: 'message and signature required' });

  try {
    const recovered = ethers.verifyMessage(JSON.stringify(message), signature);
    if (evmAddress && recovered.toLowerCase() !== evmAddress.toLowerCase()) {
      return res.status(400).json({ verified: false, error: 'address mismatch' });
    }

    return res.json({ verified: true, recovered, accountId });
  } catch (e) {
    return res.status(400).json({ verified: false, error: e.message });
  }
});

module.exports = router;
