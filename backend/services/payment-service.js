// services/payment-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

let PaymentProcessorABI;
let deploymentInfo;
try {
  PaymentProcessorABI = require('../../contracts/artifacts/contracts/src/PaymentProcessor.sol/PaymentProcessor.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  PaymentProcessorABI = [];
  deploymentInfo = { contracts: { PaymentProcessor: process.env.PAYMENT_PROCESSOR_ADDRESS || '0x0000000000000000000000000000000000000000' } };
}

class PaymentService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY || '0x' + '0'.repeat(64), this.provider);
    this.paymentProcessor = new ethers.Contract(
      deploymentInfo.contracts.PaymentProcessor,
      PaymentProcessorABI,
      this.wallet
    );
  }

  async createEscrow(payee, amountInHbar, description) {
    const amount = ethers.parseEther(amountInHbar.toString());
    const tx = await this.paymentProcessor.createEscrow(payee, description, { value: amount });
    const receipt = await tx.wait();

    // Try extract event
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
    const tx = await this.paymentProcessor.releaseEscrow(escrowId);
    const receipt = await tx.wait();
    if (process.env.PAYMENT_TOPIC_ID) {
      await hederaClient.submitMessage(process.env.PAYMENT_TOPIC_ID, JSON.stringify({ event: 'EscrowReleased', escrowId, timestamp: new Date().toISOString() }));
    }
    return { success: true, txHash: receipt.hash };
  }

  async refundEscrow(escrowId) {
    const tx = await this.paymentProcessor.refundEscrow(escrowId);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  }

  async getEscrow(escrowId) {
    const e = await this.paymentProcessor.getEscrow(escrowId);
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
    const ids = await this.paymentProcessor.getPayerEscrows(payerAddress);
    return Promise.all(ids.map(id => this.getEscrow(id)));
  }
}

module.exports = new PaymentService();
