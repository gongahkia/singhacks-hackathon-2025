# 🤖 Multi-Agent Setup Guide
## Using Separate Credentials for Agent-to-Agent Testing

This guide explains how to set up and test agent-to-agent payment and communication using **two separate Hedera accounts** with different credentials.

---

## 📋 Overview

To properly test agent-to-agent (A2A) communication, you need **two different wallet addresses**. This guide shows you how to:

1. Create two separate Hedera accounts
2. Generate separate `.env` files for each agent
3. Register both agents on the blockchain
4. Run the full A2A payment demo

---

## 🚀 Quick Start

### Step 1: Generate Environment File Templates

```bash
node tests/integration/setup-agents.js
```

This creates:
- `.env.alice` - Template for Alice's credentials
- `.env.bob` - Template for Bob's credentials

### Step 2: Create Two Hedera Accounts

You have two options:

#### Option A: Using Hedera MCP Tools

If you have Hedera MCP server configured, you can create accounts programmatically:

```javascript
// Create Alice's account
const aliceAccount = await mcp_hedera-mcp-server_create_account_tool({
  initialBalance: 500, // HBAR
  accountMemo: "Alice Agent Test Account"
});

// Create Bob's account  
const bobAccount = await mcp_hedera-mcp-server_create_account_tool({
  initialBalance: 500, // HBAR
  accountMemo: "Bob Agent Test Account"
});
```

#### Option B: Using Hedera Portal

1. Visit https://portal.hedera.com/
2. Create **Account 1** for Alice:
   - Save the Account ID (e.g., `0.0.1234567`)
   - Download/save the Ed25519 private key
   - Generate or get the ECDSA private key (for EVM)
3. Create **Account 2** for Bob:
   - Save the Account ID (e.g., `0.0.2345678`)
   - Download/save the Ed25519 private key
   - Generate or get the ECDSA private key (for EVM)
4. Get testnet HBAR from the faucet for both accounts

### Step 3: Fill in Environment Files

Edit `.env.alice`:

```env
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.1234567          # Alice's account ID
HEDERA_PRIVATE_KEY=302e0201...        # Alice's Ed25519 key
EVM_PRIVATE_KEY=0x1234567890abcdef...  # Alice's ECDSA key
RPC_URL=https://testnet.hashio.io/api
MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1
CHAIN_ID=296
PORT=3001
NODE_ENV=development
AGENT_NAME=Alice
AGENT_ADDRESS=0x...                    # Alice's EVM address (derived from EVM_PRIVATE_KEY)
```

Edit `.env.bob`:

```env
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.2345678          # Bob's account ID
HEDERA_PRIVATE_KEY=302e0201...        # Bob's Ed25519 key
EVM_PRIVATE_KEY=0xabcdef1234567890...  # Bob's ECDSA key
RPC_URL=https://testnet.hashio.io/api
MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1
CHAIN_ID=296
PORT=3001
NODE_ENV=development
AGENT_NAME=Bob
AGENT_ADDRESS=0x...                    # Bob's EVM address (derived from EVM_PRIVATE_KEY)
```

**Important:** The `EVM_PRIVATE_KEY` values must be **different** for Alice and Bob!

### Step 4: Get EVM Addresses

You can derive the EVM address from the ECDSA private key:

```bash
# Using Node.js
node -e "const { ethers } = require('ethers'); const wallet = new ethers.Wallet('0xYOUR_KEY'); console.log(wallet.address);"
```

Or use online tools or your wallet to get the EVM address from the private key.

### Step 5: Run the Multi-Agent Demo

```bash
node tests/integration/a2a-payment-demo-multi.js
```

This script will:
1. ✅ Register Alice using `.env.alice` credentials
2. ✅ Register Bob using `.env.bob` credentials
3. ✅ Initiate A2A communication between them
4. ✅ Create payment escrow
5. ✅ Release escrow and establish trust
6. ✅ Verify all transactions

---

## 🔧 Detailed Setup

### Getting ECDSA Keys from Ed25519

If you only have Ed25519 keys, you can generate ECDSA keys:

```bash
# Generate a new ECDSA key pair
npx ethers wallet generate

# This outputs:
# Address: 0x...
# Private Key: 0x...
```

**Note:** The ECDSA private key is **different** from the Ed25519 private key. You need both:
- **Ed25519**: For Hedera native operations (HCS, HTS)
- **ECDSA**: For EVM smart contract operations

### Using Hedera Portal for Account Creation

