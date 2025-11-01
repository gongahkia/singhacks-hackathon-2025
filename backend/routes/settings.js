// routes/settings.js
const express = require('express');
const router = express.Router();
const configService = require('../services/config-service');

// GET /api/settings - Get current configuration (masked)
router.get('/', (req, res) => {
  try {
    const config = configService.getMaskedConfig();
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/settings - Update configuration
router.post('/', (req, res) => {
  try {
    const newConfig = req.body;

    // Validate required fields if needed
    if (newConfig.EVM_PRIVATE_KEY && !newConfig.EVM_PRIVATE_KEY.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'EVM_PRIVATE_KEY must start with 0x'
      });
    }

    configService.saveConfig(newConfig);

    res.json({
      success: true,
      message: 'Configuration saved successfully',
      config: configService.getMaskedConfig()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/settings/schema - Get the expected configuration schema
router.get('/schema', (req, res) => {
  res.json({
    success: true,
    schema: {
      RPC_URL: {
        type: 'string',
        description: 'Hedera JSON-RPC URL',
        example: 'https://testnet.hashio.io/api',
        required: true
      },
      EVM_PRIVATE_KEY: {
        type: 'string',
        description: 'EVM Private Key (hex format starting with 0x)',
        example: '0x1234...',
        required: true,
        sensitive: true
      },
      HEDERA_NETWORK: {
        type: 'string',
        description: 'Hedera Network (testnet or mainnet)',
        example: 'testnet',
        required: false
      },
      OPERATOR_ACCOUNT_ID: {
        type: 'string',
        description: 'Hedera Operator Account ID',
        example: '0.0.12345',
        required: false
      },
      OPERATOR_KEY: {
        type: 'string',
        description: 'Hedera Operator Private Key',
        example: '302e020100300506032b657004220420...',
        required: false,
        sensitive: true
      },
      PAYMENT_PROCESSOR_ADDRESS: {
        type: 'string',
        description: 'Payment Processor Contract Address',
        example: '0x1234...',
        required: false
      },
      PAYMENT_TOPIC_ID: {
        type: 'string',
        description: 'Hedera Topic ID for payment events',
        example: '0.0.12345',
        required: false
      },
      TRUST_REGISTRY_ADDRESS: {
        type: 'string',
        description: 'Trust Registry Contract Address',
        example: '0x1234...',
        required: false
      }
    }
  });
});

module.exports = router;
