// routes/auth.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

router.post('/verify-signature', async (req, res) => {
  const { accountId, evmAddress, message, signature } = req.body;
  if (!message || !signature) return res.status(400).json({ error: 'message and signature required' });

  try {
    // Reconstruct the exact message string that was signed
    const messageString = JSON.stringify(message);
    const recovered = ethers.verifyMessage(messageString, signature);
    
    // Check against message.address first (if included), then evmAddress parameter
    const expectedAddress = message.address || evmAddress;
    
    if (expectedAddress && recovered.toLowerCase() !== expectedAddress.toLowerCase()) {
      return res.status(400).json({ 
        verified: false, 
        error: 'address mismatch',
        details: {
          recovered: recovered,
          expected: expectedAddress
        }
      });
    }

    return res.json({ verified: true, recovered, accountId, evmAddress: recovered });
  } catch (e) {
    return res.status(400).json({ verified: false, error: e.message });
  }
});

module.exports = router;
