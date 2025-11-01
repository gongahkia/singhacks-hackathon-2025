// services/erc8004-service.js
const { ethers } = require('ethers');
const path = require('path');

// Official ERC-8004 Hedera Testnet deployments
const CONTRACTS = {
  IdentityRegistry: '0x4c74ebd72921d537159ed2053f46c12a7d8e5923',
  ReputationRegistry: '0xc565edcba77e3abeade40bfd6cf6bf583b3293e0',
  ValidationRegistry: '0x18df085d85c586e9241e0cd121ca422f571c2da6'
};

class ERC8004Service {
  constructor() {
    this.provider = null;
    this.identityRegistry = null;
    this.reputationRegistry = null;
    this.validationRegistry = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const RPC_URL = process.env.RPC_URL || 'https://testnet.hashio.io/api';
      this.provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Try to load ABIs from erc-8004-contracts-master
      let IdentityRegistryABI, ReputationRegistryABI, ValidationRegistryABI;
      
      try {
        // Try to load from erc-8004-contracts-master artifacts
        const identityPath = path.resolve(__dirname, '../../erc-8004-contracts-master/contracts/IdentityRegistry.sol/IdentityRegistry.json');
        const reputationPath = path.resolve(__dirname, '../../erc-8004-contracts-master/contracts/ReputationRegistry.sol/ReputationRegistry.json');
        const validationPath = path.resolve(__dirname, '../../erc-8004-contracts-master/contracts/ValidationRegistry.sol/ValidationRegistry.json');
        
        // Use minimal ABIs - avoid struct arrays which ethers.js can't parse in ABI strings
        // We'll use the two-step approach: register with URI, then setMetadata separately
        IdentityRegistryABI = [
          'function register(string memory tokenUri) returns (uint256 agentId)',
          'function register() returns (uint256 agentId)',
          'function ownerOf(uint256 tokenId) view returns (address)',
          'function getMetadata(uint256 agentId, string memory key) view returns (bytes memory)',
          'function setMetadata(uint256 agentId, string memory key, bytes memory value)',
          'function setAgentUri(uint256 agentId, string calldata newUri)',
          'event Registered(uint256 indexed agentId, string tokenURI, address indexed owner)',
          'event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value)'
        ];
        
        ReputationRegistryABI = [
          'function giveFeedback(uint256 agentId, uint8 score, bytes32 tag1, bytes32 tag2, string calldata feedbackUri, bytes32 feedbackHash, bytes calldata feedbackAuth)',
          'function getSummary(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2) view returns (uint64 count, uint8 averageScore)',
          'event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint8 score, bytes32 indexed tag1, bytes32 tag2, string feedbackUri, bytes32 feedbackHash)'
        ];
        
        ValidationRegistryABI = [
          'function requestValidation(uint256 agentId, address validator, string validationTask) returns (uint256)',
          'function submitValidation(uint256 requestId, uint256 score, string[] tags) returns (uint256)',
          'event ValidationRequested(uint256 indexed requestId, uint256 indexed agentId, address indexed validator)'
        ];
        
      } catch (abiError) {
        console.warn('Using minimal ABIs for ERC-8004 contracts');
      }

      // Initialize contracts (read-only for queries)
      this.identityRegistry = new ethers.Contract(
        CONTRACTS.IdentityRegistry,
        IdentityRegistryABI,
        this.provider
      );
      
      this.reputationRegistry = new ethers.Contract(
        CONTRACTS.ReputationRegistry,
        ReputationRegistryABI,
        this.provider
      );
      
      this.validationRegistry = new ethers.Contract(
        CONTRACTS.ValidationRegistry,
        ValidationRegistryABI,
        this.provider
      );

      console.log('✅ ERC-8004 service initialized with official contracts');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize ERC-8004 service:', error.message);
      console.warn('⚠️  ERC-8004 features will be limited');
    }
  }

  /**
   * Register agent with official ERC-8004 IdentityRegistry
   * @param {Object} wallet - Ethers wallet instance
   * @param {string} agentURI - URI pointing to agent registration file
   * @param {Object} metadata - Key-value metadata pairs
   * @returns {Promise<Object>} Registration receipt
   */
  async registerAgentIdentity(wallet, agentURI, metadata = {}) {
    await this.initialize();
    
    if (!this.identityRegistry) {
      throw new Error('Identity Registry not available');
    }
    
    try {
      const contract = this.identityRegistry.connect(wallet);
      
      // Step 1: Register with token URI only (avoids struct array issue with ethers.js)
      // Explicitly specify function signature to avoid ambiguity with register() overload
      // ethers v6 requires explicit signature when multiple overloads exist
      const registerFunc = contract.getFunction('register(string)');
      const tx = await registerFunc(agentURI);
      const receipt = await tx.wait();
      
      // Step 2: Extract agentId from event - official contract emits 'Registered' event
      let agentId = null;
      try {
        // Try to find Registered event
        const log = receipt.logs.find(l => {
          try {
            const parsed = contract.interface.parseLog(l);
            return parsed && parsed.name === 'Registered';
          } catch {
            return false;
          }
        });
        if (log) {
          const parsed = contract.interface.parseLog(log);
          agentId = parsed.args.agentId || parsed.args[0]; // Support both named and indexed access
        }
      } catch (e) {
        console.warn('Could not extract agentId from event:', e.message);
      }
      
      if (!agentId) {
        throw new Error('Could not extract agentId from registration transaction');
      }
      
      // Step 3: Set metadata separately using setMetadata calls (avoids struct array)
      const metadataEntries = Object.entries(metadata);
      if (metadataEntries.length > 0) {
        console.log(`Setting ${metadataEntries.length} metadata entries for agent ${agentId}...`);
        
        // Set each metadata entry individually
        for (const [key, value] of metadataEntries) {
          try {
            const metadataTx = await contract.setMetadata(
              agentId,
              key,
              ethers.toUtf8Bytes(String(value))
            );
            await metadataTx.wait();
            console.log(`  ✓ Set metadata: ${key}`);
          } catch (metadataError) {
            console.warn(`  ⚠️  Failed to set metadata ${key}:`, metadataError.message);
            // Continue with other metadata entries
          }
        }
      }
      
      return {
        success: true,
        txHash: receipt.hash,
        agentId: agentId.toString()
      };
    } catch (error) {
      throw new Error(`ERC-8004 registration failed: ${error.message}`);
    }
  }

  /**
   * Submit feedback to official ReputationRegistry
   * @param {Object} wallet - Ethers wallet instance  
   * @param {number} agentId - ERC-8004 agent ID
   * @param {number} score - Reputation score (0-100)
   * @param {string[]} tags - Optional tags
   * @param {string} fileRef - Optional file reference
   * @returns {Promise<Object>} Feedback submission receipt
   */
  async submitOfficialFeedback(wallet, agentId, score, tags = [], fileRef = '') {
    await this.initialize();
    
    if (!this.reputationRegistry) {
      throw new Error('Reputation Registry not available');
    }
    
    try {
      const contract = this.reputationRegistry.connect(wallet);
      const tx = await contract.giveFeedback(agentId, score, tags, fileRef);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error) {
      throw new Error(`ERC-8004 feedback failed: ${error.message}`);
    }
  }

  /**
   * Get official reputation score
   * @param {number} agentId - ERC-8004 agent ID
   * @returns {Promise<Object>} Reputation summary
   */
  async getOfficialReputation(agentId) {
    await this.initialize();
    
    if (!this.reputationRegistry) {
      throw new Error('Reputation Registry not available');
    }
    
    try {
      // Official contract signature: getSummary(agentId, clientAddresses, tag1, tag2)
      // Returns: (uint64 count, uint8 averageScore)
      const summary = await this.reputationRegistry.getSummary(agentId, [], ethers.ZeroHash, ethers.ZeroHash);
      const count = Number(summary.count || summary[0] || 0);
      const averageScore = Number(summary.averageScore !== undefined ? summary.averageScore : (summary[1] !== undefined ? summary[1] : 0));
      
      return {
        count,
        sum: count * averageScore, // Calculate sum for backward compatibility
        averageScore: averageScore
      };
    } catch (error) {
      console.warn('Failed to get official reputation:', error.message);
      return {
        count: 0,
        sum: 0,
        averageScore: 0
      };
    }
  }

  /**
   * Check if ERC-8004 service is available
   */
  isAvailable() {
    return this.initialized && this.identityRegistry !== null;
  }

  /**
   * Get contract addresses
   */
  getContractAddresses() {
    return CONTRACTS;
  }
}

module.exports = new ERC8004Service();

