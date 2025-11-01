// services/agent-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

// Note: assumes artifacts exist under contracts/artifacts
let AgentRegistryABI = null;
let deploymentInfo = null;
let agentRegistryAddressFromEnv = process.env.AGENT_REGISTRY_ADDRESS;
try {
  AgentRegistryABI = require('../../contracts/artifacts/contracts/src/AgentRegistry.sol/AgentRegistry.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  // Artifacts may not exist in dev; defer validation to runtime
}

class AgentService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.agentRegistry = null;
  }

  ensureContract() {
    if (this.agentRegistry) return;
    const { RPC_URL, EVM_PRIVATE_KEY } = process.env;
    if (!RPC_URL) throw new Error('RPC_URL not set');
    if (!EVM_PRIVATE_KEY || !EVM_PRIVATE_KEY.startsWith('0x')) {
      throw new Error('EVM_PRIVATE_KEY must be set (hex 0x...) for ethers operations');
    }
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(EVM_PRIVATE_KEY, this.provider);
    const address = (deploymentInfo && deploymentInfo.contracts && deploymentInfo.contracts.AgentRegistry) || agentRegistryAddressFromEnv;
    if (!address) {
      throw new Error('AgentRegistry address not configured. Provide contracts artifacts or set AGENT_REGISTRY_ADDRESS');
    }
    if (!AgentRegistryABI || AgentRegistryABI.length === 0) {
      throw new Error('AgentRegistry ABI not found. Ensure artifacts are built at contracts/artifacts');
    }
    this.agentRegistry = new ethers.Contract(address, AgentRegistryABI, this.wallet);
  }

  async registerAgent(name, capabilities, metadata = '') {
    this.ensureContract();
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
    this.ensureContract();
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
    this.ensureContract();
    const addresses = await this.agentRegistry.searchByCapability(capability);
    const agents = await Promise.all(addresses.map(a => this.getAgent(a)));
    return agents;
  }

  async getAllAgents() {
    this.ensureContract();
    const addresses = await this.agentRegistry.getAllAgents();
    return Promise.all(addresses.map(a => this.getAgent(a)));
  }

  async updateCapabilities(newCapabilities) {
    this.ensureContract();
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
