# 🎯 Hedera MCP Tools Demo Guide
## Agent-to-Agent Payment & Communication Demonstration

This guide shows how to use **Hedera MCP tools** alongside the REST API to test and demonstrate agent-to-agent payment and communication.

---

## 🚀 Quick Start

### Prerequisites

1. **Hedera MCP Server Connected**
   - Ensure Hedera MCP server is configured in your environment
   - Verify you have access to Hedera MCP tools

2. **Backend API Running**
   ```bash
   cd backend && npm run dev
   ```

3. **Contracts Deployed**
   ```bash
   cd contracts && npx hardhat run deploy/deploy.js --network hedera_testnet
   ```

---

## 🔧 Setup Phase (Using Hedera MCP)

### Step 1: Create Test Accounts

```javascript
// Create Account for Agent 1 (Alice)
const aliceAccount = await mcp_hedera-mcp-server_create_account_tool({
  initialBalance: 500, // HBAR
  accountMemo: "Alice - Smart contract developer agent",
  maxAutomaticTokenAssociations: 100
});

console.log(`Alice Account: ${aliceAccount.accountId}`);

// Create Account for Agent 2 (Bob)
const bobAccount = await mcp_hedera-mcp-server_create_account_tool({
  initialBalance: 500, // HBAR
  accountMemo: "Bob - Payment processing agent",
  maxAutomaticTokenAssociations: 100
});

console.log(`Bob Account: ${bobAccount.accountId}`);
```

### Step 2: Check Account Balances

```javascript
// Check Alice's balance
const aliceBalance = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
  accountId: aliceAccount.accountId
});

// Check Bob's balance
const bobBalance = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
  accountId: bobAccount.accountId
});

console.log(`Alice Balance: ${aliceBalance.balance} HBAR`);
console.log(`Bob Balance: ${bobBalance.balance} HBAR`);
```

### Step 3: Create HCS Topic for Logging

```javascript
const a2aTopic = await mcp_hedera-mcp-server_create_topic_tool({
  topicMemo: "Agent-to-Agent Communication Log",
  isSubmitKey: false,
  transactionMemo: "Creating A2A logging topic"
});

console.log(`A2A Topic ID: ${a2aTopic.topicId}`);

const paymentTopic = await mcp_hedera-mcp-server_create_topic_tool({
  topicMemo: "Payment Transaction Log",
  isSubmitKey: false,
  transactionMemo: "Creating payment logging topic"
});

console.log(`Payment Topic ID: ${paymentTopic.topicId}`);
```

---

## 💬 Communication Phase (Using API + MCP)

### Step 1: Register Agents via API

```bash
# Register Alice
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "capabilities": ["smart-contracts", "payments"],
    "metadata": "{\"accountId\": \"'${aliceAccount.accountId}'\", \"specialization\": \"Smart contracts\"}"
  }'

# Register Bob
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob",
    "capabilities": ["payments", "api-integration"],
    "metadata": "{\"accountId\": \"'${bobAccount.accountId}'\", \"specialization\": \"Payments\"}"
  }'
```

### Step 2: Initiate A2A Communication via API

```bash
curl -X POST http://localhost:3001/api/a2a/communicate \
  -H "Content-Type: application/json" \
  -d '{
    "fromAgent": "0xAliceEVMAddress",
    "toAgent": "0xBobEVMAddress",
    "capability": "payments"
  }'
```

### Step 3: Log Communication to HCS via MCP

```javascript
const interactionMessage = await mcp_hedera-mcp-server_submit_topic_message_tool({
  topicId: a2aTopic.topicId,
  message: JSON.stringify({
    event: "A2ACommunicationInitiated",
    fromAgent: "0xAliceEVMAddress",
    toAgent: "0xBobEVMAddress",
    capability: "payments",
    interactionId: interactionId,
    timestamp: new Date().toISOString()
  }),
  transactionMemo: "Logging A2A communication"
});

console.log(`Message logged: Sequence ${interactionMessage.sequenceNumber}`);
```

---

## 💰 Payment Phase (Hybrid: MCP + API)

### Option A: Direct HBAR Transfer (Using MCP)

