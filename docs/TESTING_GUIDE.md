# 🧪 Testing and Demonstration Guide
## Agent-to-Agent Payment and Communication

This guide explains how to test and demonstrate the agent-to-agent payment and communication features using both the REST API and Hedera MCP tools.

---

## 📋 Table of Contents

1. [Quick Start Testing](#quick-start-testing)
2. [Using REST API](#using-rest-api)
3. [Using Hedera MCP Tools](#using-hedera-mcp-tools)
4. [Complete Demo Flow](#complete-demo-flow)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start Testing

### Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   npm run dev
   # Server should be running on http://localhost:3001
   ```

2. **Contracts Deployed**
   ```bash
   cd contracts
   npx hardhat run deploy/deploy.js --network hedera_testnet
   # This creates/updates deployment.json
   ```

3. **Environment Variables Configured**
   ```env
   HEDERA_ACCOUNT_ID=0.0.xxxxx
   HEDERA_PRIVATE_KEY=302e...
   EVM_PRIVATE_KEY=0x...
   RPC_URL=https://testnet.hashio.io/api
   MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1
   HEDERA_NETWORK=testnet
   ```

### Run Automated Demo

```bash
# Install test dependencies
npm install axios

# Run the demo script
node tests/integration/a2a-payment-demo.js
```

This script will:
1. ✅ Register two agents (Alice and Bob)
2. ✅ Discover agents by capability
3. ✅ Initiate A2A communication
4. ✅ Create payment escrow
5. ✅ Release escrow and establish trust
6. ✅ Verify on-chain transactions
7. ✅ Generate summary report

---

## 🔌 Using REST API

### Step 1: Register Agents

```bash
# Register Agent 1 (Alice)
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "capabilities": ["smart-contracts", "payments"],
    "metadata": "{\"specialization\": \"Smart contract development\"}"
  }'

# Register Agent 2 (Bob)
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob",
    "capabilities": ["payments", "api-integration"],
    "metadata": "{\"specialization\": \"Payment processing\"}"
  }'
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "agentAddress": "0xAgent1Address"
}
```

### Step 2: Discover Agents

```bash
# Search agents by capability
curl "http://localhost:3001/api/agents/search?capability=payments"

# Get specific agent details
curl "http://localhost:3001/api/agents/0xAgent1Address"
```

### Step 3: Initiate A2A Communication

```bash
curl -X POST http://localhost:3001/api/a2a/communicate \
  -H "Content-Type: application/json" \
  -d '{
    "fromAgent": "0xAgent1Address",
    "toAgent": "0xAgent2Address",
    "capability": "payments"
  }'
```

**Response:**
```json
{
  "success": true,
  "interactionId": "0x...",
  "txHash": "0x...",
  "fromAgent": "0xAgent1Address",
  "toAgent": "0xAgent2Address",
  "capability": "payments"
}
```

**Note:** Target agent must have trust score ≥ 40.

### Step 4: Create Payment Escrow

```bash
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "payee": "0xAgent2Address",
    "amount": "10",
    "description": "Payment for service completion"
  }'
```

**Response:**
```json
{
  "success": true,
  "escrowId": "0x...",
  "txHash": "0x...",
  "amount": "10"
}
```

### Step 5: Release Escrow

```bash
curl -X POST http://localhost:3001/api/payments/0xEscrowId/release
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x..."
}
```

**Note:** This automatically establishes trust (+2 points) for both agents.

### Step 6: Complete A2A Interaction

```bash
curl -X POST http://localhost:3001/api/a2a/interactions/0xInteractionId/complete
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "interactionId": "0x..."
}
```

**Note:** This adds +1 trust point to both agents.

### Step 7: Verify and Query

```bash
# Get interaction details
curl http://localhost:3001/api/a2a/interactions/0xInteractionId

# Get agent interaction history
curl http://localhost:3001/api/a2a/agents/0xAgentAddress/interactions

# Get agent reputation
curl http://localhost:3001/api/reputation/agents/0xAgentAddress/reputation

