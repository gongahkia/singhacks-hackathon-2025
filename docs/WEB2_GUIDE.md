# 🟢 Web2 Developer Guide
## Backend API & Services (Developer 2)

---

## 👤 Your Role

**Focus**: Backend API, Hedera SDK integration, business logic, HCS messaging

**Your Workspace**: `/backend` folder

**Timeline Focus**: Hours 1-24 (API development & integration)

**Key Deliverables**:
- ✅ Express.js REST API
- ✅ Hedera SDK client wrapper
- ✅ Agent service layer
- ✅ Payment service layer
- ✅ HCS (Consensus Service) integration
- ✅ Mirror Node queries

---

## ⏰ Your 48-Hour Timeline

### Day 1

| Hours | Tasks | Deliverables |
|-------|-------|--------------|
| **0-3** | Setup Express, create structure | Server running |
| **3-6** | Hedera SDK client, HCS setup | Can create topics |
| **6-12** | Agent service & routes | Agent registration API works |
| **12-18** | Payment service & routes | Payment API works |
| **18-24** | Integration, error handling | Full API functional |

### Day 2

| Hours | Tasks | Focus |
|-------|-------|-------|
| **24-30** | Add caching, optimization | Performance |
| **30-36** | Fix bugs, add validation | Stability |
| **36-48** | Help with demo, monitoring | Support |

---

## 📁 Your File Structure

```
backend/
├── server.js                    # Main Express app
├── routes/
│   ├── agents.js               # Agent CRUD endpoints
│   ├── payments.js             # Payment endpoints
│   └── messages.js             # HCS messaging endpoints
├── services/
│   ├── hedera-client.js        # Hedera SDK wrapper
│   ├── agent-service.js        # Agent business logic
│   ├── payment-service.js      # Payment business logic
│   └── hcs-service.js          # HCS integration
├── utils/
│   ├── validation.js           # Input validation
│   └── error-handler.js        # Error middleware
└── package.json
```

---

## 🪙 HTS Stablecoin & Token Support (Required by README)

Add token operations to handle stablecoin transfers and balances.

### Token Service Utilities

Create `services/token-service.js`:

```javascript
const {
  TokenAssociateTransaction,
  AccountBalanceQuery,
  TransferTransaction,
  TokenId,
} = require('@hashgraph/sdk');
const hederaClient = require('./hedera-client');

class TokenService {
  async associateToken(accountId, privateKey, tokenId) {
    // Parse private key string to PrivateKey object if needed
    const { PrivateKey } = require('@hashgraph/sdk');
    const privateKeyObj = (typeof privateKey === 'string')
      ? (privateKey.startsWith('0x') 
          ? PrivateKey.fromStringECDSA(privateKey) 
          : PrivateKey.fromString(privateKey))
      : privateKey; // Already a PrivateKey object
    
    const tx = await new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([TokenId.fromString(tokenId)])
      .freezeWith(hederaClient.client)
      .sign(privateKeyObj);

    const receipt = await (await tx.execute(hederaClient.client)).getReceipt(hederaClient.client);
    return { status: receipt.status.toString() };
  }

  async getBalances(accountId, tokenId) {
    const bal = await new AccountBalanceQuery().setAccountId(accountId).execute(hederaClient.client);
    const tokenBalance = bal.tokens._map.get(TokenId.fromString(tokenId).toString()) || 0;
    return { hbar: bal.hbars.toString(), tokenBalance };
  }

  async transferToken(tokenId, fromId, fromKey, toId, amount) {
    // Parse private key string to PrivateKey object
    const { PrivateKey } = require('@hashgraph/sdk');
    const privateKeyObj = fromKey.startsWith('0x') 
      ? PrivateKey.fromStringECDSA(fromKey)  // ECDSA format
      : PrivateKey.fromString(fromKey);     // Ed25519 DER format
    
    const tx = await new TransferTransaction()
      .addTokenTransfer(tokenId, fromId, -amount)
      .addTokenTransfer(tokenId, toId, amount)
      .freezeWith(hederaClient.client)
      .sign(privateKeyObj);

    const receipt = await (await tx.execute(hederaClient.client)).getReceipt(hederaClient.client);
    return { status: receipt.status.toString() };
  }
}

module.exports = new TokenService();
```

### Token Routes

Create `routes/tokens.js`:

