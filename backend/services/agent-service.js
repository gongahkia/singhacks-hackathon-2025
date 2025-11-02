// services/agent-service.js
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

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
  }

  ensureWallet() {
    if (this.wallet) return;
    const { RPC_URL, EVM_PRIVATE_KEY } = process.env;
    if (!RPC_URL) throw new Error('RPC_URL not set');
    if (!EVM_PRIVATE_KEY || !EVM_PRIVATE_KEY.startsWith('0x')) {
      throw new Error('EVM_PRIVATE_KEY must be set (hex 0x...) for ethers operations');
    }
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(EVM_PRIVATE_KEY, this.provider);
  }

  // Legacy method name for backward compatibility - now just ensures wallet
  ensureContract() {
    this.ensureWallet();
  }

  /**
   * Register a new agent (legacy method - redirects to ERC-8004 registration)
   * @param {string} name - Agent name
   * @param {string[]} capabilities - Agent capabilities array
   * @param {string} [metadata] - Optional metadata
   * @param {string} [signedTx] - Signed transaction hex (Phase 2 production mode)
   * @returns {Promise<Object>} Registration result
   */
  async registerAgent(name, capabilities, metadata = '', signedTx = null) {
    // Legacy method - now uses ERC-8004 registration via registerAgentWithoutWallet
    const agentId = `agent-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    return await this.registerAgentWithoutWallet(agentId, name, capabilities, metadata, signedTx, 'permissioned', null);
  }

  async getAgent(agentAddress) {
    // Legacy method - try to find agent by address in our mappings or ERC-8004
    this.ensureWallet();
    
    // First check agentIdMapping by registeredAddress
    for (const [agentId, mapping] of AgentService.agentIdMapping.entries()) {
      if (mapping.registeredAddress?.toLowerCase() === agentAddress.toLowerCase()) {
        return {
          address: agentAddress,
          name: mapping.name,
          capabilities: mapping.capabilities || [],
          metadata: mapping.metadata || '',
          isActive: true,
          registeredAt: mapping.registeredAt || new Date().toISOString()
        };
      }
    }
    
    // If not found, throw error
    throw new Error(`Agent not found for address: ${agentAddress}`);
  }

  async searchAgents(capability) {
    // Search in agentIdMapping and ERC-8004 agents
    const matchingAgents = [];
    const allAgents = await this.getAllAgentsWithIds();
    for (const agent of allAgents) {
      if (agent.capabilities && agent.capabilities.includes(capability)) {
        matchingAgents.push(agent.address);
      }
    }
    return matchingAgents;
  }

  async getAllAgents() {
    // Legacy method - redirects to ERC-8004 based retrieval
    const agents = await this.getAllAgentsWithIds();
    return agents.map(agent => ({
      address: agent.address || agent.owner,
      name: agent.name,
      capabilities: agent.capabilities || [],
      metadata: agent.metadata || '',
      isActive: agent.isActive !== false,
      registeredAt: agent.registeredAt || new Date().toISOString()
    }));
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
    
    // Check if agent already exists and is registered with ERC-8004
    // First verify it's actually in ERC-8004, not just in memory
    if (AgentService.agentIdMapping.has(agentId)) {
      const existing = AgentService.agentIdMapping.get(agentId);
      if (existing.erc8004AgentId) {
        // Verify it's actually in ERC-8004
        try {
          const erc8004Service = require('./erc8004-service');
          await erc8004Service.initialize();
          
          if (erc8004Service.isAvailable()) {
            try {
              const agentInfo = await erc8004Service.getAgentById(existing.erc8004AgentId);
              if (agentInfo && agentInfo.agentId) {
                // Agent exists in ERC-8004, skip registration
                console.log(`✅ Agent ${agentId} already registered with ERC-8004 (ID: ${existing.erc8004AgentId})`);
                return {
                  success: true,
                  txHash: 'already-registered',
                  agentId: agentId,
                  agentAddress: existing.registeredAddress,
                  erc8004AgentId: existing.erc8004AgentId,
                  erc8004TxHash: 'already-registered',
                  paymentMode: existing.paymentMode,
                  agentWalletAddress: existing.agentWalletAddress,
                  registeredWithERC8004: true
                };
              }
            } catch (e) {
              // Agent not found in ERC-8004, even though we have an ID - re-register
              console.log(`⚠️  Agent ${agentId} has ERC-8004 ID but not found on-chain, re-registering...`);
            }
          }
        } catch (e) {
          console.warn(`⚠️  Could not verify ERC-8004 registration: ${e.message}, proceeding with registration...`);
        }
      } else {
        // Agent exists in mapping but not in ERC-8004 yet
        console.log(`⚠️  Agent ${agentId} exists in mapping but not in ERC-8004, registering with ERC-8004...`);
      }
    }
    
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

    // Store mapping: agentId -> agent data including payment mode
    const agentData = {
      agentId,
      name: name,
      capabilities: capabilities,
      metadata: metadata,
      registeredAddress: registeredAddress,
      paymentMode: paymentMode,
      agentWalletAddress: paymentMode === 'permissionless' ? registeredAddress : null,
      erc8004AgentId: null, // Will be set after ERC-8004 registration
      registeredAt: new Date().toISOString()
    };
    
    AgentService.agentIdMapping.set(agentId, agentData);
    console.log(`📝 Stored agent ${agentId} in agentIdMapping (name: ${agentData.name})`);

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
        
        // Store ERC-8004 mapping by agentId (primary) - multiple agents can share the same address
        // Only use address-based mapping for permissionless agents (unique addresses)
        if (paymentMode === 'permissionless' && registeredAddress) {
          AgentService.erc8004AgentIdMapping.set(registeredAddress.toLowerCase(), erc8004AgentId);
        }
        // Always store by agentId for direct lookup
        AgentService.erc8004AgentIdMapping.set(`agentId:${agentId}`, erc8004AgentId);
        
        // Update agentIdMapping with erc8004AgentId
        if (AgentService.agentIdMapping.has(agentId)) {
          const existingMapping = AgentService.agentIdMapping.get(agentId);
          existingMapping.erc8004AgentId = erc8004AgentId;
          AgentService.agentIdMapping.set(agentId, existingMapping);
        } else {
          // Create mapping if it doesn't exist (shouldn't happen, but safety check)
          AgentService.agentIdMapping.set(agentId, {
            agentId,
            name,
            capabilities,
            metadata,
            registeredAddress: registeredAddress,
            paymentMode: paymentMode,
            agentWalletAddress: paymentMode === 'permissionless' ? registeredAddress : null,
            erc8004AgentId: erc8004AgentId,
            registeredAt: new Date().toISOString()
          });
        }
        
        console.log(`✅ Registered ${name} with ERC-8004 (Agent ID: ${agentId} → ERC-8004 ID: ${erc8004AgentId})`);
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
      txHash: erc8004AgentId ? 'erc8004-registered' : 'pending',
      agentId: agentId,
      agentAddress: registeredAddress,
      erc8004AgentId: erc8004AgentId, // Include ERC-8004 ID in response
      erc8004TxHash: erc8004AgentId ? 'registered' : null, // ERC-8004 registration status
      paymentMode: paymentMode,
      agentWalletAddress: paymentMode === 'permissionless' ? registeredAddress : null,
      registeredWithERC8004: erc8004AgentId !== null
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
      agentService.ensureWallet();
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
   * PRIMARY SOURCE: ERC-8004 IdentityRegistry
   * SECONDARY: Backend agentIdMapping for capabilities/metadata
   * @returns {Promise<Array>} Array of agent objects with agentId
   */
  async getAllAgentsWithIds() {
    const agentMap = new Map(); // Use agentId (or erc8004AgentId) as key
    
    // STEP 1: Query ERC-8004 IdentityRegistry first (primary source of truth)
    let erc8004Agents = [];
    try {
      const erc8004Service = require('./erc8004-service');
      await erc8004Service.initialize();
      
      if (erc8004Service.isAvailable()) {
        // Get all known owner addresses from agentIdMapping and walletKeys
        const ownerAddresses = new Set();
        
        // Collect from agentIdMapping (includes registeredAddress)
        for (const [agentId, mapping] of AgentService.agentIdMapping.entries()) {
          if (mapping.registeredAddress) {
            ownerAddresses.add(mapping.registeredAddress.toLowerCase());
          }
        }
        
        // Collect from walletKeys (Alice, Bob, etc.)
        for (const [agentId, walletInfo] of AgentService.agentWalletKeys.entries()) {
          if (walletInfo.address) {
            ownerAddresses.add(walletInfo.address.toLowerCase());
          }
        }
        
              // Ensure backend wallet is initialized and include it (most seeded agents registered by it)
              try {
                 this.ensureWallet();
                 if (this.wallet?.address) {
                   ownerAddresses.add(this.wallet.address.toLowerCase());
                   console.log(`📝 Backend wallet address: ${this.wallet.address}`);
                 }
               } catch (e) {
                 console.warn('⚠️  Could not initialize backend wallet:', e.message);
               }
        
        console.log(`🔍 Querying ERC-8004 with ${ownerAddresses.size} owner addresses:`, Array.from(ownerAddresses));
        
        // Query ERC-8004 for all agents (try totalSupply first, then by owners)
        try {
          erc8004Agents = await erc8004Service.getAllAgents([]);
          console.log(`✅ Retrieved ${erc8004Agents.length} agents from ERC-8004 IdentityRegistry (via totalSupply)`);
        } catch (e) {
          // If totalSupply not available, query by known owners
          if (ownerAddresses.size > 0) {
            erc8004Agents = await erc8004Service.getAllAgents(Array.from(ownerAddresses));
            console.log(`✅ Retrieved ${erc8004Agents.length} agents from ERC-8004 (by ${ownerAddresses.size} owners)`);
          } else {
            console.warn('⚠️  No owner addresses available to query ERC-8004');
          }
        }
      } else {
        console.warn('⚠️  ERC-8004 service not available');
      }
    } catch (error) {
      console.warn('⚠️  Failed to fetch agents from ERC-8004 IdentityRegistry:', error.message);
      // Continue with backend-only retrieval
    }
    
    // STEP 2: Process ERC-8004 agents and merge with backend data
    for (const ercAgent of erc8004Agents) {
      const erc8004AgentId = ercAgent.agentId;
      const ownerAddress = ercAgent.owner?.toLowerCase();
      
      // Try to find matching backend data by erc8004AgentId
      let backendData = null;
      
      // First, check agentId-based mapping (most reliable for permissioned agents)
      // Iterate through agentIdMapping and check agentId-based erc8004AgentIdMapping
      for (const [mappedAgentId, mapping] of AgentService.agentIdMapping.entries()) {
        // Check if this agentId's erc8004AgentId matches
        if (mapping.erc8004AgentId === erc8004AgentId) {
          backendData = { agentId: mappedAgentId, ...mapping };
          break;
        }
        // Check agentId-based mapping
        const agentIdKey = `agentId:${mappedAgentId}`;
        const storedByAgentId = AgentService.erc8004AgentIdMapping.get(agentIdKey);
        if (storedByAgentId && storedByAgentId.toString() === erc8004AgentId.toString()) {
          backendData = { agentId: mappedAgentId, ...mapping };
          break;
        }
      }
      
      // If still not found and owner address is unique (permissionless), try address-based mapping
      if (!backendData && ownerAddress) {
        const addressBasedId = AgentService.erc8004AgentIdMapping.get(ownerAddress);
        if (addressBasedId && addressBasedId.toString() === erc8004AgentId.toString()) {
          // Find which agentId this address belongs to (should be permissionless)
          for (const [mappedAgentId, mapping] of AgentService.agentIdMapping.entries()) {
            if (mapping.registeredAddress?.toLowerCase() === ownerAddress && 
                mapping.paymentMode === 'permissionless') {
              backendData = { agentId: mappedAgentId, ...mapping };
              break;
            }
          }
        }
      }
      
      // If not found, try matching by owner address
      if (!backendData && ownerAddress) {
        for (const [mappedAgentId, mapping] of AgentService.agentIdMapping.entries()) {
          if (mapping.registeredAddress?.toLowerCase() === ownerAddress) {
            backendData = { agentId: mappedAgentId, ...mapping };
            break;
          }
        }
      }
      
      // Determine payment mode and wallet address
      let paymentMode = 'permissioned';
      let agentWalletAddress = null;
      let finalAgentId = erc8004AgentId;
      
      // Check wallet keys (for permissionless agents like Alice/Bob)
      for (const [walletAgentId, walletInfo] of AgentService.agentWalletKeys.entries()) {
        if (walletInfo.address?.toLowerCase() === ownerAddress) {
          paymentMode = 'permissionless';
          agentWalletAddress = walletInfo.address;
          // Use walletAgentId if available, otherwise use erc8004AgentId
          if (walletAgentId && !backendData) {
            finalAgentId = walletAgentId;
          }
          break;
        }
      }
      
      // Use backend data if available
      if (backendData) {
        finalAgentId = backendData.agentId || erc8004AgentId;
        paymentMode = backendData.paymentMode || paymentMode;
        agentWalletAddress = backendData.agentWalletAddress || agentWalletAddress;
      }
      
      // Parse metadata from ERC-8004
      let parsedMetadata = {};
      try {        if (ercAgent.metadata?.agentName) {
          parsedMetadata.agentName = ercAgent.metadata.agentName;
        }
      } catch (e) {}
      
      // Build agent object
      const agent = {
        agentId: finalAgentId,
        erc8004AgentId: erc8004AgentId,
        name: backendData?.name || parsedMetadata.agentName || `Agent ${erc8004AgentId}`,
        address: ownerAddress,
        owner: ownerAddress,
        capabilities: backendData?.capabilities || [],
        metadata: backendData?.metadata || ercAgent.tokenURI || '',
        tokenURI: ercAgent.tokenURI || '',
        trustScore: backendData?.trustScore || '0',
        registeredAt: backendData?.registeredAt || new Date().toISOString(),
        isActive: true,
        paymentMode: paymentMode,
        agentWalletAddress: agentWalletAddress
      };
      
      agentMap.set(finalAgentId, agent);
    }
    
    // STEP 3: Add backend-only agents (not yet in ERC-8004, but in agentIdMapping)
    // This ensures backward compatibility and allows gradual migration
    // IMPORTANT: These are agents that are registered in our backend but may not be in ERC-8004 yet
    console.log(`📊 Processing ${AgentService.agentIdMapping.size} backend agent mappings...`);
    
    for (const [agentId, mapping] of AgentService.agentIdMapping.entries()) {
      // Skip if already added from ERC-8004
      if (agentMap.has(agentId)) {
        continue;
      }
      
      const address = mapping.registeredAddress?.toLowerCase();
      
      // Try to get ERC-8004 ID if it exists (check by address and by agentId)
      let erc8004AgentId = AgentService.erc8004AgentIdMapping.get(address || '') || null;
      if (!erc8004AgentId) {
        const agentIdKey = `agentId:${agentId}`;
        erc8004AgentId = AgentService.erc8004AgentIdMapping.get(agentIdKey) || null;
      }
      if (!erc8004AgentId && mapping.erc8004AgentId) {
        erc8004AgentId = mapping.erc8004AgentId;
      }
      
      // Check if agent has wallet key (permissionless)
      const walletKey = AgentService.agentWalletKeys.get(agentId);
      const finalPaymentMode = walletKey ? 'permissionless' : (mapping.paymentMode || 'permissioned');
      const finalWalletAddress = walletKey?.address || mapping.agentWalletAddress || null;
      
      // Ensure we have a valid address (required for frontend display)
      // For permissioned agents, registeredAddress is the backend wallet address
      // For permissionless agents, it's the agent's own wallet address
      let finalAddress = mapping.registeredAddress;
      if (!finalAddress) {
        // Fallback: use wallet address or create a display address
        finalAddress = finalWalletAddress || `walletless-${agentId}`;
      }
      
      // Create agent entry - include even if not in ERC-8004 yet (they may be registered but query failed)
      const agent = {
        name: mapping.name,
        address: finalAddress,
        owner: finalAddress, // Also include owner field for consistency
        capabilities: mapping.capabilities || [],
        metadata: mapping.metadata || '',
        trustScore: mapping.trustScore || '0',
        registeredAt: mapping.registeredAt || new Date().toISOString(),
        isActive: true,
        agentId: agentId,
        erc8004AgentId: erc8004AgentId,
        paymentMode: finalPaymentMode,
        agentWalletAddress: finalWalletAddress
      };
      
      agentMap.set(agentId, agent);
      console.log(`   ✓ Added backend agent: ${agentId} (${mapping.name}) - Address: ${finalAddress} - ERC-8004: ${erc8004AgentId || 'not found'}`);
    }
    
           console.log(`📊 Total agents after backend merge: ${agentMap.size}`);
    
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
    // Update capabilities in agentIdMapping (ERC-8004 doesn't have a direct update method)
    // In production, this would update ERC-8004 metadata or create a new registration
    this.ensureWallet();
    // For now, just return success - capabilities should be updated via re-registration with new metadata
    return { success: true, message: 'Capabilities should be updated via ERC-8004 metadata update' };
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