# Get escrow details
curl http://localhost:3001/api/payments/0xEscrowId
```

---

## 🛠️ Using Hedera MCP Tools

The Hedera MCP server provides direct access to Hedera blockchain operations. Here's how to use it for testing:

### 1. Check Account Balance

```javascript
// Using Hedera MCP tool
const balance = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
  accountId: "0.0.xxxxx" // Optional, defaults to operator account
});

console.log(`Balance: ${balance.balance} HBAR`);
```

### 2. Create Test Accounts

```javascript
// Create Account 1
const account1 = await mcp_hedera-mcp-server_create_account_tool({
  initialBalance: 100, // HBAR
  accountMemo: "Agent Alice test account"
});

// Create Account 2
const account2 = await mcp_hedera-mcp-server_create_account_tool({
  initialBalance: 100, // HBAR
  accountMemo: "Agent Bob test account"
});
```

### 3. Transfer HBAR (Direct Payment)

```javascript
// Direct HBAR transfer from Account 1 to Account 2
const transfer = await mcp_hedera-mcp-server_transfer_hbar_tool({
  sourceAccountId: account1.accountId,
  transfers: [
    {
      accountId: account2.accountId,
      amount: 10 // HBAR
    }
  ],
  transactionMemo: "Agent-to-agent payment test"
});

console.log(`Transfer completed: ${transfer.transactionId}`);
```

### 4. Create HCS Topic for Logging

```javascript
const topic = await mcp_hedera-mcp-server_create_topic_tool({
  topicMemo: "Agent interactions log",
  transactionMemo: "Creating A2A communication topic"
});

console.log(`Topic created: ${topic.topicId}`);
```

### 5. Submit Messages to HCS

```javascript
const message = await mcp_hedera-mcp-server_submit_topic_message_tool({
  topicId: topic.topicId,
  message: JSON.stringify({
    event: "A2ACommunicationInitiated",
    fromAgent: "0xAgent1",
    toAgent: "0xAgent2",
    timestamp: new Date().toISOString()
  }),
  transactionMemo: "Logging agent interaction"
});

console.log(`Message submitted: ${message.sequenceNumber}`);
```

### 6. Query HCS Messages

```javascript
const messages = await mcp_hedera-mcp-server_get_topic_messages_query_tool({
  topicId: topic.topicId,
  limit: 10
});

console.log(`Retrieved ${messages.messages.length} messages`);
```

### 7. Query Account Information

```javascript
const accountInfo = await mcp_hedera-mcp-server_get_account_query_tool({
  accountId: account1.accountId
});

console.log(`Account: ${accountInfo.accountId}`);
console.log(`Balance: ${accountInfo.balance} HBAR`);
```

### 8. Query Transaction Details

```javascript
// Using Mirror Node via backend API
const tx = await axios.get(
  `http://localhost:3001/api/messages/topics/${topicId}/messages?limit=10`
);
```

---

## 🎬 Complete Demo Flow

### Scenario: Alice pays Bob for API integration service

**Full Flow:**

1. **Setup** (Using MCP)
   - Create test accounts for Alice and Bob
   - Fund accounts with HBAR
   - Create HCS topic for logging

2. **Discovery** (Using API)
   - Register Alice and Bob as agents
   - Search for agents with "api-integration" capability
   - Check trust scores

3. **Communication** (Using API)
   - Alice initiates A2A communication with Bob
   - Verify interaction created on-chain

4. **Payment** (Hybrid: MCP + API)
   - Option A: Use API escrow (`/api/payments`)
   - Option B: Use direct HBAR transfer (MCP)
   - Both establish trust on completion

5. **Verification** (Using API + MCP)
   - Query interaction history via API
   - Check HCS messages via MCP
   - Verify trust scores increased
   - View transactions on HashScan

### Demo Script

See `tests/integration/a2a-payment-demo.js` for a complete automated demo.

---

## 🔍 Testing x402 Payment Flow

### 1. Issue Payment Challenge

```bash
curl -i -X POST http://localhost:3001/api/x402/challenge \
  -H "Content-Type: application/json" \
  -d '{
    "amountHbar": "5",
    "memo": "x402-test-payment"
  }'
