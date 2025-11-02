# End-to-End (E2E) Test Suite

Comprehensive end-to-end tests for the Hedera Agent Economy platform, testing complete flows from frontend to backend.

## Overview

The E2E test suite validates critical user flows including:
- ✅ Agent registration (permissioned and permissionless modes)
- ✅ Agent discovery and search
- ✅ Agent-to-agent (A2A) communication
- ✅ Payment escrow creation and release
- ✅ Reputation and feedback systems
- ✅ x402 payment challenges
- ✅ AI-powered agent search
- ✅ Interaction history tracking

## Prerequisites

### Required Services

1. **Backend Server**
   - Must be running on `http://localhost:3001`
   - Start with: `npm run backend:dev` or `npm run backend:start`

2. **Frontend Server** (Optional)
   - Must be running on `http://localhost:3000` for full UI tests
   - Start with: `cd frontend && npm run dev`
   - Tests will skip frontend checks if not available

3. **Environment Configuration**
   - `.env` file in project root with:
     - `HEDERA_ACCOUNT_ID`
     - `HEDERA_PRIVATE_KEY` or `EVM_PRIVATE_KEY`
     - `RPC_URL` (defaults to Hedera testnet)
     - `X402_FACILITATOR_URL` (for x402 tests)

4. **Hedera Testnet Access**
   - Contracts deployed (ERC-8004 IdentityRegistry, ReputationRegistry, etc.)
   - Test account with sufficient HBAR balance

## Running Tests

### Quick Start

```bash
# Ensure backend is running
npm run backend:dev

# In another terminal, run e2e tests
npm run test:e2e
```

### Test Options

```bash
# Run standard e2e tests (backend only)
npm run test:e2e

# Run with frontend tests enabled
npm run test:e2e:full

# Run all tests (e2e + integration)
npm run test:all
```

### Environment Variables

You can configure tests using environment variables:

```bash
# Custom API URL
API_URL=http://localhost:3001 npm run test:e2e

# Enable frontend tests
TEST_FRONTEND=true npm run test:e2e

# Combined
API_URL=http://localhost:3001 TEST_FRONTEND=true npm run test:e2e
```

## Test Structure

```
tests/e2e/
├── e2e-test-suite.js    # Main test suite (all test cases)
├── test-utils.js         # Shared utilities and helpers
└── README.md            # This file
```

## Test Cases

### 1. Health Checks
- Backend server accessibility
- Frontend accessibility (optional)

### 2. Agent Registration (Permissioned)
- Register agent with user wallet
- Verify registration on-chain
- Retrieve agent details

### 3. Agent Registration (Permissionless)
- Register agent with unique wallet
- Verify wallet address assignment
- Verify autonomous payment capability

### 4. Agent Discovery
- List all registered agents
- Search agents by capability
- Verify search results

### 5. Agent-to-Agent Communication
- Initiate A2A interaction
- Verify interaction creation
- Check interaction details

### 6. Payment Escrow
- Create payment escrow
- Verify escrow details
- Release escrow payment
- Verify completion status

### 7. Reputation System
- Submit reputation feedback
- Retrieve reputation data
- Verify feedback persistence

### 8. x402 Payment Challenge
- Request payment challenge
- Verify challenge response format

### 9. AI Agent Search
- Test Groq-powered agent search
- Verify search results

### 10. Interaction History
- Retrieve agent interaction history
- Verify history data format

## Test Output

Tests provide colored, detailed output:

- 🧪 **Test Name**: Indicates test being run
- ✅ **Success**: Green checkmarks for successful steps
- ❌ **Failure**: Red X marks for failures with error details
- ℹ️ **Info**: Yellow info markers for non-critical messages
- ⏭️ **Skipped**: Tests skipped due to missing prerequisites

### Example Output

