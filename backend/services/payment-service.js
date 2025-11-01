// services/payment-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

let PaymentProcessorABI;
let deploymentInfo;
try {
  PaymentProcessorABI = require('../../contracts/artifacts/src/PaymentProcessor.sol/PaymentProcessor.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  PaymentProcessorABI = [];
  deploymentInfo = { contracts: { PaymentProcessor: process.env.PAYMENT_PROCESSOR_ADDRESS || '0x0000000000000000000000000000000000000000' } };
}

class PaymentService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.paymentProcessor = null;
  }

  ensureContract() {
    if (this.paymentProcessor) return;
    this.ensureProvider();
    const { EVM_PRIVATE_KEY } = process.env;
    if (!EVM_PRIVATE_KEY || !EVM_PRIVATE_KEY.startsWith('0x')) {
      throw new Error('EVM_PRIVATE_KEY must be set (hex 0x...) for ethers operations');
    }
    this.wallet = new ethers.Wallet(EVM_PRIVATE_KEY, this.provider);
    const address = (deploymentInfo && deploymentInfo.contracts && deploymentInfo.contracts.PaymentProcessor) || process.env.PAYMENT_PROCESSOR_ADDRESS;
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error('PaymentProcessor address not configured. Provide contracts artifacts or set PAYMENT_PROCESSOR_ADDRESS');
    }
    if (!PaymentProcessorABI || PaymentProcessorABI.length === 0) {
      throw new Error('PaymentProcessor ABI not found. Ensure artifacts are built at contracts/artifacts');
    }
    this.paymentProcessor = new ethers.Contract(address, PaymentProcessorABI, this.wallet);
  }

  /**
   * Create escrow payment
   * @param {string} payee - Recipient agent address
   * @param {number|string} amountInHbar - Amount in HBAR
   * @param {string} description - Service description
   * @param {string} [payerAgentAddress] - Payer agent address (must be registered). If not provided, uses backend wallet.
   * @param {string} [payerPrivateKey] - Payer's EVM private key (Phase 1 demo mode only)
   * @param {string} [signedTx] - Signed transaction hex (Phase 2 production mode)
   * @param {number} [expirationDays] - Escrow expiration days (default: 30)
   * @returns {Promise<Object>} Escrow creation result
   */
  async createEscrow(payee, amountInHbar, description, payerAgentAddress = null, payerPrivateKey = null, signedTx = null, expirationDays = 0) {
    // If payer agent address provided, verify agent is registered and use their wallet
    let walletToUse = null;
    let contractToUse = null;
    let payerAddress = null;

    if (payerAgentAddress && payerPrivateKey) {
      // Verify agent is registered
      const agentService = require('./agent-service');
      try {
        const agent = await agentService.getAgent(payerAgentAddress);
        if (!agent || !agent.isActive) {
          throw new Error(`Agent ${payerAgentAddress} is not registered or inactive`);
        }
        payerAddress = payerAgentAddress;
        
        // Create wallet from payer's private key
        this.ensureProvider();
        let privateKey = payerPrivateKey;
        if (!privateKey.startsWith('0x')) {
          privateKey = '0x' + privateKey;
        }
        walletToUse = new ethers.Wallet(privateKey, this.provider);
        
        // Verify wallet address matches agent address
        if (walletToUse.address.toLowerCase() !== payerAgentAddress.toLowerCase()) {
          throw new Error(`Private key does not match agent address. Expected ${payerAgentAddress}, got ${walletToUse.address}`);
        }

        // Create contract instance with payer's wallet
        const address = (deploymentInfo && deploymentInfo.contracts && deploymentInfo.contracts.PaymentProcessor) || process.env.PAYMENT_PROCESSOR_ADDRESS;
        if (!address || address === '0x0000000000000000000000000000000000000000') {
          throw new Error('PaymentProcessor address not configured');
        }
        contractToUse = new ethers.Contract(address, PaymentProcessorABI, walletToUse);
      } catch (error) {
        if (error.message.includes('Agent') || error.message.includes('not found')) {
          throw new Error(`Cannot create payment: ${error.message}. Ensure agent is registered via /api/agents`);
        }
        throw error;
      }
    } else if (signedTx) {
      // Phase 2: Use signed transaction from user wallet
      const transactionService = require('./transaction-service');
      const receiptData = await transactionService.sendSignedTransaction(signedTx);
      
      // Extract escrow ID from receipt logs if possible
      // Note: We'll need the contract address to parse logs
      const address = (deploymentInfo && deploymentInfo.contracts && deploymentInfo.contracts.PaymentProcessor) || process.env.PAYMENT_PROCESSOR_ADDRESS;
      this.ensureProvider();
      const receipt = await this.provider.getTransactionReceipt(receiptData.txHash);
      
      let escrowId = undefined;
      if (address && PaymentProcessorABI && PaymentProcessorABI.length > 0) {
        try {
          const contract = new ethers.Contract(address, PaymentProcessorABI);
          const log = receipt.logs.find(l => {
            try { return contract.interface.parseLog(l).name === 'EscrowCreated'; } catch { return false; }
          });
          if (log) {
            escrowId = contract.interface.parseLog(log).args.escrowId;
            // Get payer from transaction
            const tx = await this.provider.getTransaction(receiptData.txHash);
            payerAddress = tx.from;
          }
        } catch {}
      }

      // HCS logging is mandatory - ensure topic exists
      const paymentTopicId = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
      await hederaClient.submitMessage(paymentTopicId, JSON.stringify({
        event: 'EscrowCreated', escrowId, payer: payerAddress, payee, amount: amountInHbar, timestamp: new Date().toISOString()
      }));
      return { success: true, escrowId, txHash: receiptData.txHash, amount: amountInHbar, payer: payerAddress };
    } else {
      // Use backend wallet (default behavior for backward compatibility)
      this.ensureContract();
      walletToUse = this.wallet;
      contractToUse = this.paymentProcessor;
      payerAddress = this.wallet.address;
    }

    // Convert HBAR to wei (18 decimals for EVM)
    const amount = ethers.parseEther(amountInHbar.toString());
    // Contract signature: createEscrow(address _payee, string _serviceDescription, uint256 _expirationDays)
    // expirationDays: 0 = use default (30 days)
    const tx = await contractToUse.createEscrow(payee, description, expirationDays, { value: amount });
    const receipt = await tx.wait();

    let escrowId = undefined;
    try {
      const log = receipt.logs.find(l => {
        try { return contractToUse.interface.parseLog(l).name === 'EscrowCreated'; } catch { return false; }
      });
      if (log) escrowId = contractToUse.interface.parseLog(log).args.escrowId;
    } catch {}

    // HCS logging is mandatory - ensure topic exists
    const paymentTopicId = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
    await hederaClient.submitMessage(paymentTopicId, JSON.stringify({
      event: 'EscrowCreated', escrowId, payer: payerAddress, payee, amount: amountInHbar, timestamp: new Date().toISOString()
      }));
    return { success: true, escrowId, txHash: receipt.hash, amount: amountInHbar, payer: payerAddress };
  }

  ensureProvider() {
    if (this.provider) return;
    const { RPC_URL } = process.env;
    if (!RPC_URL) throw new Error('RPC_URL not set');
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  /**
   * Release escrow payment
   * @param {string} escrowId - Escrow ID to release
   * @param {string} [releaserAgentAddress] - Agent address releasing (must be payer). If not provided, uses backend wallet.
   * @param {string} [releaserPrivateKey] - Releaser's EVM private key (required if releaserAgentAddress is provided)
   * @returns {Promise<Object>} Release result
   * @note According to x402 standard, only the payer can release escrow to the payee
   */
  async releaseEscrow(escrowId, releaserAgentAddress = null, releaserPrivateKey = null) {
    // Get escrow details before release to establish trust
    const escrow = await this.getEscrow(escrowId);

    // If releaser agent provided, verify and use their wallet
    let contractToUse = null;
    
    if (releaserAgentAddress && releaserPrivateKey) {
      // Verify agent is registered and is the payer (x402: only payer can release escrow)
      if (releaserAgentAddress.toLowerCase() !== escrow.payer.toLowerCase()) {
        throw new Error(`Only payer ${escrow.payer} can release this escrow. Got ${releaserAgentAddress}. This is required by x402 payment standard for security.`);
      }
      
      const agentService = require('./agent-service');
      const agent = await agentService.getAgent(releaserAgentAddress);
      if (!agent || !agent.isActive) {
        throw new Error(`Agent ${releaserAgentAddress} is not registered or inactive`);
      }
      
      // Create wallet from releaser's private key
      this.ensureProvider();
      let privateKey = releaserPrivateKey;
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      if (wallet.address.toLowerCase() !== releaserAgentAddress.toLowerCase()) {
        throw new Error(`Private key does not match agent address. Expected ${releaserAgentAddress}, got ${wallet.address}`);
      }

      const address = (deploymentInfo && deploymentInfo.contracts && deploymentInfo.contracts.PaymentProcessor) || process.env.PAYMENT_PROCESSOR_ADDRESS;
      contractToUse = new ethers.Contract(address, PaymentProcessorABI, wallet);
    } else {
      // Use backend wallet (default)
      this.ensureContract();
      contractToUse = this.paymentProcessor;
    }
    
    // Convert escrowId to bytes32 format if it's a string
    const escrowIdBytes = ethers.isHexString(escrowId) 
      ? escrowId 
      : ethers.id(escrowId);
    
    const tx = await contractToUse.releaseEscrow(escrowIdBytes);
    const receipt = await tx.wait();
    
    // Establish trust from successful payment (ERC-8004)
    try {
      const reputationService = require('./reputation-service');
      const txHash = receipt.hash;
      await reputationService.establishTrustFromPayment(
        escrow.payer,
        escrow.payee,
        txHash
      );
    } catch (error) {
      console.warn('Failed to establish trust from payment:', error.message);
    }
    
    // HCS logging is mandatory - ensure topic exists
    const paymentTopicId = await hederaClient.ensureTopic('PAYMENT_TOPIC_ID', 'Payment', 'Agent payment events');
    await hederaClient.submitMessage(paymentTopicId, JSON.stringify({ 
        event: 'EscrowReleased', 
        escrowId, 
        payer: escrow.payer,
        payee: escrow.payee,
        timestamp: new Date().toISOString() 
      }));
    return { success: true, txHash: receipt.hash };
  }

  async refundEscrow(escrowId) {
    this.ensureContract();
    // Convert escrowId to bytes32 format if needed
    const escrowIdBytes = ethers.isHexString(escrowId) 
      ? escrowId 
      : ethers.id(escrowId);
    const tx = await this.paymentProcessor.refundEscrow(escrowIdBytes);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  }

  async getEscrow(escrowId) {
    this.ensureContract();
    // Convert escrowId to bytes32 format if needed
    const escrowIdBytes = ethers.isHexString(escrowId) 
      ? escrowId 
      : ethers.id(escrowId);
    const e = await this.paymentProcessor.getEscrow(escrowIdBytes);
    return {
      escrowId,
      payer: e.payer,
      payee: e.payee,
      amount: ethers.formatEther(e.amount),
      serviceDescription: e.serviceDescription,
      status: ['Active', 'Completed', 'Refunded', 'Disputed'][e.status || 0],
      createdAt: e.createdAt ? new Date(Number(e.createdAt) * 1000).toISOString() : undefined,
      completedAt: e.completedAt && Number(e.completedAt) > 0 ? new Date(Number(e.completedAt) * 1000).toISOString() : null
    };
  }

  async getPayerEscrows(payerAddress) {
    this.ensureContract();
    const ids = await this.paymentProcessor.getPayerEscrows(payerAddress);
    return Promise.all(ids.map(id => this.getEscrow(id)));
  }
}

module.exports = new PaymentService();