```javascript
const express = require('express');
const router = express.Router();
const tokenService = require('../services/token-service');

// GET balances (HBAR + token)
router.get('/:accountId/balances/:tokenId', async (req, res, next) => {
  try {
    const result = await tokenService.getBalances(req.params.accountId, req.params.tokenId);
    res.json(result);
  } catch (e) { next(e); }
});

// POST transfer fungible token
router.post('/transfer', async (req, res, next) => {
  try {
    const { tokenId, fromId, fromKey, toId, amount } = req.body;
    if (!tokenId || !fromId || !fromKey || !toId || !amount) {
      return res.status(400).json({ error: 'tokenId, fromId, fromKey, toId, amount required' });
    }
    const result = await tokenService.transferToken(tokenId, fromId, fromKey, toId, Number(amount));
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
```

Wire it in `server.js`:

```javascript
const tokenRoutes = require('./routes/tokens');
app.use('/api/tokens', tokenRoutes);
```

---

## 💳 x402 Payment Flow (HTTP 402) (Required by README)

Implement a minimal 402 challenge + settlement verification using Hedera.

### x402 Routes

Create `routes/x402.js`:

```javascript
const express = require('express');
const router = express.Router();
const hederaClient = require('../services/hedera-client');

// Issue 402 challenge
router.post('/challenge', async (req, res) => {
  const { amountHbar, memo } = req.body;
  const challenge = {
    status: 402,
    payment: {
      network: process.env.HEDERA_NETWORK || 'testnet',
      asset: 'HBAR',
      amount: amountHbar,
      memo: memo || 'x402-payment',
      payTo: hederaClient.accountId.toString(),
    }
  };
  res.status(402).json(challenge);
});

// Verify settlement via mirror node
router.post('/verify', async (req, res, next) => {
  try {
    const { txId, expectedAmount, expectedPayTo } = req.body;
    if (!txId) return res.status(400).json({ error: 'txId required' });
    
    const tx = await hederaClient.getTransaction(txId);
    const success = (tx.result === 'SUCCESS') || (tx.status === 'SUCCESS');
    if (!success) return res.status(400).json({ error: 'Settlement not found or failed' });
    
    // Enhanced verification: Check if payment matches challenge
    // Look for crypto transfers to expectedPayTo with expectedAmount
    if (expectedPayTo && expectedAmount) {
      const transfers = tx.transfers || [];
      const matchingTransfer = transfers.find(t => 
        t.account === expectedPayTo && 
        parseFloat(t.amount) >= parseFloat(expectedAmount)
      );
      if (!matchingTransfer) {
        return res.status(400).json({ 
          error: 'Payment amount or recipient mismatch',
          expected: { payTo: expectedPayTo, amount: expectedAmount }
        });
      }
    }
    
    return res.json({ verified: true, tx });
  } catch (e) { next(e); }
});

module.exports = router;
```

Wire it in `server.js`:

```javascript
const x402Routes = require('./routes/x402');
app.use('/api/x402', x402Routes);
```

---

## 🛠️ Setup (Hour 0-3)

### Install Dependencies

```bash
cd backend
npm init -y
npm install express cors dotenv
npm install @hashgraph/sdk ethers axios
npm install --save-dev nodemon
```

### Package.json Scripts

Update `package.json`:

```json
{
  "name": "hedera-agent-economy-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "@hashgraph/sdk": "^2.40.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "ethers": "^6.9.0",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## 🚀 Main Server (Hour 1-3)

Create `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const agentRoutes = require('./routes/agents');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    network: process.env.HEDERA_NETWORK,
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Hedera Agent Economy Backend');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌐 Network: ${process.env.HEDERA_NETWORK}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
```

### Test Server

```bash
npm run dev
# Visit: http://localhost:3001/api/health
```

---

## 🔑 Wallet Verification (WalletConnect) — Identity

Add a signature verification endpoint to confirm wallet ownership before sensitive actions (e.g., agent registration).

### Message Schema (frontend signs)

```json
{
  "action": "registerAgent",
  "name": "<agentName>",
  "capabilities": ["smart-contracts"],
  "timestamp": "<iso-8601>"
}
```

### Endpoint: `POST /api/auth/verify-signature`

```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

