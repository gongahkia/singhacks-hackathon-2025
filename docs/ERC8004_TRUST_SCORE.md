# 🔐 ERC-8004 Trust Score Guide

## Overview

Trust scores are calculated using the **ERC-8004 ReputationRegistry** contract, which stores on-chain feedback from clients. The system uses a hybrid trust score that combines ERC-8004 official reputation with other metrics.

---

## 📊 How ERC-8004 Trust Score Works

### 1. **ERC-8004 Reputation Registry**

The ERC-8004 ReputationRegistry contract stores feedback for each agent:
- **Agent ID**: The unique ERC-8004 agent ID (uint256)
- **Score**: Feedback score from 0-100 (uint8)
- **Client Address**: Address of the client giving feedback
- **Tags**: Optional tags (tag1, tag2) for categorizing feedback
- **Metadata**: Optional feedback URI and hash

### 2. **Getting the Official Reputation Score**

#### Direct API Call:
```bash
GET /api/reputation/agents/{address}/hybrid-trust
```

#### Example Response:
```json
{
  "final": 75,
  "hybrid": 75,
  "official": 80,           // ERC-8004 average score (0-100)
  "officialFeedbackCount": 5, // Number of feedback entries
  "custom": 0,
  "weights": {
    "official": 0.7,        // 70% weight for ERC-8004
    "custom": 0.15,         // 15% weight for custom metrics
    "transactionSuccess": 0.1,  // 10% weight for transaction success
    "paymentCompletion": 0.05     // 5% weight for payment completion
  },
  "breakdown": {
    "erc8004": {
      "score": 80,
      "count": 5,
      "weight": 0.7,
      "available": true
    },
    "custom": {
      "score": 0,
      "weight": 0.15,
      "source": "Backend agent metrics"
    },
    "transactionSuccess": {
      "rate": 85,
      "successful": 17,
      "total": 20,
      "weight": 0.1
    },
    "paymentCompletion": {
      "rate": 90,
      "completed": 18,
      "total": 20,
      "weight": 0.05
    }
  },
  "formula": "ERC-8004 (70%) + Custom (15%) + Tx Success (10%) + Payment Completion (5%)"
}
```

### 3. **Programmatic Access**

#### Using the Service Directly:

```javascript
const erc8004Service = require('./services/erc8004-service');
const reputationService = require('./services/reputation-service');

// Option 1: Get pure ERC-8004 reputation summary
async function getERC8004Score(agentId) {
  await erc8004Service.initialize();
  const summary = await erc8004Service.getReputationSummary(agentId);
  
  console.log(`Agent ${agentId}:`);
  console.log(`  Average Score: ${summary.averageScore}/100`);
  console.log(`  Feedback Count: ${summary.count}`);
  
  return summary;
}

// Option 2: Get hybrid trust score (recommended)
async function getTrustScore(agentAddress, erc8004AgentId = null) {
  const hybridTrust = await reputationService.getHybridTrustScore(
    agentAddress,
    erc8004AgentId
  );
  
  console.log(`Trust Score: ${hybridTrust.final}/100`);
  console.log(`ERC-8004 Score: ${hybridTrust.official}/100 (${hybridTrust.officialFeedbackCount} reviews)`);
  
  return hybridTrust;
}
```

---

## 🎯 Step-by-Step Process

### Step 1: Get ERC-8004 Agent ID

First, you need the agent's ERC-8004 agent ID (not just their EVM address):

```javascript
const agentService = require('./services/agent-service');
const erc8004AgentId = agentService.constructor.getERC8004AgentId(agentAddress);
```

### Step 2: Query Reputation Registry

The ERC-8004 contract's `getSummary()` function returns:
- `count` (uint64): Number of feedback entries
- `averageScore` (uint8): Average score (0-100)

```javascript
const erc8004Service = require('./services/erc8004-service');
await erc8004Service.initialize();

const summary = await erc8004Service.getReputationSummary(erc8004AgentId);
// Returns: { count: 5, averageScore: 80, sum: 400 }
```

