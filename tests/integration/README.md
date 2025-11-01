# Integration Tests

This directory contains integration tests and demonstration scripts for the Hedera Agent Economy platform.

## Files

- **`a2a-payment-demo.js`**: Single-wallet demo (limited A2A testing)
- **`a2a-payment-demo-multi.js`**: Multi-agent demo (recommended - full A2A testing with separate wallets)
- **`setup-agents.js`**: Generate `.env.alice` and `.env.bob` template files for multi-agent setup

## Running Tests

### Prerequisites

1. Backend server running on `http://localhost:3001`
2. Contracts deployed (see `contracts/deployment.json`)
3. Environment variables configured (`.env` file)

### Installation

```bash
# Install test dependencies
npm install axios
```

### Run Demo

**Option A: Single Wallet (Limited)**
```bash
npm run test:a2a-demo
# Or: node tests/integration/a2a-payment-demo.js
```

**Option B: Multi-Agent (Recommended - Full A2A Testing)**
```bash
# 1. Setup agent environment files
npm run setup:agents

# 2. Fill in .env.alice and .env.bob with real credentials

# 3. Run multi-agent demo
npm run test:a2a-demo-multi
```

See `docs/MULTI_AGENT_SETUP.md` for complete setup instructions.

## What the Demo Tests

1. ✅ Agent Registration (ERC-8004)
2. ✅ Agent Discovery by Capability
3. ✅ Agent-to-Agent Communication Initiation
4. ✅ Payment Escrow Creation
5. ✅ Escrow Release and Trust Establishment
6. ✅ On-Chain Verification
7. ✅ Interaction History Tracking

## Expected Output

The demo script provides colored, step-by-step output showing:

- Agent registration status
- Trust scores
- Interaction IDs
- Transaction hashes
- Escrow details
- Verification results

At the end, it generates a summary report with all relevant IDs and addresses.

## Troubleshooting

If the demo fails:

1. **Check backend health:**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Verify contracts deployed:**
   ```bash
   cat contracts/deployment.json
   ```

3. **Check environment variables:**
   ```bash
   # Ensure .env file has:
   # - HEDERA_ACCOUNT_ID
   # - HEDERA_PRIVATE_KEY
   # - EVM_PRIVATE_KEY
   # - RPC_URL
   # - MIRROR_NODE_URL
   ```

4. **Verify account has HBAR:**
   - Visit https://portal.hedera.com/faucet
   - Request testnet HBAR

## Using with Hedera MCP Tools

For direct blockchain operations, you can combine this demo with Hedera MCP tools:

```javascript
// Example: Create test accounts first
const account1 = await mcp_hedera-mcp-server_create_account_tool({
  initialBalance: 100,
  accountMemo: "Test Agent 1"
});

// Then use these accounts in the demo
```

See `docs/TESTING_GUIDE.md` for more details on using Hedera MCP tools.

