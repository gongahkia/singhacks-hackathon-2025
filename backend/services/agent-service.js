// services/agent-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

// Note: assumes artifacts exist under contracts/artifacts
let AgentRegistryABI;
let deploymentInfo;
try {
  AgentRegistryABI = require('../../contracts/artifacts/src/AgentRegistry.sol/AgentRegistry.json').abi;
  deploymentInfo = require('../../contracts/deployment.json');
} catch (_e) {
  // Fallback stubs if artifacts not present at dev time
  AgentRegistryABI = [];
  deploymentInfo = { contracts: { AgentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000' } };
}

class AgentService {
  // In-memory store for agentId -> agent data (in production, use database)
  static agentIdMapping = new Map();
  // In-memory store for ERC-8004 agent IDs: agentAddress -> erc8004AgentId
  static erc8004AgentIdMapping = new Map();
  // In-memory store for agent wallet private keys (demo only - use secure storage in production)
  static agentWalletKeys = new Map(); // agentId -> { privateKey, address }

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
    const address = (deploymentInfo && deploymentInfo.contracts && deploymentInfo.contracts.AgentRegistry) || process.env.AGENT_REGISTRY_ADDRESS;
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error('AgentRegistry address not configured. Provide contracts artifacts or set AGENT_REGISTRY_ADDRESS');
    }
    if (!AgentRegistryABI || AgentRegistryABI.length === 0) {
      throw new Error('AgentRegistry ABI not found. Ensure artifacts are built at contracts/artifacts');
    }
    this.agentRegistry = new ethers.Contract(address, AgentRegistryABI, this.wallet);
  }

  /**
   * Register a new agent
   * @param {string} name - Agent name
   * @param {string[]} capabilities - Agent capabilities array
   * @param {string} [metadata] - Optional metadata
   * @param {string} [signedTx] - Signed transaction hex (Phase 2 production mode)
   * @returns {Promise<Object>} Registration result
   */
  async registerAgent(name, capabilities, metadata = '', signedTx = null) {
    if (signedTx) {
      // Phase 2: Use signed transaction from user wallet
      const transactionService = require('./transaction-service');
      const receiptData = await transactionService.sendSignedTransaction(signedTx);
      
      // Extract agent address from transaction
      this.ensureProvider();
      const tx = await this.provider.getTransaction(receiptData.txHash);
      const agentAddress = tx.from;

      // HCS logging is mandatory - ensure topic exists
      const agentTopicId = await hederaClient.ensureTopic('AGENT_TOPIC_ID', 'Agent', 'Agent registration events');
      await hederaClient.submitMessage(agentTopicId, JSON.stringify({
        event: 'AgentRegistered',
        agent: agentAddress,
        name,
        capabilities,
        timestamp: new Date().toISOString()
      }));
      return { success: true, txHash: receiptData.txHash, agentAddress };
    } else {
      // Use backend wallet (default behavior for backward compatibility)
      this.ensureContract();
      const tx = await this.agentRegistry.registerAgent(name, capabilities, metadata);
      const receipt = await tx.wait();

      // HCS logging is mandatory - ensure topic exists
      const agentTopicId = await hederaClient.ensureTopic('AGENT_TOPIC_ID', 'Agent', 'Agent registration events');
      await hederaClient.submitMessage(agentTopicId, JSON.stringify({
        event: 'AgentRegistered',
        agent: this.wallet.address,
        name,
        capabilities,
        timestamp: new Date().toISOString()
      }));
      return { success: true, txHash: receipt.hash, agentAddress: this.wallet.address };
    }
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

  /**
   * Register agent without requiring user wallet (service wallet registers all agents)
   * @param {string} agentId - Unique agent identifier
   * @param {string} name - Agent name
   * @param {string[]} capabilities - Agent capabilities array
   * @param {string} [metadata] - Optional metadata
   * @param {string} [signedTx] - Signed transaction hex (optional, for user-signed registration)
   * @param {string} [paymentMode] - 'permissioned' or 'permissionless' (default: 'permissioned')
   * @param {string} [agentPrivateKey] - Optional: provide agent's private key for permissionless mode
   * @returns {Promise<Object>} Registration result
   */
  async registerAgentWithoutWallet(agentId, name, capabilities, metadata = '', signedTx = null, paymentMode = 'permissioned', agentPrivateKey = null) {
    this.ensureContract();
    
    // Generate unique wallet for agent if permissionless mode or agentPrivateKey provided
    let agentWallet = null;
    let registeredAddress = null;
    
    if (paymentMode === 'permissionless' || agentPrivateKey) {
      // Generate or use provided private key for agent's wallet
      if (agentPrivateKey) {
        if (!agentPrivateKey.startsWith('0x')) {
          agentPrivateKey = '0x' + agentPrivateKey;
        }
        agentWallet = new ethers.Wallet(agentPrivateKey, this.provider);
        registeredAddress = agentWallet.address;
        
        // Store agent wallet key (demo only - use secure storage in production)
        AgentService.agentWalletKeys.set(agentId, {
          privateKey: agentWallet.privateKey,
          address: registeredAddress
        });
      } else {
        // Generate new wallet for permissionless agent
        agentWallet = ethers.Wallet.createRandom();
        registeredAddress = agentWallet.address;
        
        // Store agent wallet key (demo only - use secure storage in production)
        AgentService.agentWalletKeys.set(agentId, {
          privateKey: agentWallet.privateKey,
          address: registeredAddress
        });
      }
    } else {
      // Permissioned mode: use backend wallet for registration (agent doesn't have its own wallet)
      registeredAddress = this.wallet.address;
    }
    
    // Register agent with unique metadata including agentId and paymentMode
    const metadataWithId = JSON.stringify({
      agentId: agentId,
      name: name,
      originalMetadata: metadata,
      registeredBy: 'service-wallet',
      paymentMode: paymentMode,
      agentWalletAddress: registeredAddress
    });
    
    // Use backend wallet to register on-chain (the msg.sender is the backend wallet)
    // But the agent's wallet address is stored in metadata
    const tx = await this.agentRegistry.registerAgent(
      name,
      capabilities,
      metadataWithId
    );
    const receipt = await tx.wait();

    // Store mapping: agentId -> agent data including payment mode
    AgentService.agentIdMapping.set(agentId, {
      agentId,
      name,
      capabilities,
      metadata,
      registeredAddress: registeredAddress,
      paymentMode: paymentMode,
      agentWalletAddress: paymentMode === 'permissionless' ? registeredAddress : null,
      registeredAt: new Date().toISOString()
    });

    // Register with ERC-8004 Identity Registry
    let erc8004AgentId = null;
    try {
      const erc8004Service = require('./erc8004-service');
      await erc8004Service.initialize();
      
      if (erc8004Service.isAvailable()) {
        // Create agent URI (could be IPFS or HTTP)
        const agentURI = `https://heracles.hedera/agents/${agentId}`;
        
        // Convert capabilities to metadata bytes for ERC-8004
        const erc8004Result = await erc8004Service.registerAgentIdentity(
          this.wallet,
          agentURI,
          {
            agentAddress: registeredAddress,
            agentName: name,
            capabilities: JSON.stringify(capabilities),
            customMetadata: metadata
          }
        );
        
        erc8004AgentId = erc8004Result.agentId;
        
        // Store ERC-8004 mapping
        AgentService.erc8004AgentIdMapping.set(registeredAddress.toLowerCase(), erc8004AgentId);
        
        console.log(`✅ Registered ${name} with ERC-8004 (Agent ID: ${erc8004AgentId})`);
      } else {
        console.warn(`⚠️  ERC-8004 service not available for ${name}`);
      }
    } catch (erc8004Error) {
      console.warn(`⚠️  Failed to register ${name} with ERC-8004:`, erc8004Error.message);
      // Continue without ERC-8004 registration (non-critical for demo)
    }

    // HCS logging
    const agentTopicId = await hederaClient.ensureTopic('AGENT_TOPIC_ID', 'Agent', 'Agent registration events');
    await hederaClient.submitMessage(agentTopicId, JSON.stringify({
      event: 'AgentRegistered',
      agentId: agentId,
      erc8004AgentId: erc8004AgentId,
      registeredAddress: registeredAddress,
      name,
      capabilities,
      timestamp: new Date().toISOString()
    }));

    return {
      success: true,
      txHash: receipt.hash,
      agentId: agentId,
      agentAddress: registeredAddress,
      erc8004AgentId: erc8004AgentId, // Include ERC-8004 ID in response
      paymentMode: paymentMode,
      agentWalletAddress: paymentMode === 'permissionless' ? registeredAddress : null
    };
  }
  
  /**
   * Load Alice and Bob wallet keys from .env files on startup
   * This ensures their wallets are available even after server restart
   */
  static async loadAliceBobWalletsFromEnv() {
    const { ethers } = require('ethers');
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Ensure provider is available
      const agentService = new AgentService();
      agentService.ensureContract();
      const provider = agentService.provider;
      
      // Load Alice wallet if ALICE_PRIVATE_KEY is in env
      if (process.env.ALICE_PRIVATE_KEY) {
        try {
          const aliceKey = process.env.ALICE_PRIVATE_KEY.startsWith('0x') 
            ? process.env.ALICE_PRIVATE_KEY 
            : '0x' + process.env.ALICE_PRIVATE_KEY;
          const aliceWallet = new ethers.Wallet(aliceKey, provider);
          AgentService.agentWalletKeys.set('alice', {
            privateKey: aliceWallet.privateKey,
            address: aliceWallet.address
          });
          console.log(`✅ Loaded Alice wallet from env: ${aliceWallet.address}`);
        } catch (e) {
          console.warn('⚠️  Failed to load Alice wallet from env:', e.message);
        }
      }
      
      // Load Bob wallet if BOB_PRIVATE_KEY is in env
      if (process.env.BOB_PRIVATE_KEY) {
        try {
          const bobKey = process.env.BOB_PRIVATE_KEY.startsWith('0x')
            ? process.env.BOB_PRIVATE_KEY
            : '0x' + process.env.BOB_PRIVATE_KEY;
          const bobWallet = new ethers.Wallet(bobKey, provider);
          AgentService.agentWalletKeys.set('bob', {
            privateKey: bobWallet.privateKey,
            address: bobWallet.address
          });
          console.log(`✅ Loaded Bob wallet from env: ${bobWallet.address}`);
        } catch (e) {
          console.warn('⚠️  Failed to load Bob wallet from env:', e.message);
        }
      }
      
      // Also try loading from .env.alice and .env.bob files if they exist
      const rootDir = path.resolve(__dirname, '../..');
      
      // Try .env.alice
      const aliceEnvPath = path.join(rootDir, '.env.alice');
      if (fs.existsSync(aliceEnvPath)) {
        try {
          const envContent = fs.readFileSync(aliceEnvPath, 'utf8');
          const evmKeyMatch = envContent.match(/EVM_PRIVATE_KEY=(0x[0-9a-fA-F]+)/i);
          if (evmKeyMatch && !AgentService.agentWalletKeys.has('alice')) {
            const aliceWallet = new ethers.Wallet(evmKeyMatch[1], provider);
            AgentService.agentWalletKeys.set('alice', {
              privateKey: aliceWallet.privateKey,
              address: aliceWallet.address
            });
            console.log(`✅ Loaded Alice wallet from .env.alice: ${aliceWallet.address}`);
          }
        } catch (e) {
          console.warn('⚠️  Failed to load Alice wallet from .env.alice:', e.message);
        }
      }
      
      // Try .env.bob
      const bobEnvPath = path.join(rootDir, '.env.bob');
      if (fs.existsSync(bobEnvPath)) {
        try {
          const envContent = fs.readFileSync(bobEnvPath, 'utf8');
          const evmKeyMatch = envContent.match(/EVM_PRIVATE_KEY=(0x[0-9a-fA-F]+)/i);
          if (evmKeyMatch && !AgentService.agentWalletKeys.has('bob')) {
            const bobWallet = new ethers.Wallet(evmKeyMatch[1], provider);
            AgentService.agentWalletKeys.set('bob', {
              privateKey: bobWallet.privateKey,
              address: bobWallet.address
            });
            console.log(`✅ Loaded Bob wallet from .env.bob: ${bobWallet.address}`);
          }
        } catch (e) {
          console.warn('⚠️  Failed to load Bob wallet from .env.bob:', e.message);
        }
      }
      
    } catch (error) {
      console.warn('⚠️  Failed to load Alice/Bob wallets from env files:', error.message);
      // Non-critical, continue without them
    }
  }

  /**
   * Get agent wallet private key (for permissionless payments)
   * @param {string} agentId - Agent ID or address
   * @returns {Object|null} Wallet info { privateKey, address } or null
   */
  static getAgentWallet(agentId) {
    // First try by agentId (e.g., "bob", "alice")
    let wallet = AgentService.agentWalletKeys.get(agentId);
    if (wallet) {
      return wallet;
    }
    
    // If not found and agentId looks like an address, search by address
    if (agentId && (agentId.startsWith('0x') || agentId.startsWith('0.0.'))) {
      for (const [walletAgentId, walletInfo] of AgentService.agentWalletKeys.entries()) {
        if (walletInfo.address?.toLowerCase() === agentId.toLowerCase()) {
          return walletInfo;
        }
      }
    }
    
    return null;
  }

  /**
   * Get agent by unique ID or address
   * @param {string} agentId - Unique agent identifier or agent address
   * @returns {Promise<Object>} Agent data
   */
  async getAgentById(agentId) {
    // First try agentId mapping
    let mapping = AgentService.agentIdMapping.get(agentId);
    
    // If not found, check if agent has a wallet key (definitely permissionless)
    const hasWalletKey = AgentService.agentWalletKeys.has(agentId);
    if (hasWalletKey && !mapping) {
      const walletInfo = AgentService.agentWalletKeys.get(agentId);
      // Try to find the agent by address
      try {
        const onChainAgent = await this.getAgent(walletInfo.address);
        let metadataPaymentMode = 'permissionless';
        let extractedAgentId = agentId;
        try {
          const metadataObj = typeof onChainAgent.metadata === 'string' 
            ? JSON.parse(onChainAgent.metadata || '{}') 
            : (onChainAgent.metadata || {});
          extractedAgentId = metadataObj.agentId || agentId;
          metadataPaymentMode = metadataObj.paymentMode || 'permissionless';
        } catch (e) {
          // Use defaults
        }
        return {
          ...onChainAgent,
          agentId: extractedAgentId,
          registeredAddress: walletInfo.address,
          paymentMode: metadataPaymentMode,
          agentWalletAddress: walletInfo.address
        };
      } catch (error) {
        // Continue with other lookups
      }
    }
    
    // If not found, try by address (check if it's an address format)
    if (!mapping && agentId && (agentId.startsWith('0x') || agentId.startsWith('0.0.'))) {
      try {
        // Try to get agent directly by address
        const onChainAgent = await this.getAgent(agentId);
        
        // Try to find agentId and payment info in metadata
        let extractedAgentId = null;
        let metadataPaymentMode = 'permissioned';
        let metadataWalletAddress = null;
        try {
          const metadataObj = typeof onChainAgent.metadata === 'string' 
            ? JSON.parse(onChainAgent.metadata || '{}') 
            : (onChainAgent.metadata || {});
          extractedAgentId = metadataObj.agentId || null;
          metadataPaymentMode = metadataObj.paymentMode || 'permissioned';
          metadataWalletAddress = metadataObj.agentWalletAddress || null;
        } catch (e) {
          // Metadata is not JSON, use defaults
        }
        
        // Also check if any mapping exists for this address
        let addressMapping = null;
        for (const [mappedAgentId, mapEntry] of AgentService.agentIdMapping.entries()) {
          if (mapEntry.registeredAddress?.toLowerCase() === agentId.toLowerCase()) {
            addressMapping = mapEntry;
            break;
          }
        }
        
        // Check if this address has a wallet key (permissionless indicator)
        let walletKeyForAddress = null;
        for (const [walletAgentId, walletInfo] of AgentService.agentWalletKeys.entries()) {
          if (walletInfo.address?.toLowerCase() === agentId.toLowerCase()) {
            walletKeyForAddress = { agentId: walletAgentId, walletInfo };
            break;
          }
        }
        
        // Use mapping data if found, otherwise use metadata or wallet key info
        const finalAgentId = extractedAgentId || agentId;
        let finalPaymentMode = addressMapping?.paymentMode || metadataPaymentMode || 'permissioned';
        let finalWalletAddress = addressMapping?.agentWalletAddress || metadataWalletAddress || null;
        
        // If wallet key exists for this address, it's definitely permissionless
        if (walletKeyForAddress) {
          finalPaymentMode = 'permissionless';
          finalWalletAddress = walletKeyForAddress.walletInfo.address;
        }
        
        return {
          ...onChainAgent,
          agentId: finalAgentId,
          registeredAddress: onChainAgent.address,
          paymentMode: finalPaymentMode,
          agentWalletAddress: finalWalletAddress
        };
      } catch (error) {
        // Address lookup failed, continue with error below
      }
    }
    
    // If still not found, search through all agents' metadata for matching agentId
    if (!mapping && agentId && !agentId.startsWith('0x') && !agentId.startsWith('0.0.')) {
      try {
        const allAgents = await this.getAllAgents();
        for (const agent of allAgents) {
          try {
            const metadataObj = typeof agent.metadata === 'string'
              ? JSON.parse(agent.metadata || '{}')
              : (agent.metadata || {});
            
            if (metadataObj.agentId === agentId || metadataObj.agentId?.toLowerCase() === agentId.toLowerCase()) {
              // Found the agent! Check if it has a wallet key
              const walletKey = AgentService.agentWalletKeys.get(agentId);
              const paymentMode = walletKey ? 'permissionless' : (metadataObj.paymentMode || 'permissioned');
              const agentWalletAddress = walletKey ? walletKey.address : (metadataObj.agentWalletAddress || null);
              
              return {
                ...agent,
                agentId: agentId,
                registeredAddress: agent.address,
                paymentMode: paymentMode,
                agentWalletAddress: agentWalletAddress
              };
            }
          } catch (e) {
            // Skip this agent's metadata
          }
        }
      } catch (error) {
        // getAllAgents failed, continue
      }
    }
    
    if (!mapping) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // Get on-chain data from registered address
    const onChainAgent = await this.getAgent(mapping.registeredAddress);
    
    // Parse metadata to extract paymentMode if available (but mapping takes precedence)
    let metadataPaymentMode = 'permissioned';
    let metadataWalletAddress = null;
    try {
      const metadataObj = typeof onChainAgent.metadata === 'string'
        ? JSON.parse(onChainAgent.metadata || '{}')
        : (onChainAgent.metadata || {});
      metadataPaymentMode = metadataObj.paymentMode || 'permissioned';
      metadataWalletAddress = metadataObj.agentWalletAddress || null;
    } catch (e) {
      // Metadata is not JSON, use defaults
    }
    
    // Mapping.paymentMode is the source of truth (set during registration)
    // Only use metadata if mapping doesn't have it
    let paymentMode = mapping.paymentMode || metadataPaymentMode || 'permissioned';
    let agentWalletAddress = mapping.agentWalletAddress || metadataWalletAddress || null;
    
    // Also check if agent has wallet key loaded from env (for Alice/Bob)
    const walletKey = AgentService.agentWalletKeys.get(agentId);
    if (walletKey) {
      // Agent has wallet key, so it's definitely permissionless
      paymentMode = 'permissionless';
      agentWalletAddress = walletKey.address;
    }
    
    return {
      ...mapping,
      ...onChainAgent,
      agentId: agentId,
      paymentMode: paymentMode,
      agentWalletAddress: agentWalletAddress
    };
  }

  /**
   * Get all registered agents with their IDs (including walletless/seeded agents)
   * @returns {Promise<Array>} Array of agent objects with agentId
   */
  async getAllAgentsWithIds() {
    const agentMap = new Map(); // Use agentId as key to allow multiple agents with same wallet address
    const addressToAgentIds = new Map(); // Track which agentIds share an address
    
    // Try to get on-chain agents, but don't fail if contract isn't available
    let allAgents = [];
    try {
      allAgents = await this.getAllAgents();
    } catch (error) {
      console.warn('Failed to fetch on-chain agents (contract may not be deployed):', error.message);
      // Continue with walletless agents only
    }
    
    // First, add all on-chain agents
    for (const agent of allAgents) {
      // Try to find agentId and payment info in metadata
      let agentId = null;
      let paymentMode = 'permissioned';
      let agentWalletAddress = null;
      try {
        const metadataObj = typeof agent.metadata === 'string' ? JSON.parse(agent.metadata || '{}') : (agent.metadata || {});
        agentId = metadataObj.agentId || null;
        paymentMode = metadataObj.paymentMode || 'permissioned';
        agentWalletAddress = metadataObj.agentWalletAddress || null;
      } catch (e) {
        // Metadata is not JSON, use address as fallback
        agentId = agent.address;
      }
      
      // Also check agentIdMapping for this address to get paymentMode if metadata doesn't have it
      if (agent.address) {
        for (const [mappedAgentId, mapping] of AgentService.agentIdMapping.entries()) {
          if (mapping.registeredAddress?.toLowerCase() === agent.address.toLowerCase()) {
            // Found mapping for this address - use its paymentMode if metadata doesn't have it
            if (!paymentMode || paymentMode === 'permissioned') {
              paymentMode = mapping.paymentMode || paymentMode;
            }
            if (!agentWalletAddress && mapping.agentWalletAddress) {
              agentWalletAddress = mapping.agentWalletAddress;
            }
            // Use the mapped agentId if available
            if (mappedAgentId && !agentId) {
              agentId = mappedAgentId;
            }
            break;
          }
        }
        
        // Check if agent has wallet key stored (for Alice/Bob loaded from env)
        // This allows us to detect permissionless agents even if metadata is missing
        // Check by address first (most reliable)
        for (const [walletAgentId, walletInfo] of AgentService.agentWalletKeys.entries()) {
          if (walletInfo.address?.toLowerCase() === agent.address.toLowerCase()) {
            // Agent has wallet key, so it's permissionless
            if (!agentWalletAddress) {
              agentWalletAddress = walletInfo.address;
            }
            // Use walletAgentId as agentId if not found in metadata
            if (!agentId) {
              agentId = walletAgentId;
            }
            // Override paymentMode if wallet key exists
            paymentMode = 'permissionless';
            break;
          }
        }
        
        // Also check by agentId if we have it from metadata
        if (agentId) {
          const walletKey = AgentService.agentWalletKeys.get(agentId);
          if (walletKey) {
            agentWalletAddress = walletKey.address;
            paymentMode = 'permissionless';
          }
        }
      }
      
      // Get ERC-8004 ID if available
      const erc8004AgentId = AgentService.erc8004AgentIdMapping.get(agent.address.toLowerCase()) || null;
      
      const enrichedAgent = {
        ...agent,
        agentId: agentId || agent.address,
        erc8004AgentId: erc8004AgentId,
        paymentMode: paymentMode,
        agentWalletAddress: agentWalletAddress
      };
      
      // Use agentId as key (allows multiple agents with same wallet address)
      // If no agentId, fall back to address
      const key = agentId || agent.address;
      agentMap.set(key, enrichedAgent);
      
      // Track address -> agentId mapping for deduplication checks
      if (agent.address) {
        if (!addressToAgentIds.has(agent.address.toLowerCase())) {
          addressToAgentIds.set(agent.address.toLowerCase(), []);
        }
        addressToAgentIds.get(agent.address.toLowerCase()).push(key);
      }
    }
    
    // Then, add walletless agents from agentIdMapping that aren't already in the map
    // Use agentId as key to allow multiple agents with same wallet address
    for (const [agentId, mapping] of AgentService.agentIdMapping.entries()) {
      // Check if agent already exists by agentId (not address, since multiple can share address)
      if (!agentMap.has(agentId)) {
        const address = mapping.registeredAddress?.toLowerCase();
        
        // Try to get on-chain data if address exists
        if (address) {
          try {
            const onChainAgent = await this.getAgent(mapping.registeredAddress);
            const erc8004AgentId = AgentService.erc8004AgentIdMapping.get(address) || null;
            
            // Check if agent has wallet key loaded from env (for Alice/Bob)
            const walletKey = AgentService.agentWalletKeys.get(agentId);
            const finalPaymentMode = walletKey ? 'permissionless' : (mapping.paymentMode || 'permissioned');
            const finalWalletAddress = walletKey?.address || mapping.agentWalletAddress || null;
            
            // Use agentId as key, not address (allows multiple agents per address)
            agentMap.set(agentId, {
              ...onChainAgent,
              ...mapping,
              agentId: agentId,
              erc8004AgentId: erc8004AgentId,
              paymentMode: finalPaymentMode,
              agentWalletAddress: finalWalletAddress
            });
          } catch (error) {
            // If on-chain lookup fails, create agent from mapping data only
            const erc8004AgentId = AgentService.erc8004AgentIdMapping.get(address) || null;
            
            // Check if agent has wallet key loaded from env (for Alice/Bob)
            const walletKey = AgentService.agentWalletKeys.get(agentId);
            const finalPaymentMode = walletKey ? 'permissionless' : (mapping.paymentMode || 'permissioned');
            const finalWalletAddress = walletKey?.address || mapping.agentWalletAddress || null;
            
            // Use agentId as key
            agentMap.set(agentId, {
              name: mapping.name,
              address: mapping.registeredAddress,
              capabilities: mapping.capabilities || [],
              metadata: mapping.metadata || '',
              trustScore: '0',
              registeredAt: mapping.registeredAt || new Date().toISOString(),
              isActive: true,
              agentId: agentId,
              erc8004AgentId: erc8004AgentId,
              paymentMode: finalPaymentMode,
              agentWalletAddress: finalWalletAddress
            });
          }
        } else {
          // Agent doesn't have an address yet (not registered on-chain), but include it anyway
          // This can happen for walletless agents that use a service wallet
          // Use agentId as the address for display purposes
          const displayAddress = `walletless-${agentId}`;
          const erc8004AgentId = AgentService.erc8004AgentIdMapping.get(displayAddress) || null;
          
          // Check if agent has wallet key loaded from env (for Alice/Bob)
          const walletKey = AgentService.agentWalletKeys.get(agentId);
          const finalPaymentMode = walletKey ? 'permissionless' : (mapping.paymentMode || 'permissioned');
          const finalWalletAddress = walletKey?.address || mapping.agentWalletAddress || null;
          
          // Use agentId as key
          agentMap.set(agentId, {
            name: mapping.name,
            address: mapping.registeredAddress || displayAddress,
            capabilities: mapping.capabilities || [],
            metadata: mapping.metadata || '',
            trustScore: '0',
            registeredAt: mapping.registeredAt || new Date().toISOString(),
            isActive: true,
            agentId: agentId,
            erc8004AgentId: erc8004AgentId,
            paymentMode: finalPaymentMode,
            agentWalletAddress: finalWalletAddress
          });
        }
      }
    }
    
    return Array.from(agentMap.values());
  }

  /**
   * Static method to get ERC-8004 agent ID for an address
   * @param {string} agentAddress - Agent's EVM address
   * @returns {string|null} ERC-8004 agent ID or null
   */
  static getERC8004AgentId(agentAddress) {
    return AgentService.erc8004AgentIdMapping.get(agentAddress.toLowerCase()) || null;
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
