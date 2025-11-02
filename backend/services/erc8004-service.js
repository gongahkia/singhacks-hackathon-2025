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
          'function register(string memory tokenUri, tuple(string key, bytes value)[] metadata) returns (uint256 agentId)',
          'function ownerOf(uint256 tokenId) view returns (address)',
          'function balanceOf(address owner) view returns (uint256)',
          'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
          'function tokenURI(uint256 tokenId) view returns (string)',
          'function getMetadata(uint256 agentId, string memory key) view returns (bytes memory)',
          'function setMetadata(uint256 agentId, string memory key, bytes memory value)',
          'function setAgentUri(uint256 agentId, string calldata newUri)',
          'function totalSupply() view returns (uint256)',
          'function tokenByIndex(uint256 index) view returns (uint256)',
          'event Registered(uint256 indexed agentId, string tokenURI, address indexed owner)',
          'event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value)',
          'event UriUpdated(uint256 indexed agentId, string newUri, address indexed updatedBy)',
          'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
        ];
        
        ReputationRegistryABI = [
          'function giveFeedback(uint256 agentId, uint8 score, bytes32 tag1, bytes32 tag2, string calldata feedbackUri, bytes32 feedbackHash, bytes calldata feedbackAuth)',
          'function revokeFeedback(uint256 agentId, uint64 feedbackIndex)',
          'function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string calldata responseUri, bytes32 responseHash)',
          'function getSummary(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2) view returns (uint64 count, uint8 averageScore)',
          'function readFeedback(uint256 agentId, address clientAddress, uint64 index) view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked)',
          'function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2, bool includeRevoked) view returns (address[] memory clients, uint8[] memory scores, bytes32[] memory tag1s, bytes32[] memory tag2s, bool[] memory revokedStatuses)',
          'function getClients(uint256 agentId) view returns (address[] memory)',
          'function getLastIndex(uint256 agentId, address clientAddress) view returns (uint64)',
          'function getIdentityRegistry() external view returns (address)',
          'event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint8 score, bytes32 indexed tag1, bytes32 tag2, string feedbackUri, bytes32 feedbackHash)',
          'event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)',
          'event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseUri, bytes32 responseHash)'
        ];
        
        ValidationRegistryABI = [
          'function validationRequest(address validatorAddress, uint256 agentId, string calldata requestUri, bytes32 requestHash)',
          'function validationResponse(bytes32 requestHash, uint8 response, string calldata responseUri, bytes32 responseHash, bytes32 tag)',
          'function getValidationStatus(bytes32 requestHash) view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, bytes32 tag, uint256 lastUpdate)',
          'function getSummary(uint256 agentId, address[] calldata validatorAddresses, bytes32 tag) view returns (uint64 count, uint8 avgResponse)',
          'function getAgentValidations(uint256 agentId) view returns (bytes32[] memory)',
          'function getValidatorRequests(address validatorAddress) view returns (bytes32[] memory)',
          'function getIdentityRegistry() external view returns (address)',
          'event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestUri, bytes32 indexed requestHash)',
          'event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseUri, bytes32 responseHash, bytes32 tag)'
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
      
      // Add timeout to registration transaction
      const tx = await Promise.race([
        registerFunc(agentURI),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Registration timeout after 20s')), 20000))
      ]);
      
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction confirmation timeout after 30s')), 30000))
      ]);
      
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
      // NOTE: Metadata setting is optional and non-blocking to avoid timeouts
      // Registration is complete after step 1, metadata can be set later
      const metadataEntries = Object.entries(metadata);
      if (metadataEntries.length > 0) {
        console.log(`Setting ${metadataEntries.length} metadata entries for agent ${agentId} (non-blocking)...`);
        
        // Set metadata in parallel with timeout to avoid blocking registration
        const metadataPromises = metadataEntries.map(async ([key, value]) => {
          try {
            const metadataTx = await Promise.race([
              contract.setMetadata(agentId, key, ethers.toUtf8Bytes(String(value))),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]);
            await Promise.race([
              metadataTx.wait(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            console.log(`  ✓ Set metadata: ${key}`);
            return { key, success: true };
          } catch (metadataError) {
            console.warn(`  ⚠️  Failed to set metadata ${key}:`, metadataError.message);
            return { key, success: false, error: metadataError.message };
          }
        });
        
        // Wait for all metadata operations (with failures being non-blocking)
        await Promise.allSettled(metadataPromises);
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
   * Generate feedbackAuth signature for ReputationRegistry
   * @param {Object} wallet - Agent owner wallet (signer)
   * @param {number} agentId - ERC-8004 agent ID
   * @param {string} clientAddress - Client address that will give feedback
   * @param {number} indexLimit - Maximum index allowed for this client
   * @param {number} expirySeconds - Expiry time in seconds from now (default 3600 = 1 hour)
   * @returns {Promise<Object>} feedbackAuth bytes ready to send
   */
  async generateFeedbackAuth(wallet, agentId, clientAddress, indexLimit = 1, expirySeconds = 3600) {
    await this.initialize();
    
    if (!this.identityRegistry) {
      throw new Error('Identity Registry not available');
    }
    
    try {
      const chainId = (await this.provider.getNetwork()).chainId;
      const expiry = Math.floor(Date.now() / 1000) + expirySeconds;
      
      // Encode FeedbackAuth struct (first 224 bytes)
      const feedbackAuthData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
        [
          agentId,
          clientAddress,
          indexLimit,
          expiry,
          chainId,
          CONTRACTS.IdentityRegistry,
          wallet.address // signerAddress
        ]
      );
      
      // Create message hash for signing (matches contract's _verifySignature)
      // Contract uses: keccak256(abi.encode(...)).toEthSignedMessageHash()
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
          [
            agentId,
            clientAddress,
            indexLimit,
            expiry,
            chainId,
            CONTRACTS.IdentityRegistry,
            wallet.address
          ]
        )
      );
      
      // Sign with EIP-191 prefix (toEthSignedMessageHash)
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));
      
      // Combine: feedbackAuth data (224 bytes) + signature (65 bytes) = 289 bytes total
      const feedbackAuthBytes = ethers.concat([feedbackAuthData, signature]);
      
      return {
        feedbackAuth: feedbackAuthBytes,
        agentId,
        clientAddress,
        indexLimit,
        expiry,
        chainId,
        signerAddress: wallet.address
      };
    } catch (error) {
      throw new Error(`Failed to generate feedbackAuth: ${error.message}`);
    }
  }

  /**
   * Submit feedback to official ReputationRegistry
   * @param {Object} wallet - Client wallet (giving feedback)
   * @param {number} agentId - ERC-8004 agent ID
   * @param {number} score - Reputation score (0-100)
   * @param {bytes32} tag1 - Optional tag1 (bytes32)
   * @param {bytes32} tag2 - Optional tag2 (bytes32)
   * @param {string} feedbackUri - Optional feedback URI (IPFS, HTTPS, etc.)
   * @param {bytes32} feedbackHash - Optional hash of feedback content
   * @param {bytes} feedbackAuth - Feedback authorization bytes (from generateFeedbackAuth)
   * @returns {Promise<Object>} Feedback submission receipt
   */
  async giveFeedback(wallet, agentId, score, tag1 = ethers.ZeroHash, tag2 = ethers.ZeroHash, feedbackUri = '', feedbackHash = ethers.ZeroHash, feedbackAuth) {
    await this.initialize();
    
    if (!this.reputationRegistry) {
      throw new Error('Reputation Registry not available');
    }
    
    if (!feedbackAuth) {
      throw new Error('feedbackAuth is required. Use generateFeedbackAuth first.');
    }
    
    try {
      const contract = this.reputationRegistry.connect(wallet);
      
      // Convert tag strings to bytes32 if needed
      let tag1Bytes = tag1;
      let tag2Bytes = tag2;
      if (typeof tag1 === 'string' && tag1.length > 0 && !tag1.startsWith('0x')) {
        tag1Bytes = ethers.id(tag1).substring(0, 66); // keccak256 hash, ensure 32 bytes
      }
      if (typeof tag2 === 'string' && tag2.length > 0 && !tag2.startsWith('0x')) {
        tag2Bytes = ethers.id(tag2).substring(0, 66);
      }
      
      const tx = await contract.giveFeedback(
        agentId,
        score,
        tag1Bytes || ethers.ZeroHash,
        tag2Bytes || ethers.ZeroHash,
        feedbackUri || '',
        feedbackHash || ethers.ZeroHash,
        feedbackAuth
      );
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        agentId,
        score
      };
    } catch (error) {
      throw new Error(`ERC-8004 feedback failed: ${error.message}`);
    }
  }

  /**
   * Get official reputation score
   * @param {number} agentId - ERC-8004 agent ID
   * @param {address[]} clientAddresses - Optional filter by client addresses
   * @param {bytes32} tag1 - Optional filter by tag1
   * @param {bytes32} tag2 - Optional filter by tag2
   * @returns {Promise<Object>} Reputation summary
   */
  async getReputationSummary(agentId, clientAddresses = [], tag1 = ethers.ZeroHash, tag2 = ethers.ZeroHash) {
    await this.initialize();
    
    if (!this.reputationRegistry) {
      throw new Error('Reputation Registry not available');
    }
    
    try {
      const summary = await this.reputationRegistry.getSummary(agentId, clientAddresses, tag1, tag2);
      const count = Number(summary.count || summary[0] || 0);
      const averageScore = Number(summary.averageScore !== undefined ? summary.averageScore : (summary[1] !== undefined ? summary[1] : 0));
      
      return {
        count,
        sum: count * averageScore,
        averageScore: averageScore
      };
    } catch (error) {
      console.warn('Failed to get reputation summary:', error.message);
      return {
        count: 0,
        sum: 0,
        averageScore: 0
      };
    }
  }

  /**
   * Read all feedback for an agent
   * @param {number} agentId - ERC-8004 agent ID
   * @param {address[]} clientAddresses - Optional filter by client addresses
   * @param {bytes32} tag1 - Optional filter by tag1
   * @param {bytes32} tag2 - Optional filter by tag2
   * @param {boolean} includeRevoked - Include revoked feedback
   * @returns {Promise<Object>} All feedback entries
   */
  async readAllFeedback(agentId, clientAddresses = [], tag1 = ethers.ZeroHash, tag2 = ethers.ZeroHash, includeRevoked = false) {
    await this.initialize();
    
    if (!this.reputationRegistry) {
      throw new Error('Reputation Registry not available');
    }
    
    try {
      const result = await this.reputationRegistry.readAllFeedback(agentId, clientAddresses, tag1, tag2, includeRevoked);
      
      return {
        clients: result.clients || result[0] || [],
        scores: result.scores || result[1] || [],
        tag1s: result.tag1s || result[2] || [],
        tag2s: result.tag2s || result[3] || [],
        revokedStatuses: result.revokedStatuses || result[4] || []
      };
    } catch (error) {
      console.warn('Failed to read feedback:', error.message);
      return {
        clients: [],
        scores: [],
        tag1s: [],
        tag2s: [],
        revokedStatuses: []
      };
    }
  }

  /**
   * Get all agents from IdentityRegistry
   * Note: ERC-721 doesn't have a direct getAllTokens, so we need to track or use events
   * This uses totalSupply() and tokenByIndex() if available, or queries by known owners
   * @param {address[]} ownerAddresses - Optional: specific owner addresses to query
   * @returns {Promise<Array>} Array of {agentId, owner, tokenURI, metadata}
   */
  async getAllAgents(ownerAddresses = []) {
    await this.initialize();
    
    if (!this.identityRegistry) {
      throw new Error('Identity Registry not available');
    }
    
    try {
      const agents = [];
      
      // Try to use totalSupply() if contract supports it (ERC721Enumerable)
      try {
        const totalSupply = await this.identityRegistry.totalSupply();
        const total = Number(totalSupply);
        
        for (let i = 0; i < total; i++) {
          try {
            const agentId = await this.identityRegistry.tokenByIndex(i);
            const owner = await this.identityRegistry.ownerOf(agentId);
            
            // Filter by owner if specified
            if (ownerAddresses.length > 0 && !ownerAddresses.includes(owner.toLowerCase())) {
              continue;
            }
            
            let tokenURI = '';
            try {
              tokenURI = await this.identityRegistry.tokenURI(agentId);
            } catch (e) {
              // Token may not have URI set
            }
            
            // Get common metadata
            const metadata = {};
            try {
              const agentNameBytes = await this.identityRegistry.getMetadata(agentId, 'agentName');
              if (agentNameBytes && agentNameBytes.length > 0) {
                metadata.agentName = ethers.toUtf8String(agentNameBytes);
              }
            } catch (e) {
              // Metadata may not be set
            }
            
            agents.push({
              agentId: agentId.toString(),
              owner: owner,
              tokenURI: tokenURI,
              metadata: metadata
            });
          } catch (e) {
            // Skip invalid tokens
            continue;
          }
        }
      } catch (e) {
        // Contract may not support Enumerable, try alternative approach
        // Query by known owner addresses
        if (ownerAddresses.length === 0) {
          console.warn('totalSupply() not available, cannot retrieve all agents without owner addresses');
          return [];
        }
        
        for (const ownerAddr of ownerAddresses) {
          try {
            const balance = await this.identityRegistry.balanceOf(ownerAddr);
            const balanceNum = Number(balance);
            
            for (let i = 0; i < balanceNum; i++) {
              try {
                const agentId = await this.identityRegistry.tokenOfOwnerByIndex(ownerAddr, i);
                const owner = await this.identityRegistry.ownerOf(agentId);
                
                let tokenURI = '';
                try {
                  tokenURI = await this.identityRegistry.tokenURI(agentId);
                } catch (e) {}
                
                const metadata = {};
                try {
                  const agentNameBytes = await this.identityRegistry.getMetadata(agentId, 'agentName');
                  if (agentNameBytes && agentNameBytes.length > 0) {
                    metadata.agentName = ethers.toUtf8String(agentNameBytes);
                  }
                } catch (e) {}
                
                agents.push({
                  agentId: agentId.toString(),
                  owner: owner,
                  tokenURI: tokenURI,
                  metadata: metadata
                });
              } catch (e) {
                continue;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      return agents;
    } catch (error) {
      throw new Error(`Failed to get all agents: ${error.message}`);
    }
  }

  /**
   * Get agent by agentId
   * @param {number|string} agentId - ERC-8004 agent ID
   * @returns {Promise<Object>} Agent information
   */
  async getAgentById(agentId) {
    await this.initialize();
    
    if (!this.identityRegistry) {
      throw new Error('Identity Registry not available');
    }
    
    try {
      const agentIdBigInt = BigInt(agentId);
      const owner = await this.identityRegistry.ownerOf(agentIdBigInt);
      
      let tokenURI = '';
      try {
        tokenURI = await this.identityRegistry.tokenURI(agentIdBigInt);
      } catch (e) {}
      
      const metadata = {};
      try {
        const agentNameBytes = await this.identityRegistry.getMetadata(agentIdBigInt, 'agentName');
        if (agentNameBytes && agentNameBytes.length > 0) {
          metadata.agentName = ethers.toUtf8String(agentNameBytes);
        }
      } catch (e) {}
      
      return {
        agentId: agentId.toString(),
        owner: owner,
        tokenURI: tokenURI,
        metadata: metadata
      };
    } catch (error) {
      throw new Error(`Failed to get agent ${agentId}: ${error.message}`);
    }
  }

  /**
   * Request validation for an agent
   * @param {Object} wallet - Agent owner wallet
   * @param {number} agentId - ERC-8004 agent ID
   * @param {address} validatorAddress - Validator address
   * @param {string} requestUri - URI pointing to validation request data
   * @param {bytes32} requestHash - Hash of request data
   * @returns {Promise<Object>} Validation request receipt
   */
  async requestValidation(wallet, agentId, validatorAddress, requestUri, requestHash = ethers.ZeroHash) {
    await this.initialize();
    
    if (!this.validationRegistry) {
      throw new Error('Validation Registry not available');
    }
    
    try {
      const contract = this.validationRegistry.connect(wallet);
      
      // If requestHash not provided, hash the requestUri
      if (requestHash === ethers.ZeroHash && requestUri) {
        requestHash = ethers.keccak256(ethers.toUtf8Bytes(requestUri));
      }
      
      const tx = await contract.validationRequest(validatorAddress, agentId, requestUri, requestHash);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        requestHash: requestHash,
        agentId,
        validatorAddress
      };
    } catch (error) {
      throw new Error(`Validation request failed: ${error.message}`);
    }
  }

  /**
   * Submit validation response
   * @param {Object} wallet - Validator wallet
   * @param {bytes32} requestHash - Original request hash
   * @param {number} response - Validation response score (0-100)
   * @param {string} responseUri - Optional URI pointing to validation response data
   * @param {bytes32} responseHash - Optional hash of response data
   * @param {bytes32} tag - Optional tag for categorization
   * @returns {Promise<Object>} Validation response receipt
   */
  async submitValidationResponse(wallet, requestHash, response, responseUri = '', responseHash = ethers.ZeroHash, tag = ethers.ZeroHash) {
    await this.initialize();
    
    if (!this.validationRegistry) {
      throw new Error('Validation Registry not available');
    }
    
    try {
      const contract = this.validationRegistry.connect(wallet);
      
      // If responseHash not provided, hash the responseUri
      if (responseHash === ethers.ZeroHash && responseUri) {
        responseHash = ethers.keccak256(ethers.toUtf8Bytes(responseUri));
      }
      
      const tx = await contract.validationResponse(requestHash, response, responseUri, responseHash, tag);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        requestHash,
        response
      };
    } catch (error) {
      throw new Error(`Validation response failed: ${error.message}`);
    }
  }

  /**
   * Get validation status
   * @param {bytes32} requestHash - Request hash
   * @returns {Promise<Object>} Validation status
   */
  async getValidationStatus(requestHash) {
    await this.initialize();
    
    if (!this.validationRegistry) {
      throw new Error('Validation Registry not available');
    }
    
    try {
      const status = await this.validationRegistry.getValidationStatus(requestHash);
      
      return {
        validatorAddress: status.validatorAddress || status[0],
        agentId: status.agentId ? status.agentId.toString() : status[1]?.toString(),
        response: Number(status.response !== undefined ? status.response : (status[2] !== undefined ? status[2] : 0)),
        responseHash: status.responseHash || status[3] || ethers.ZeroHash,
        tag: status.tag || status[4] || ethers.ZeroHash,
        lastUpdate: status.lastUpdate ? Number(status.lastUpdate) : (status[5] ? Number(status[5]) : 0)
      };
    } catch (error) {
      throw new Error(`Failed to get validation status: ${error.message}`);
    }
  }

  /**
   * Get validation summary for an agent
   * @param {number} agentId - ERC-8004 agent ID
   * @param {address[]} validatorAddresses - Optional filter by validator addresses
   * @param {bytes32} tag - Optional filter by tag
   * @returns {Promise<Object>} Validation summary
   */
  async getValidationSummary(agentId, validatorAddresses = [], tag = ethers.ZeroHash) {
    await this.initialize();
    
    if (!this.validationRegistry) {
      throw new Error('Validation Registry not available');
    }
    
    try {
      const summary = await this.validationRegistry.getSummary(agentId, validatorAddresses, tag);
      
      return {
        count: Number(summary.count || summary[0] || 0),
        avgResponse: Number(summary.avgResponse !== undefined ? summary.avgResponse : (summary[1] !== undefined ? summary[1] : 0))
      };
    } catch (error) {
      console.warn('Failed to get validation summary:', error.message);
      return {
        count: 0,
        avgResponse: 0
      };
    }
  }

  /**
   * Get all validation request hashes for an agent
   * @param {number} agentId - ERC-8004 agent ID
   * @returns {Promise<string[]>} Array of request hashes
   */
  async getAgentValidations(agentId) {
    await this.initialize();
    
    if (!this.validationRegistry) {
      throw new Error('Validation Registry not available');
    }
    
    try {
      const validations = await this.validationRegistry.getAgentValidations(agentId);
      return Array.isArray(validations) ? validations : (validations || []);
    } catch (error) {
      console.warn('Failed to get agent validations:', error.message);
      return [];
    }
  }

  /**
   * Get all validation requests for a validator
   * @param {string} validatorAddress - Validator address
   * @returns {Promise<string[]>} Array of request hashes
   */
  async getValidatorRequests(validatorAddress) {
    await this.initialize();
    
    if (!this.validationRegistry) {
      throw new Error('Validation Registry not available');
    }
    
    try {
      const requests = await this.validationRegistry.getValidatorRequests(validatorAddress);
      return Array.isArray(requests) ? requests : (requests || []);
    } catch (error) {
      console.warn('Failed to get validator requests:', error.message);
      return [];
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

