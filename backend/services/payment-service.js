// services/payment-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

let PaymentProcessorABI = null;
let deploymentInfo = null;
let paymentProcessorAddressFromEnv = process.env.PAYMENT_PROCESSOR_ADDRESS;
try {
  PaymentProcessorABI = require('../../contracts/artifacts/contracts/src/PaymentProcessor.sol/PaymentProcessor.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  // Artifacts may not exist in dev; defer validation to runtime
}

class PaymentService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.paymentProcessor = null;
  }

  ensureContract() {
    if (this.paymentProcessor) return;
    const { RPC_URL, EVM_PRIVATE_KEY } = process.env;
    if (!RPC_URL) throw new Error('RPC_URL not set');
    if (!EVM_PRIVATE_KEY || !EVM_PRIVATE_KEY.startsWith('0x')) {
      throw new Error('EVM_PRIVATE_KEY must be set (hex 0x...) for ethers operations');
    }
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(EVM_PRIVATE_KEY, this.provider);
    const address = (deploymentInfo && deploymentInfo.contracts && deploymentInfo.contracts.PaymentProcessor) || paymentProcessorAddressFromEnv;
    if (!address) {
      throw new Error('PaymentProcessor address not configured. Provide contracts artifacts or set PAYMENT_PROCESSOR_ADDRESS');
    }
    if (!PaymentProcessorABI || PaymentProcessorABI.length === 0) {
      throw new Error('PaymentProcessor ABI not found. Ensure artifacts are built at contracts/artifacts');
    }
    this.paymentProcessor = new ethers.Contract(address, PaymentProcessorABI, this.wallet);
  }

  async createEscrow(payee, amountInHbar, description) {
    this.ensureContract();
    const amount = ethers.parseEther(amountInHbar.toString());
    const tx = await this.paymentProcessor.createEscrow(payee, description, { value: amount });
    const receipt = await tx.wait();

    let escrowId = undefined;
    try {
      const log = receipt.logs.find(l => {
        try { return this.paymentProcessor.interface.parseLog(l).name === 'EscrowCreated'; } catch { return false; }
      });
      if (log) escrowId = this.paymentProcessor.interface.parseLog(log).args.escrowId;
    } catch {}

    if (process.env.PAYMENT_TOPIC_ID) {
      await hederaClient.submitMessage(process.env.PAYMENT_TOPIC_ID, JSON.stringify({
        event: 'EscrowCreated', escrowId, payer: this.wallet.address, payee, amount: amountInHbar, timestamp: new Date().toISOString()
      }));
    }
    return { success: true, escrowId, txHash: receipt.hash, amount: amountInHbar };
  }

  async releaseEscrow(escrowId) {
<<<<<<< HEAD
    this.ensureContract();
    const tx = await this.paymentProcessor.releaseEscrow(escrowId);
=======
    // Get escrow details before release to establish trust
    const escrow = await this.getEscrow(escrowId);
    
    // Convert escrowId to bytes32 format if it's a string
    const escrowIdBytes = ethers.isHexString(escrowId) 
      ? escrowId 
      : ethers.id(escrowId);
    
    const tx = await this.paymentProcessor.releaseEscrow(escrowIdBytes);
>>>>>>> origin/main
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
    
    if (process.env.PAYMENT_TOPIC_ID) {
      await hederaClient.submitMessage(process.env.PAYMENT_TOPIC_ID, JSON.stringify({ 
        event: 'EscrowReleased', 
        escrowId, 
        payer: escrow.payer,
        payee: escrow.payee,
        timestamp: new Date().toISOString() 
      }));
    }
    return { success: true, txHash: receipt.hash };
  }

  async refundEscrow(escrowId) {
<<<<<<< HEAD
    this.ensureContract();
    const tx = await this.paymentProcessor.refundEscrow(escrowId);
=======
    // Convert escrowId to bytes32 format if needed
    const escrowIdBytes = ethers.isHexString(escrowId) 
      ? escrowId 
      : ethers.id(escrowId);
    const tx = await this.paymentProcessor.refundEscrow(escrowIdBytes);
>>>>>>> origin/main
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  }

  async getEscrow(escrowId) {
<<<<<<< HEAD
    this.ensureContract();
    const e = await this.paymentProcessor.getEscrow(escrowId);
=======
    // Convert escrowId to bytes32 format if needed
    const escrowIdBytes = ethers.isHexString(escrowId) 
      ? escrowId 
      : ethers.id(escrowId);
    const e = await this.paymentProcessor.getEscrow(escrowIdBytes);
>>>>>>> origin/main
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
