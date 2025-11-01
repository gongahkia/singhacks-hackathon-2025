// services/x402-facilitator-service.js
const axios = require('axios');

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402-hedera-production.up.railway.app';

// Default facilitator account ID (fee payer)
const DEFAULT_FACILITATOR_ACCOUNT_ID = process.env.X402_FACILITATOR_ACCOUNT_ID || '0.0.2961788';

class X402FacilitatorService {
  /**
   * Create payment challenge (402 Payment Required)
   * @param {string|number} amount - Payment amount
   * @param {string} asset - Asset type ('HBAR' or token address)
   * @param {string} payTo - Recipient account ID
   * @param {string} memo - Payment memo/description
   * @param {string} network - Network identifier (default: 'hedera-testnet')
   * @returns {Object} x402 challenge object
   */
  async createChallenge(amount, asset, payTo, memo, network = 'hedera-testnet') {
    return {
      x402Version: 1,
      error: 'Payment required to access agent service',
      accepts: [{
        scheme: 'exact',
        network: network,
        maxAmountRequired: amount.toString(),
        asset: asset, // 'HBAR' or token address
        payTo: payTo,
        resource: memo,
        description: `Payment for agent service: ${memo}`,
        maxTimeoutSeconds: 300,
        extra: {
          feePayer: DEFAULT_FACILITATOR_ACCOUNT_ID
        }
      }]
    };
  }

  /**
   * Verify payment via facilitator
   * @param {string} txId - Transaction ID
   * @param {string|number} expectedAmount - Expected payment amount
   * @param {string} expectedPayTo - Expected recipient account
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(txId, expectedAmount, expectedPayTo) {
    try {
      const response = await axios.post(`${FACILITATOR_URL}/verify`, {
        txId,
        expectedAmount,
        expectedPayTo,
        network: 'hedera-testnet'
      }, {
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Payment verification failed: ${error.response.data?.error || error.message}`);
      }
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Settle payment via facilitator
   * @param {Object} authorization - Payment authorization object
   * @returns {Promise<Object>} Settlement result
   */
  async settlePayment(authorization) {
    try {
      const response = await axios.post(`${FACILITATOR_URL}/settle`, {
        authorization,
        network: 'hedera-testnet'
      }, {
        timeout: 15000 // 15 second timeout
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Payment settlement failed: ${error.response.data?.error || error.message}`);
      }
      throw new Error(`Payment settlement failed: ${error.message}`);
    }
  }

  /**
   * Get facilitator status
   * @returns {Promise<Object>} Facilitator status
   */
  async getStatus() {
    try {
      const response = await axios.get(`${FACILITATOR_URL}/health`, {
        timeout: 5000
      });
      return {
        available: true,
        ...response.data
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = new X402FacilitatorService();