1. Go to https://portal.hedera.com/
2. Click "Create Account" or "Testnet Account"
3. For each account:
   - Save the **Account ID** (format: `0.0.xxxxx`)
   - Download or copy the **Private Key** (Ed25519 format)
   - **Important**: Also get the **EVM Address** or generate ECDSA key
4. Use the faucet to add testnet HBAR to both accounts

### Verifying Account Setup

After filling in the `.env` files, verify they're correct:

```bash
# Check Alice's account (you'll need to modify backend temporarily)
# Or use Hedera MCP tools to query account info

# Using MCP:
const aliceBalance = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
  accountId: "0.0.ALICE_ACCOUNT_ID"
});

const bobBalance = await mcp_hedera-mcp-server_get_hbar_balance_query_tool({
  accountId: "0.0.BOB_ACCOUNT_ID"
});
```

---

## 🎯 Running the Demo

### Full Automated Demo

```bash
# 1. Generate templates
node tests/integration/setup-agents.js

# 2. Fill in .env.alice and .env.bob with your account details

# 3. Ensure backend is running
cd backend && npm run dev

# 4. Run the multi-agent demo (in another terminal)
node tests/integration/a2a-payment-demo-multi.js
```

### Manual Registration

If you prefer to register agents manually:

```bash
# Register Alice (using .env.alice credentials)
# You'll need to temporarily set EVM_PRIVATE_KEY from .env.alice
EVM_PRIVATE_KEY=$(grep EVM_PRIVATE_KEY .env.alice | cut -d'=' -f2) \
node -e "
const { ethers } = require('ethers');
const wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY);
console.log('Alice Address:', wallet.address);
"
```

---

## 🔍 Troubleshooting

### Issue: "Both agents have the same address"

**Cause:** Both `.env` files have the same `EVM_PRIVATE_KEY`

**Solution:** 
1. Check that `.env.alice` and `.env.bob` have **different** `EVM_PRIVATE_KEY` values
2. Verify the addresses are different by deriving them:
   ```bash
   node -e "const { ethers } = require('ethers'); console.log('Alice:', new ethers.Wallet('0xALICE_KEY').address); console.log('Bob:', new ethers.Wallet('0xBOB_KEY').address);"
   ```

### Issue: "Already registered"

**Cause:** One of the accounts is already registered as an agent

**Solution:** The demo script will detect this and use the existing registration. Or you can:
- Use different agent names
- Use different accounts

### Issue: "Insufficient funds"

**Cause:** Accounts don't have enough HBAR

**Solution:**
1. Visit https://portal.hedera.com/faucet
2. Request testnet HBAR for both accounts
3. Wait 1-2 minutes for distribution

### Issue: "Cannot find module" or path errors

**Cause:** Script not run from correct directory

**Solution:**
```bash
# Run from project root
cd /path/to/singhacks-hackathon-2025
node tests/integration/a2a-payment-demo-multi.js
```

---

## 📊 What the Demo Tests

1. **Multi-Wallet Registration**: Each agent uses a different wallet address
2. **Agent Discovery**: Finding agents by capability
3. **A2A Communication**: Initiate interaction between two different agents
4. **Payment Escrow**: Create payment from one agent to another
5. **Trust Establishment**: Automatic trust score increase from successful payments
6. **On-Chain Verification**: Query all interactions and payments

---

## 🔐 Security Notes

⚠️ **Never commit `.env.alice` or `.env.bob` to version control!**

These files contain private keys. Make sure they're in `.gitignore`:

```gitignore
.env.alice
.env.bob
.env.*
```

---

## 📚 Additional Resources

- **Hedera Portal**: https://portal.hedera.com/
- **Hedera MCP Tools**: See `docs/MCP_DEMO_GUIDE.md`
- **Single Agent Demo**: `tests/integration/a2a-payment-demo.js` (uses single wallet)
- **Testing Guide**: `docs/TESTING_GUIDE.md`

---

## ✅ Checklist

Before running the demo:

- [ ] Generated `.env.alice` and `.env.bob` templates
- [ ] Created two separate Hedera accounts
- [ ] Filled in all credentials in both `.env` files
- [ ] Verified `EVM_PRIVATE_KEY` values are different
- [ ] Verified both accounts have testnet HBAR
- [ ] Backend server is running
- [ ] Contracts are deployed
- [ ] Ready to run `a2a-payment-demo-multi.js`

---

**Next Steps:** Once setup is complete, run the demo to see full agent-to-agent payment and communication flow! 🚀