### Step 3: Calculate Hybrid Trust Score

The system combines multiple factors:

```
Final Score = (ERC-8004 × 70%) + (Custom × 15%) + (Tx Success × 10%) + (Payment × 5%)
```

Where:
- **ERC-8004 (70%)**: Average score from ERC-8004 ReputationRegistry
- **Custom (15%)**: Backend agent metrics
- **Transaction Success (10%)**: Percentage of successful transactions
- **Payment Completion (5%)**: Percentage of payments with feedback

---

## 📝 Submitting Feedback (To Build Trust Score)

To give feedback that updates the trust score:

```bash
POST /api/reputation/feedback
Content-Type: application/json

{
  "fromAgent": "0x...",      // Client address
  "toAgent": 123,             // ERC-8004 agent ID or agent address
  "rating": 5,                // 1-5 stars (converted to 0-100)
  "comment": "Great service!",
  "paymentTxHash": "0x...",  // Optional: link to payment
  "tag1": "quality",         // Optional: category tag
  "tag2": "reliability"      // Optional: second tag
}
```

**Note**: The rating is automatically converted:
- 1 star = 20/100
- 2 stars = 40/100
- 3 stars = 60/100
- 4 stars = 80/100
- 5 stars = 100/100

Or use 0-100 directly: `"rating": 85`

---

## 🔍 Querying Feedback

### Get All Feedback for an Agent:

```bash
GET /api/reputation/agents/{address}/reputation
```

### With Filters:

```bash
GET /api/reputation/agents/{address}/reputation?tag1=quality&includeRevoked=false
```

Query Parameters:
- `clientAddresses`: Filter by specific clients
- `tag1`: Filter by first tag
- `tag2`: Filter by second tag
- `includeRevoked`: Include revoked feedback (default: true)

---

## 🛠️ Direct Contract Interaction

If you want to query the contract directly:

```javascript
const { ethers } = require('ethers');

const REPUTATION_REGISTRY = '0xc565edcba77e3abeade40bfd6cf6bf583b3293e0';
const RPC_URL = 'https://testnet.hashio.io/api';

const provider = new ethers.JsonRpcProvider(RPC_URL);

// ABI for getSummary function
const abi = [
  'function getSummary(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2) view returns (uint64 count, uint8 averageScore)'
];

const contract = new ethers.Contract(REPUTATION_REGISTRY, abi, provider);

// Get summary for agent ID 123
const summary = await contract.getSummary(123, [], ethers.ZeroHash, ethers.ZeroHash);
console.log(`Count: ${summary.count}, Average: ${summary.averageScore}`);
```

---

## ⚠️ Important Notes

1. **New Agents**: Agents with no feedback yet will have a trust score of 0 until feedback is submitted.

2. **Score Range**: ERC-8004 scores are 0-100 (uint8), not 0-5 stars.

3. **Feedback Auth**: Submitting feedback requires a `feedbackAuth` signature from the agent owner, which is handled automatically by the service.

4. **Agent ID vs Address**: You need the ERC-8004 agent ID (number), not just the EVM address, to query the ReputationRegistry.

5. **Multiple Feedback**: The average score is calculated from all non-revoked feedback entries.

---

## 📚 Related Endpoints

- `GET /api/reputation/agents/:address/hybrid-trust` - Get hybrid trust score
- `GET /api/reputation/agents/:address/reputation` - Get all feedback
- `POST /api/reputation/feedback` - Submit feedback
- `GET /api/agents/:address` - Get agent info (includes ERC-8004 ID)

---

## 🔗 Contract Addresses (Hedera Testnet)

- **ReputationRegistry**: `0xc565edcba77e3abeade40bfd6cf6bf583b3293e0`
- **IdentityRegistry**: `0x4c74ebd72921d537159ed2053f46c12a7d8e5923`
- **ValidationRegistry**: `0x18df085d85c586e9241e0cd121ca422f571c2da6`