```
🚀 Starting E2E Test Suite
============================================================

🧪 Test: Health Checks
  1. Checking backend health
  ✅ Backend is healthy
  2. Checking frontend accessibility
  ✅ Frontend is accessible

🧪 Test: Agent Registration (Permissioned)
  1. Registering agent "TestAgent-1234567890" in permissioned mode
  ✅ Agent registered: agent-123 at 0x...
  2. Verifying agent is retrievable
  ✅ Agent verified and retrievable
  ✅ Test passed in 3456ms
```

## Troubleshooting

### Backend Not Accessible

```
❌ Backend health check failed
```

**Solution:**
1. Check if backend is running: `npm run health`
2. Verify port 3001 is not in use
3. Check backend logs for errors

### Agent Registration Fails

```
❌ Agent registration failed - missing agentId or address
```

**Solution:**
1. Verify ERC-8004 contracts are deployed
2. Check environment variables (private keys, RPC URL)
3. Ensure test account has HBAR balance
4. Check backend logs for blockchain errors

### A2A Communication Fails

```
❌ A2A communication failed - missing interactionId
```

**Solution:**
1. Ensure you have at least 2 registered agents
2. Verify agents have different addresses
3. Check that agents have trust score >= 40
4. Review A2A service logs

### Payment Escrow Fails

```
❌ Escrow creation failed - missing escrowId
```

**Solution:**
1. Verify Hedera account has sufficient HBAR
2. Check payment service configuration
3. Review transaction logs on HashScan

### Test Timeout

```
❌ Timeout waiting for condition after 10000ms
```

**Solution:**
1. Increase timeout in test configuration
2. Check network connectivity
3. Verify Hedera testnet is responsive
4. Review transaction confirmation times

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start backend
        run: npm run backend:start &
        env:
          HEDERA_NETWORK: testnet
          PORT: 3001
      
      - name: Wait for backend
        run: |
          timeout 30 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 1; done'
      
      - name: Run e2e tests
        run: npm run test:e2e
        env:
          API_URL: http://localhost:3001
```

## Test Data Management

Tests create real resources on Hedera testnet:
- Agent registrations
- Payment escrows
- A2A interactions
- Reputation feedback

**Note**: These are on testnet and can be safely created/destroyed. In production, implement proper cleanup procedures.

## Extending Tests

### Adding New Test Cases

1. Add a new test method to `e2e-test-suite.js`:

```javascript
async testMyNewFeature() {
  logStep('1', 'Testing my new feature');
  // Your test code here
  logSuccess('Feature works!');
}
```

2. Add to the tests array in `run()`:

```javascript
{ name: 'My New Feature', fn: () => this.testMyNewFeature() },
```

### Using Test Utilities

```javascript
const TestUtils = require('./test-utils');
const utils = new TestUtils();

// Register an agent
const agent = await utils.registerAgent('MyAgent', ['payments']);

// Create escrow
const escrow = await utils.createEscrow(agent.address, '1.0');

// Wait for condition
await utils.waitFor(() => utils.checkHealth(), 10000);
```

## Performance Considerations

- Tests include delays between steps to allow blockchain transactions to settle
- Default timeout is 30 seconds per test
- Total test suite runtime: ~5-10 minutes depending on network conditions

## Best Practices

1. **Run tests sequentially**: Blockchain operations need time to settle
2. **Use testnet**: Always test on Hedera testnet, never mainnet
3. **Monitor resource usage**: Tests create real on-chain resources
4. **Review logs**: Check both test output and backend logs
5. **Isolate tests**: Each test should be independent when possible

## Support

For issues or questions:
1. Check backend logs: `npm run backend:dev`
2. Review test output for specific error messages
3. Verify environment configuration
4. Check Hedera testnet status

## Related Documentation

- [Integration Tests](../integration/README.md) - API-level integration tests
- [Backend API Documentation](../../backend/ENDPOINTS.md) - Complete API reference
- [Testing Guide](../../docs/TESTING_GUIDE.md) - General testing guidelines

