# Implementation Summary: Permissioned vs Permissionless Agent Payments

## ✅ Completed Implementation

### 1. **Agent Payment Modes**
   - Added `paymentMode` field to agents: `'permissioned'` or `'permissionless'`
   - Permissioned: User's wallet pays (requires wallet signing)
   - Permissionless: Agent has own wallet and pays autonomously

### 2. **Unique Wallet Addresses**
   - Fixed: Agents now get unique wallet addresses (no longer sharing backend wallet)
   - Permissionless agents generate or use provided private keys
   - Wallet keys stored in memory (demo only - use secure storage in production)

### 3. **Demo Agents (Alice & Bob)**
   - Created seed script: `backend/scripts/seed-demo-agents-alice-bob.js`
   - Alice and Bob registered with `paymentMode: 'permissionless'`
   - Each has unique wallet address and private key

### 4. **Payment Flow Updates**
   - **Permissionless**: Agent uses its own wallet to pay (autonomous)
   - **Permissioned**: Requires `signedPaymentHeader` from user's wallet (x402 flow)
   - Fixed A2A service to use agent addresses (not user wallets)

### 5. **x402 Integration**
   - Updated `/api/x402/challenge` endpoint
   - Supports both HBAR and USDC payments
   - Payment flow uses x402 facilitator

## 🔧 Files Modified

1. **backend/services/agent-service.js**
   - Added `paymentMode` support to `registerAgentWithoutWallet()`
   - Generate unique wallets for permissionless agents
   - Store agent wallet keys in `AgentService.agentWalletKeys` Map
   - Added `getAgentWallet()` static method

2. **backend/routes/agents.js**
   - Updated `/register-agent` to accept `paymentMode` and `agentPrivateKey`

3. **backend/routes/agent-connection.js**
   - Completely rewrote `/pay-agent` endpoint
   - Handles both permissioned and permissionless modes
   - Fixed A2A logging to use agent addresses

4. **backend/routes/x402.js**
   - Updated `/challenge` to use x402 service properly
   - Supports currency selection (HBAR/USDC)

5. **backend/scripts/seed-demo-agents-alice-bob.js** (NEW)
   - Script to register Alice and Bob as permissionless agents
   - Generates unique wallets for each

## 🚀 How to Use

### Seed Demo Agents (Alice & Bob)

```bash
cd backend
node scripts/seed-demo-agents-alice-bob.js
```

This will:
- Register Alice with permissionless payment mode
- Register Bob with permissionless payment mode
- Generate unique wallet addresses for each
- Store private keys in memory (for demo)

### Register New Permissionless Agent

```bash
POST /api/agents/register-agent
{
  "agentId": "my-agent",
  "name": "My Agent",
  "capabilities": ["payment", "data-processing"],
  "metadata": "Agent description",
  "paymentMode": "permissionless",
  "agentPrivateKey": "0x..." // Optional: provide your own private key
}
```

### Register Permissioned Agent (Default)

```bash
POST /api/agents/register-agent
{
  "agentId": "my-agent",
  "name": "My Agent",
  "capabilities": ["payment"],
  "metadata": "Agent description"
  // paymentMode defaults to "permissioned"
}
```

### Payment Flow

#### Permissionless Mode (Agent Autonomous)
- Agent pays from its own wallet
- No user interaction required
- User sends funds to agent's wallet address first

#### Permissioned Mode (User Controlled)
- User connects wallet to agent
- Frontend creates x402 payment header
- User signs with wallet (MetaMask/popup)
- Backend receives `signedPaymentHeader`
- Payment completes

## 🔍 Key Architecture Changes

### Before:
- All agents shared backend wallet address
- User wallet → agentId mapping
- Payments used user wallet as agent address (caused errors)

### After:
- Each agent can have unique wallet (permissionless) OR use user wallet (permissioned)
- Permissionless agents: `agentId → agentWalletAddress`
- Permissioned agents: `userWallet → agentId` (user wallet acts on behalf of agent)
- A2A service uses actual agent addresses

## 📝 Notes

1. **Private Key Storage**: Currently stored in memory for demo. In production:
   - Use secure key management (AWS KMS, HashiCorp Vault, etc.)
   - Never log or expose private keys
   - Store keys encrypted at rest

2. **x402 Integration**: Full x402 flow requires:
   - Frontend creates Hedera transaction
   - User signs transaction
   - Frontend sends signed transaction to backend
   - Backend verifies via facilitator
   - Backend settles via facilitator

3. **Environment Variables**:
   - `ALICE_PRIVATE_KEY` (optional) - Alice's wallet private key
   - `BOB_PRIVATE_KEY` (optional) - Bob's wallet private key

## ✅ Issues Fixed

1. ✅ "Agent not found" error - A2A now uses agent addresses
2. ✅ Seeded agents missing - Each agent has unique address
3. ✅ Payment mode support - Both permissioned and permissionless work
4. ✅ Wallet separation - Agents don't share backend wallet anymore

## 🎯 Next Steps (Frontend)

1. Update frontend to create x402 payment headers
2. Add wallet signing for permissioned payments
3. Display agent payment mode in UI
4. Show agent wallet addresses for permissionless agents
5. Allow users to send funds to permissionless agent wallets

