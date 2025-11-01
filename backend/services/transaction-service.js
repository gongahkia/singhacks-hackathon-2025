// services/transaction-service.js
// Phase 2: Handle signed transactions from user wallets (no private keys required)

const { ethers } = require('ethers');

class TransactionService {
  constructor() {
    this.provider = null;
  }

  ensureProvider() {
    if (this.provider) return;
    const { RPC_URL } = process.env;
    if (!RPC_URL) throw new Error('RPC_URL not set');
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  /**
   * Verify a signed transaction and send it to the network
   * @param {string} signedTx - Hex-encoded signed transaction
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendSignedTransaction(signedTx) {
    this.ensureProvider();
    
    if (!signedTx || !signedTx.startsWith('0x')) {
      throw new Error('Invalid signed transaction format. Expected hex string starting with 0x');
    }

    try {
      // Send the signed transaction to the network
      const txResponse = await this.provider.broadcastTransaction(signedTx);
      
      // Wait for the transaction to be mined
      const receipt = await txResponse.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      throw new Error(`Failed to send signed transaction: ${error.message}`);
    }
  }

  /**
   * Prepare a transaction request (for frontend to sign)
   * This creates the transaction object that needs to be signed
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction request object
   */
  async prepareTransactionRequest(params) {
    this.ensureProvider();
    
    const {
      to,
      data,
      value,
      from, // Optional - for nonce estimation
    } = params;

    if (!to) throw new Error('Transaction recipient (to) is required');
    if (!data) throw new Error('Transaction data is required');

    // Get current gas price
    const feeData = await this.provider.getFeeData();
    
    // Estimate gas if from address is provided
    let gasLimit = 300000n; // Default
    if (from) {
      try {
        gasLimit = await this.provider.estimateGas({
          from,
          to,
          data,
          value: value || 0n
        });
        // Add 20% buffer
        gasLimit = (gasLimit * 120n) / 100n;
      } catch (error) {
        console.warn('Gas estimation failed, using default:', error.message);
      }
    }

    // Get nonce if from address is provided
    let nonce = undefined;
    if (from) {
      try {
        nonce = await this.provider.getTransactionCount(from, 'pending');
      } catch (error) {
        console.warn('Nonce fetch failed:', error.message);
      }
    }

    // Get chain ID
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    return {
      to,
      data,
      value: value ? value.toString() : '0',
      gasLimit: gasLimit.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
      nonce: nonce !== undefined ? nonce.toString() : undefined,
      chainId: chainId.toString(),
      type: '2' // EIP-1559
    };
  }

  /**
   * Verify a transaction signature without sending
   * @param {Object} txRequest - Transaction request
   * @param {string} signature - Signed transaction hex
   * @returns {Promise<Object>} Verification result with recovered address
   */
  async verifyTransactionSignature(txRequest, signature) {
    this.ensureProvider();
    
    try {
      // Parse and verify the signed transaction
      const parsedTx = ethers.Transaction.from(signature);
      
      // Verify the transaction matches the request
      if (txRequest.to && parsedTx.to && parsedTx.to.toLowerCase() !== txRequest.to.toLowerCase()) {
        throw new Error('Transaction recipient mismatch');
      }
      
      if (txRequest.value && parsedTx.value?.toString() !== txRequest.value) {
        throw new Error('Transaction value mismatch');
      }

      // Recover the signer address
      const recoveredAddress = parsedTx.from;
      
      return {
        verified: true,
        signer: recoveredAddress,
        transaction: {
          to: parsedTx.to,
          value: parsedTx.value?.toString(),
          data: parsedTx.data,
          gasLimit: parsedTx.gasLimit?.toString(),
          nonce: parsedTx.nonce?.toString(),
        }
      };
    } catch (error) {
      throw new Error(`Transaction signature verification failed: ${error.message}`);
    }
  }
}

module.exports = new TransactionService();