```javascript
// Direct payment from Alice to Bob
const directPayment = await mcp_hedera-mcp-server_transfer_hbar_tool({
  sourceAccountId: aliceAccount.accountId,
  transfers: [{
    accountId: bobAccount.accountId,
    amount: 10 // HBAR
  }],
  transactionMemo: "Agent-to-agent payment for API integration service"
});

console.log(`Payment Transaction: ${directPayment.transactionId}`);

// Log to HCS
await mcp_hedera-mcp-server_submit_topic_message_tool({
  topicId: paymentTopic.topicId,
  message: JSON.stringify({
    event: "DirectPaymentCompleted",
    from: aliceAccount.accountId,
    to: bobAccount.accountId,
    amount: 10,
    txId: directPayment.transactionId,
    timestamp: new Date().toISOString()
  })
});
```

### Option B: Escrow Payment (Using API)

```bash
# Create escrow
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "payee": "0xBobEVMAddress",
    "amount": "10",
    "description": "Payment for API integration service"
  }'

# Release escrow (automatically establishes trust)
curl -X POST http://localhost:3001/api/payments/{escrowId}/release
```

### Option C: Token Payment (Using MCP)

```javascript
// Create a fungible token for payments
const paymentToken = await mcp_hedera-mcp-server_create_fungible_token_tool({
  tokenName: "AgentPaymentToken",
  tokenSymbol: "APT",
  initialSupply: 10000,
  decimals: 2,
  supplyType: "finite",
  maxSupply: 1000000,
  treasuryAccountId: aliceAccount.accountId
});

console.log(`Payment Token ID: ${paymentToken.tokenId}`);

// Associate token with Bob's account
await mcp_hedera-mcp-server_associate_token_tool({
  accountId: bobAccount.accountId,
  tokenIds: [paymentToken.tokenId]
});

// Transfer tokens from Alice to Bob
await mcp_hedera-mcp-server_airdrop_fungible_token_tool({
  tokenId: paymentToken.tokenId,
  sourceAccountId: aliceAccount.accountId,
  recipients: [{
    accountId: bobAccount.accountId,
    amount: 1000 // 10.00 APT (with 2 decimals)
  }],
  transactionMemo: "Agent payment in tokens"
});
```

---

## ✅ Verification Phase (Using MCP Queries)

### Step 1: Verify Account Balances

```javascript
const aliceBalanceAfter = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
  accountId: aliceAccount.accountId
});

const bobBalanceAfter = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
  accountId: bobAccount.accountId
});

console.log(`Alice Balance After: ${aliceBalanceAfter.balance} HBAR`);
console.log(`Bob Balance After: ${bobBalanceAfter.balance} HBAR`);
```

### Step 2: Query Transaction Details

```javascript
const accountInfo = await mcp_hedera-mcp-server_get_account_query_tool({
  accountId: aliceAccount.accountId
});

console.log(`Account Info:`, accountInfo);
```

### Step 3: Query Token Balances

```javascript
const tokenBalances = await mcp_hedera-mcp-server_get_account_token_balances_query_tool({
  accountId: bobAccount.accountId,
  tokenId: paymentToken.tokenId
});

console.log(`Token Balance:`, tokenBalances);
```

### Step 4: Retrieve HCS Messages

```javascript
const messages = await mcp_hedera-mcp-server_get_topic_messages_query_tool({
  topicId: paymentTopic.topicId,
  limit: 10
});

console.log(`Payment Messages:`, messages.messages);
```

---

## 🔄 Complete Workflow Example

### Full Agent-to-Agent Payment Flow