```

**Response (HTTP 402):**
```json
{
  "status": 402,
  "payment": {
    "network": "testnet",
    "asset": "HBAR",
    "amount": "5",
    "memo": "x402-test-payment",
    "payTo": "0.0.xxxxx"
  }
}
```

### 2. Make Payment (Using MCP or Wallet)

```javascript
// Using Hedera MCP
const payment = await mcp_hedera-mcp-server_transfer_hbar_tool({
  transfers: [{
    accountId: "0.0.xxxxx", // From challenge response
    amount: 5
  }],
  transactionMemo: "x402-test-payment"
});
```

### 3. Verify Payment

```bash
curl -X POST http://localhost:3001/api/x402/verify \
  -H "Content-Type: application/json" \
  -d '{
    "txId": "0.0.xxxxx@1234567890.123456789",
    "expectedAmount": "5",
    "expectedPayTo": "0.0.xxxxx"
  }'
```

**Response:**
```json
{
  "verified": true,
  "tx": { /* transaction details */ }
}
```

---

## 🐛 Troubleshooting

### Issue: "Target agent trust score too low"

**Solution:**
```bash
# Submit reputation feedback to boost trust
curl -X POST http://localhost:3001/api/reputation/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "fromAgent": "0xOtherAgent",
    "toAgent": "0xTargetAgent",
    "rating": 5,
    "comment": "Initial trust"
  }'
```

### Issue: "Insufficient funds"

**Solution:**
1. Check balance using MCP:
   ```javascript
   await mcp_hedera-mcp-server_get_hbar_balance_query_tool({ accountId: "0.0.xxxxx" })
   ```
2. Request testnet HBAR: https://portal.hedera.com/faucet

### Issue: "Contract not deployed"

**Solution:**
1. Deploy contracts:
   ```bash
   cd contracts
   npx hardhat run deploy/deploy.js --network hedera_testnet
   ```
2. Verify `deployment.json` exists in `contracts/` directory

### Issue: Backend not connecting to Hedera

**Solution:**
1. Verify environment variables in `.env`
2. Check RPC URL is accessible
3. Verify account ID and private key format

### Issue: A2A communication fails

**Possible Causes:**
- Target agent not registered
- Trust score < 40
- Contract paused

**Check:**
```bash
# Check agent status
curl http://localhost:3001/api/agents/0xAgentAddress

# Verify trust score
# Should be >= 40 for A2A communication
```

---

## 📊 Monitoring and Logs

### View HCS Messages

```bash
# Get messages from topic
curl "http://localhost:3001/api/messages/topics/0.0.TOPIC_ID/messages?limit=10"
```

### Check Transaction Status

1. **Via API:**
   ```bash
   curl http://localhost:3001/api/payments/0xEscrowId
   ```

2. **Via HashScan:**
   - Visit: https://hashscan.io/testnet
   - Search for transaction ID

### View Agent Interactions

```bash
curl http://localhost:3001/api/a2a/agents/0xAgentAddress/interactions
```

---

## 🎯 Best Practices for Testing

1. **Use Test Accounts**: Create separate accounts for testing
2. **Monitor Trust Scores**: Track how trust scores change after interactions
3. **Verify On-Chain**: Always check HashScan for transaction confirmation
4. **Log Everything**: Use HCS topics to log all interactions
5. **Clean Up**: Consider refunding test escrows or marking them as completed

---

## 📚 Additional Resources

- **Backend API Documentation**: `backend/ENDPOINTS.md`
- **Hedera Portal**: https://portal.hedera.com/
- **HashScan Testnet**: https://hashscan.io/testnet
- **Hedera MCP Tools**: Available via MCP server integration
- **ERC-8004 Specification**: https://github.com/erc-8004/erc-8004-contracts

---

## ✨ Quick Test Checklist

- [ ] Backend server running
- [ ] Contracts deployed
- [ ] At least 2 agents registered
- [ ] Agents have trust scores >= 40
- [ ] Sufficient HBAR balance for transactions
- [ ] HCS topic created (optional, for logging)
- [ ] Can initiate A2A communication
- [ ] Can create and release escrow
- [ ] Trust scores increase after payment
- [ ] Transactions visible on HashScan

---

**Need Help?** Check the main `README.md` or `docs/QUICKSTART.md` for setup instructions.

