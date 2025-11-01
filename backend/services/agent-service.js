// services/agent-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

// Note: assumes artifacts exist under contracts/artifacts
let AgentRegistryABI;
let deploymentInfo;
try {
  AgentRegistryABI = require('../../contracts/artifacts/contracts/src/AgentRegistry.sol/AgentRegistry.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  // Fallback stubs if artifacts not present at dev time
  AgentRegistryABI = [];
  deploymentInfo = { contracts: { AgentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000' } };
}

class AgentService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY || '0x' + '0'.repeat(64), this.provider);
    this.agentRegistry = new ethers.Contract(
      deploymentInfo.contracts.AgentRegistry,
      AgentRegistryABI,
      this.wallet
    );
  }

  async registerAgent(name, capabilities, metadata = '') {
    const tx = await this.agentRegistry.registerAgent(name, capabilities, metadata);
    const receipt = await tx.wait();

    if (process.env.AGENT_TOPIC_ID) {
      await hederaClient.submitMessage(process.env.AGENT_TOPIC_ID, JSON.stringify({
        event: 'AgentRegistered',
        agent: this.wallet.address,
        name,
        capabilities,
        timestamp: new Date().toISOString()
      }));
    }
    return { success: true, txHash: receipt.hash, agentAddress: this.wallet.address };
  }

  async getAgent(agentAddress) {
    const agent = await this.agentRegistry.getAgent(agentAddress);
    return {
      name: agent.name,
      address: agent.agentAddress,
      capabilities: agent.capabilities,
      metadata: agent.metadata,
      trustScore: agent.trustScore?.toString?.() || '0',
      registeredAt: agent.registeredAt ? new Date(Number(agent.registeredAt) * 1000).toISOString() : undefined,
      isActive: !!agent.isActive
    };
  }

  async searchAgents(capability) {
    const addresses = await this.agentRegistry.searchByCapability(capability);
    const agents = await Promise.all(addresses.map(a => this.getAgent(a)));
    return agents;
  }

  async getAllAgents() {
    const addresses = await this.agentRegistry.getAllAgents();
    return Promise.all(addresses.map(a => this.getAgent(a)));
  }

  async updateCapabilities(newCapabilities) {
    const tx = await this.agentRegistry.updateCapabilities(newCapabilities);
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash };
  }

  async getAgentReputation(agentAddress) {
    const reputationService = require('./reputation-service');
    return await reputationService.getAgentReputation(agentAddress);
  }

  async getAgentInteractions(agentAddress) {
    const a2aService = require('./a2a-service');
    return await a2aService.getAgentInteractions(agentAddress);
  }
}

module.exports = new AgentService();