```javascript
async function completeA2APaymentFlow() {
  console.log("🚀 Starting A2A Payment Flow\n");
  
  // 1. Setup (MCP)
  const alice = await mcp_hedera-mcp-server_create_account_tool({
    initialBalance: 500,
    accountMemo: "Alice Agent"
  });
  
  const bob = await mcp_hedera-mcp-server_create_account_tool({
    initialBalance: 500,
    accountMemo: "Bob Agent"
  });
  
  const topic = await mcp_hedera-mcp-server_create_topic_tool({
    topicMemo: "A2A Payments"
  });
  
  // 2. Register Agents (API)
  const aliceAgent = await axios.post('http://localhost:3001/api/agents', {
    name: 'Alice',
    capabilities: ['payments'],
    metadata: JSON.stringify({ accountId: alice.accountId })
  });
  
  const bobAgent = await axios.post('http://localhost:3001/api/agents', {
    name: 'Bob',
    capabilities: ['payments'],
    metadata: JSON.stringify({ accountId: bob.accountId })
  });
  
  // 3. Initiate Communication (API)
  const communication = await axios.post('http://localhost:3001/api/a2a/communicate', {
    fromAgent: aliceAgent.data.agentAddress,
    toAgent: bobAgent.data.agentAddress,
    capability: 'payments'
  });
  
  // 4. Make Payment (MCP)
  const payment = await mcp_hedera-mcp-server_transfer_hbar_tool({
    sourceAccountId: alice.accountId,
    transfers: [{
      accountId: bob.accountId,
      amount: 10
    }],
    transactionMemo: "A2A payment"
  });
  
  // 5. Log to HCS (MCP)
  await mcp_hedera-mcp-server_submit_topic_message_tool({
    topicId: topic.topicId,
    message: JSON.stringify({
      event: "PaymentCompleted",
      interactionId: communication.data.interactionId,
      paymentTx: payment.transactionId,
      timestamp: new Date().toISOString()
    })
  });
  
  // 6. Verify (MCP + API)
  const bobBalance = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
    accountId: bob.accountId
  });
  
  const messages = await mcp_hedera-mcp-server_get_topic_messages_query_tool({
    topicId: topic.topicId,
    limit: 1
  });
  
  console.log("✅ Flow completed!");
  console.log(`   Bob's new balance: ${bobBalance.balance} HBAR`);
  console.log(`   Messages logged: ${messages.messages.length}`);
}
```

---

## 📊 Comparison: API vs MCP

| Feature | REST API | Hedera MCP |
|---------|----------|------------|
| **Agent Registration** | ✅ Yes | ❌ No |
| **Agent Discovery** | ✅ Yes | ❌ No |
| **A2A Communication** | ✅ Yes | ❌ No |
| **Escrow Payments** | ✅ Yes | ❌ No |
| **Direct HBAR Transfer** | ❌ No | ✅ Yes |
| **Token Operations** | ⚠️ Limited | ✅ Full |
| **Account Creation** | ❌ No | ✅ Yes |
| **Balance Queries** | ⚠️ Via Mirror Node | ✅ Direct |
| **HCS Messaging** | ✅ Yes | ✅ Yes |
| **Transaction Queries** | ✅ Via Mirror Node | ✅ Direct |

**Best Practice:** Use **API for smart contract interactions** (agents, escrow, discovery) and **MCP for direct Hedera operations** (account creation, direct transfers, token management).

---

## 🎯 Demo Scenarios

### Scenario 1: Direct Payment Flow

1. Create accounts (MCP)
2. Register agents (API)
3. Direct HBAR transfer (MCP)
4. Log to HCS (MCP)
5. Verify balances (MCP)

### Scenario 2: Escrow Payment Flow

1. Create accounts (MCP)
2. Register agents (API)
3. Initiate A2A communication (API)
4. Create escrow (API)
5. Release escrow (API - auto trust establishment)
6. Log to HCS (MCP)
7. Query interactions (API)

### Scenario 3: Token Payment Flow

1. Create accounts (MCP)
2. Create payment token (MCP)
3. Register agents (API)
4. Associate tokens (MCP)
5. Transfer tokens (MCP)
6. Log to HCS (MCP)
7. Query balances (MCP)

---

## 🔍 Troubleshooting

### Issue: MCP tools not available

**Solution:**
- Ensure Hedera MCP server is configured
- Check MCP server connection status
- Verify you have proper permissions

### Issue: Account creation fails

**Solution:**
- Check operator account has sufficient HBAR
- Verify account ID format (0.0.xxxxx)
- Ensure network is testnet/mainnet correctly set

### Issue: Token operations fail

**Solution:**
- Ensure token association before transfer
- Check token exists and is active
- Verify account has token association auto-approved or manually associated

---

## 📚 Additional Resources

- **Hedera MCP Tools**: Available via MCP server
- **Backend API Docs**: `backend/ENDPOINTS.md`
- **Testing Guide**: `docs/TESTING_GUIDE.md`
- **Hedera Portal**: https://portal.hedera.com/
- **HashScan**: https://hashscan.io/testnet

---

**Next Steps:**

1. Run `tests/integration/a2a-payment-demo.js` for automated demo
2. Review `docs/TESTING_GUIDE.md` for detailed API usage
3. Explore `backend/ENDPOINTS.md` for all available endpoints