router.post('/verify-signature', async (req, res) => {
  const { accountId, evmAddress, message, signature } = req.body;
  if (!message || !signature) return res.status(400).json({ error: 'message and signature required' });

  // Recover signer from signature
  const recovered = ethers.verifyMessage(JSON.stringify(message), signature);
  if (evmAddress && recovered.toLowerCase() !== evmAddress.toLowerCase()) {
    return res.status(400).json({ verified: false, error: 'address mismatch' });
  }

  // Optionally map Hedera accountId ↔ evmAddress via mirror node if provided
  // Accept if recovered address matches the expected wallet address
  return res.json({ verified: true, recovered });
});

module.exports = router;
```

Wire it in `server.js`:

```javascript
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
```

Usage: Frontend signs the JSON with the connected wallet and posts `{ accountId, evmAddress, message, signature }`. On success, proceed with `agent-service.registerAgent`.

---

## 🔗 Hedera SDK Client (Hour 3-6)

Create `services/hedera-client.js`:

```javascript
const {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Hbar
} = require('@hashgraph/sdk');

class HederaClient {
  constructor() {
    this.client = null;
    this.accountId = null;
    this.privateKey = null;
    this.topicId = null;
    this.initialize();
  }

  /**
   * Initialize Hedera client
   */
  initialize() {
    try {
      this.accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
      this.privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);

      // Connect to network
      if (process.env.HEDERA_NETWORK === 'testnet') {
        this.client = Client.forTestnet();
      } else if (process.env.HEDERA_NETWORK === 'mainnet') {
        this.client = Client.forMainnet();
      } else {
        throw new Error('Invalid HEDERA_NETWORK');
      }

      this.client.setOperator(this.accountId, this.privateKey);
      
      console.log('✅ Hedera client initialized');
      console.log(`📍 Account: ${this.accountId.toString()}`);
    } catch (error) {
      console.error('❌ Failed to initialize Hedera client:', error);
      throw error;
    }
  }

  /**
   * Create a new HCS topic
   */
  async createTopic(memo) {
    try {
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setMaxTransactionFee(new Hbar(2));

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const topicId = receipt.topicId;

      console.log(`✅ Created topic: ${topicId.toString()}`);
      return topicId.toString();
    } catch (error) {
      console.error('❌ Failed to create topic:', error);
      throw error;
    }
  }

  /**
   * Submit a message to HCS topic
   */
  async submitMessage(topicId, message) {
    try {
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`✅ Message submitted to topic ${topicId}`);
      return {
        topicId,
        sequenceNumber: receipt.topicSequenceNumber.toString(),
        status: receipt.status.toString()
      };
    } catch (error) {
      console.error('❌ Failed to submit message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to topic messages
   */
  async subscribeToTopic(topicId, callback) {
    try {
      new TopicMessageQuery()
        .setTopicId(topicId)
        .setStartTime(0)
        .subscribe(this.client, null, (message) => {
          const messageString = Buffer.from(message.contents).toString();
          callback({
            consensusTimestamp: message.consensusTimestamp.toString(),
            message: messageString,
            sequenceNumber: message.sequenceNumber.toString()
          });
        });

      console.log(`✅ Subscribed to topic ${topicId}`);
    } catch (error) {
      console.error('❌ Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId = null) {
    try {
      const targetAccount = accountId 
        ? AccountId.fromString(accountId) 
        : this.accountId;
      
      const balance = await this.client.getAccountBalance(targetAccount);
      
      return {
        account: targetAccount.toString(),
        hbar: balance.hbars.toString()
      };
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Query Mirror Node
   */
  async queryMirrorNode(endpoint) {
    try {
      const axios = require('axios');
      const url = `${process.env.MIRROR_NODE_URL}${endpoint}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ Mirror Node query failed:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId) {
    const endpoint = `/transactions/${transactionId}`;
    return await this.queryMirrorNode(endpoint);
  }

  /**
   * Get account transactions
   */
  async getAccountTransactions(accountId, limit = 10) {
    const endpoint = `/accounts/${accountId}/transactions?limit=${limit}`;
    return await this.queryMirrorNode(endpoint);
  }
}

module.exports = new HederaClient();
```

---

## 🤖 Agent Service (Hour 6-12)

Create `services/agent-service.js`:

```javascript
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

// Load contract info
const AgentRegistryABI = require('../../contracts/artifacts/contracts/src/AgentRegistry.sol/AgentRegistry.json').abi;
const deploymentInfo = require('../../contracts/deployment.json');

class AgentService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // Use ECDSA key for ethers.js (EVM compatibility)
    // HEDERA_PRIVATE_KEY is Ed25519 for Hedera SDK; EVM_PRIVATE_KEY is ECDSA for ethers
    this.wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY, this.provider);
    
    this.agentRegistry = new ethers.Contract(
      deploymentInfo.contracts.AgentRegistry,
      AgentRegistryABI,
      this.wallet
    );

    console.log('✅ Agent service initialized');
    console.log(`📍 AgentRegistry: ${deploymentInfo.contracts.AgentRegistry}`);
  }

  /**
   * Register a new agent
   */
  async registerAgent(name, capabilities, metadata = '') {
    try {
      console.log(`📝 Registering agent: ${name}`);
      
      const tx = await this.agentRegistry.registerAgent(
        name,
        capabilities,
        metadata
      );
      
      const receipt = await tx.wait();
      
      // Log to HCS
      if (process.env.AGENT_TOPIC_ID) {
        await hederaClient.submitMessage(
          process.env.AGENT_TOPIC_ID,
          JSON.stringify({
            event: 'AgentRegistered',
            agent: this.wallet.address,
            name,
            capabilities,
            timestamp: new Date().toISOString()
          })
        );
      }

      return {
        success: true,
        txHash: receipt.hash,
        agentAddress: this.wallet.address,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('❌ Failed to register agent:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Get agent details
   */
  async getAgent(agentAddress) {
    try {
      const agent = await this.agentRegistry.getAgent(agentAddress);
      
      return {
        name: agent.name,
        address: agent.agentAddress,
        capabilities: agent.capabilities,
        metadata: agent.metadata,
        trustScore: agent.trustScore.toString(),
        registeredAt: new Date(Number(agent.registeredAt) * 1000).toISOString(),
        isActive: agent.isActive
      };
    } catch (error) {
      console.error('❌ Failed to get agent:', error);
      throw new Error(`Agent not found: ${error.message}`);
    }
  }

  /**
   * Search agents by capability
   */
  async searchAgents(capability) {
    try {
      const agentAddresses = await this.agentRegistry.searchByCapability(capability);
      
      // Fetch details for each agent
      const agents = await Promise.all(
        agentAddresses.map(address => this.getAgent(address))
      );

      return agents;
    } catch (error) {
      console.error('❌ Failed to search agents:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get all registered agents
   */
  async getAllAgents() {
    try {
      const agentAddresses = await this.agentRegistry.getAllAgents();
      
      const agents = await Promise.all(
        agentAddresses.map(address => this.getAgent(address))
      );

      return agents;
    } catch (error) {
      console.error('❌ Failed to get all agents:', error);
      throw new Error(`Failed to retrieve agents: ${error.message}`);
    }
  }

  /**
   * Update agent capabilities
   */
  async updateCapabilities(newCapabilities) {
    try {
      const tx = await this.agentRegistry.updateCapabilities(newCapabilities);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ Failed to update capabilities:', error);
      throw new Error(`Update failed: ${error.message}`);
    }
  }
}

module.exports = new AgentService();
```

---

## 💰 Payment Service (Hour 12-18)

Create `services/payment-service.js`:

```javascript
const { ethers } = require('ethers');
const hederaClient = require('./hedera-client');

const PaymentProcessorABI = require('../../contracts/artifacts/contracts/src/PaymentProcessor.sol/PaymentProcessor.json').abi;
const deploymentInfo = require('../../contracts/deployment.json');

class PaymentService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // Use ECDSA key for ethers.js (EVM compatibility)
    // HEDERA_PRIVATE_KEY is Ed25519 for Hedera SDK; EVM_PRIVATE_KEY is ECDSA for ethers
    this.wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY, this.provider);
    
    this.paymentProcessor = new ethers.Contract(
      deploymentInfo.contracts.PaymentProcessor,
      PaymentProcessorABI,
      this.wallet
    );

    console.log('✅ Payment service initialized');
    console.log(`📍 PaymentProcessor: ${deploymentInfo.contracts.PaymentProcessor}`);
  }

  /**
   * Create an escrow payment
   */
  async createEscrow(payee, amountInHbar, description) {
    try {
      console.log(`💰 Creating escrow: ${amountInHbar} HBAR to ${payee}`);
      
      const amount = ethers.parseEther(amountInHbar.toString());
      
      const tx = await this.paymentProcessor.createEscrow(
        payee,
        description,
        { value: amount }
      );
      
      const receipt = await tx.wait();
      
      // Get escrow ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.paymentProcessor.interface.parseLog(log);
          return parsed.name === 'EscrowCreated';
        } catch {
          return false;
        }
      });

      const parsedEvent = this.paymentProcessor.interface.parseLog(event);
      const escrowId = parsedEvent.args.escrowId;

      // Log to HCS
      if (process.env.PAYMENT_TOPIC_ID) {
        await hederaClient.submitMessage(
          process.env.PAYMENT_TOPIC_ID,
          JSON.stringify({
            event: 'EscrowCreated',
            escrowId,
            payer: this.wallet.address,
            payee,
            amount: amountInHbar,
            timestamp: new Date().toISOString()
          })
        );
      }

      return {
        success: true,
        escrowId,
        txHash: receipt.hash,
        amount: amountInHbar
      };
    } catch (error) {
      console.error('❌ Failed to create escrow:', error);
      throw new Error(`Escrow creation failed: ${error.message}`);
    }
  }

  /**
   * Release escrow payment
   */
  async releaseEscrow(escrowId) {
    try {
      console.log(`✅ Releasing escrow: ${escrowId}`);
      
      const tx = await this.paymentProcessor.releaseEscrow(escrowId);
      const receipt = await tx.wait();

      // Log to HCS
      if (process.env.PAYMENT_TOPIC_ID) {
        await hederaClient.submitMessage(
          process.env.PAYMENT_TOPIC_ID,
          JSON.stringify({
            event: 'EscrowReleased',
            escrowId,
            timestamp: new Date().toISOString()
          })
        );
      }

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ Failed to release escrow:', error);
      throw new Error(`Escrow release failed: ${error.message}`);
    }
  }

  /**
   * Refund escrow payment
   */
  async refundEscrow(escrowId) {
    try {
      console.log(`🔄 Refunding escrow: ${escrowId}`);
      
      const tx = await this.paymentProcessor.refundEscrow(escrowId);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ Failed to refund escrow:', error);
      throw new Error(`Escrow refund failed: ${error.message}`);
    }
  }

  /**
   * Get escrow details
   */
  async getEscrow(escrowId) {
    try {
      const escrow = await this.paymentProcessor.getEscrow(escrowId);
      
      return {
        escrowId,
        payer: escrow.payer,
        payee: escrow.payee,
        amount: ethers.formatEther(escrow.amount),
        serviceDescription: escrow.serviceDescription,
        status: ['Active', 'Completed', 'Refunded', 'Disputed'][escrow.status],
        createdAt: new Date(Number(escrow.createdAt) * 1000).toISOString(),
        completedAt: escrow.completedAt > 0 
          ? new Date(Number(escrow.completedAt) * 1000).toISOString() 
          : null
      };
    } catch (error) {
      console.error('❌ Failed to get escrow:', error);
      throw new Error(`Escrow not found: ${error.message}`);
    }
  }

  /**
   * Get all escrows for payer
   */
  async getPayerEscrows(payerAddress) {
    try {
      const escrowIds = await this.paymentProcessor.getPayerEscrows(payerAddress);
      
      const escrows = await Promise.all(
        escrowIds.map(id => this.getEscrow(id))
      );

      return escrows;
    } catch (error) {
      console.error('❌ Failed to get payer escrows:', error);
      throw new Error(`Failed to retrieve escrows: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();
```

---

## 🛣️ API Routes (Hour 6-18)

### Agent Routes

Create `routes/agents.js`:

```javascript
const express = require('express');
const router = express.Router();
const agentService = require('../services/agent-service');

// Register a new agent
router.post('/', async (req, res, next) => {
  try {
    const { name, capabilities, metadata } = req.body;
    
    if (!name || !capabilities || !Array.isArray(capabilities) || capabilities.length === 0) {
      return res.status(400).json({ 
        error: 'Name and capabilities array are required' 
      });
    }

    const result = await agentService.registerAgent(name, capabilities, metadata || '');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get all agents
router.get('/', async (req, res, next) => {
  try {
    const agents = await agentService.getAllAgents();
    res.json({ agents, count: agents.length });
  } catch (error) {
    next(error);
  }
});

// Search agents by capability
router.get('/search', async (req, res, next) => {
  try {
    const { capability } = req.query;
    
    if (!capability) {
      return res.status(400).json({ error: 'Capability parameter required' });
    }

    const agents = await agentService.searchAgents(capability);
    res.json({ agents, capability, count: agents.length });
  } catch (error) {
    next(error);
  }
});

// Get specific agent
router.get('/:address', async (req, res, next) => {
  try {
    const agent = await agentService.getAgent(req.params.address);
    res.json(agent);
  } catch (error) {
    next(error);
  }
});

// Update agent capabilities
router.put('/capabilities', async (req, res, next) => {
  try {
    const { capabilities } = req.body;
    
    if (!capabilities || !Array.isArray(capabilities)) {
      return res.status(400).json({ error: 'Capabilities array required' });
    }

    const result = await agentService.updateCapabilities(capabilities);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Payment Routes

Create `routes/payments.js`:

```javascript
const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment-service');

// Create escrow payment
router.post('/', async (req, res, next) => {
  try {
    const { payee, amount, description } = req.body;
    
    if (!payee || !amount || !description) {
      return res.status(400).json({ 
        error: 'Payee, amount, and description are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const result = await paymentService.createEscrow(payee, amount, description);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Release escrow
router.post('/:escrowId/release', async (req, res, next) => {
  try {
    const result = await paymentService.releaseEscrow(req.params.escrowId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Refund escrow
router.post('/:escrowId/refund', async (req, res, next) => {
  try {
    const result = await paymentService.refundEscrow(req.params.escrowId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get escrow details
router.get('/:escrowId', async (req, res, next) => {
  try {
    const escrow = await paymentService.getEscrow(req.params.escrowId);
    res.json(escrow);
  } catch (error) {
    next(error);
  }
});

// Get payer's escrows
router.get('/payer/:address', async (req, res, next) => {
  try {
    const escrows = await paymentService.getPayerEscrows(req.params.address);
    res.json({ escrows, count: escrows.length });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Message Routes

Create `routes/messages.js`:

```javascript
const express = require('express');
const router = express.Router();
const hederaClient = require('../services/hedera-client');

// Create new topic
router.post('/topics', async (req, res, next) => {
  try {
    const { memo } = req.body;
    const topicId = await hederaClient.createTopic(memo || 'Agent messages');
    res.json({ topicId });
  } catch (error) {
    next(error);
  }
});

// Submit message to topic
router.post('/topics/:topicId/messages', async (req, res, next) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const result = await hederaClient.submitMessage(req.params.topicId, message);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Token Routes (new)

See `routes/tokens.js` above. Test quickly:

```bash
curl http://localhost:3001/api/tokens/{accountId}/balances/{tokenId}
```

### x402 Routes (new)

Issue challenge and verify:

```bash
curl -X POST http://localhost:3001/api/x402/challenge -H "Content-Type: application/json" -d '{"amountHbar": "1"}' -i
curl -X POST http://localhost:3001/api/x402/verify -H "Content-Type: application/json" -d '{"txId": "<transactionId>"}'
```

---

## ✅ Your Checklist

### Hour 0-3: Setup
- [ ] Install dependencies
- [ ] Create server.js
- [ ] Test health endpoint
- [ ] Setup environment variables

### Hour 3-6: Hedera Client
- [ ] Create hedera-client.js
- [ ] Test connection to Hedera
- [ ] Create HCS topic
- [ ] Test message submission

### Hour 6-12: Agent Service
- [ ] Create agent-service.js
- [ ] Create agent routes
- [ ] Test agent registration
- [ ] Test agent queries

### Hour 12-18: Payment Service
- [ ] Create payment-service.js
- [ ] Create payment routes
- [ ] Test escrow creation
- [ ] Test escrow release

### Hour 12-18: Tokens & x402 (New)
- [ ] Implement token-service and routes
- [ ] Implement x402 challenge and verify endpoints
- [ ] Add basic input validation

### Hour 18-24: Integration
- [ ] Connect all services
- [ ] Add error handling
- [ ] Test all endpoints
- [ ] Add logging
 - [ ] Add mirror node verification loop for payments

### Day 2: Polish
- [ ] Add validation
- [ ] Optimize queries
- [ ] Fix bugs
- [ ] Add documentation
 - [ ] Add identity verification for agent registration (signed message)

---

## 🧪 Testing Your API

```bash
# Health check
curl http://localhost:3001/api/health

# Register agent
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Agent","capabilities":["smart-contracts"],"metadata":""}'

# Get all agents
curl http://localhost:3001/api/agents

# Create payment
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -d '{"payee":"0x...","amount":"10","description":"Test payment"}'
```

---

## 🚨 Common Issues

### "Cannot find module"
```bash
npm install <missing-module>
```

### "Connection refused"
Check `.env` file has correct values

### "Transaction reverted"
Check contract is deployed and address is correct in deployment.json

### "Invalid private key" or "invalid signature" with ethers.js
- **Issue**: Using Ed25519 key (`302e...`) with `ethers.Wallet()` won't work
- **Fix**: Use `EVM_PRIVATE_KEY` (ECDSA, starts with `0x`) for ethers.js operations
- **Note**: Hedera SDK operations (HCS, HTS) should use `HEDERA_PRIVATE_KEY` (Ed25519)

### "Cannot sign transaction" in token-service
- **Issue**: Passing key string directly to `.sign()` instead of PrivateKey object
- **Fix**: Parse key first: `PrivateKey.fromString(key)` or `PrivateKey.fromStringECDSA(key)` based on format

---

## 📚 Resources

- **Hedera SDK**: https://github.com/hiero-ledger/hiero-sdk-js
- **Express.js**: https://expressjs.com/
- **Ethers.js**: https://docs.ethers.org/v6/

---

## 🗺️ Roadmap & Backend TODOs (Scoring-Aligned)

### Day 1 (Foundation: Feasibility, Technical Depth)
- [ ] Stand up `server.js` with health check and CORS
- [ ] **KEY SETUP**: Configure `EVM_PRIVATE_KEY` (ECDSA, hex format `0x...`) for ethers.js; `HEDERA_PRIVATE_KEY` (Ed25519, DER format `302e...`) for Hedera SDK operations
- [ ] Implement services: `hedera-client` (uses Ed25519), `agent-service` (uses ECDSA via ethers), `payment-service` (uses ECDSA via ethers)
- [ ] Routes: `/api/agents`, `/api/payments`, `/api/messages`
- [ ] Identity: `POST /api/auth/verify-signature` (wallet verifies)
- [ ] Tokens: `/api/tokens/:accountId/balances/:tokenId`, `/api/tokens/transfer` (fix: parse private key string to PrivateKey object)
- [ ] x402: `POST /api/x402/challenge`, `POST /api/x402/verify` (enhanced: verify payment amount and recipient match challenge)
- [ ] E2E sanity: register agent, create escrow, release, verify on HashScan

### Day 2 (Polish: Creativity, Reachability, Visual Design support)
- [ ] Add HCS message retrieval for timelines:
  - `GET /api/messages/topics/:topicId/messages` (mirror node fetch + normalize)
- [ ] Add payment status endpoint:
  - `GET /api/payments/status/:escrowId` (mirror node verify + status map)
- [ ] Add pagination/filtering support to `/api/agents` and `/api/agents/search`
- [ ] Logging & error shape: consistent `{ error, details? }` responses
- [ ] Rate limits/basic validation (protect demo stability)
- [ ] Enable simple polling hints (e.g., `updatedAt` in responses)

### ⚠️ Important: Key Format Notes
- **Hedera SDK operations** (HCS, HTS, native Hedera): Use `HEDERA_PRIVATE_KEY` (Ed25519 DER format)
- **ethers.js operations** (smart contracts): Use `EVM_PRIVATE_KEY` (ECDSA hex format starting with `0x`)
- **Token transfers**: Parse key string properly - detect format and use `PrivateKey.fromString()` or `PrivateKey.fromStringECDSA()`

### Stretch (If Time)
- [ ] WebSocket/SSE channel for real-time updates (agents/payments)
- [ ] Caching layer for mirror node reads (in-memory)
- [ ] Configurable topic IDs exposed via `/api/health`

### Hand-off Guarantees to Frontend
- [ ] Stable response shapes (documented above in routes)
- [ ] HashScan-ready `txHash` where applicable
- [ ] Clear error messages (actionable)

**You're the glue between blockchain and frontend! 🚀**

