# 🔵 Smart Contracts - Hedera Agent Economy

ERC-8004 compliant agent registry and x402 payment processor smart contracts.

## 📁 Directory Structure

```
contracts/
├── src/
│   ├── AgentRegistry.sol          # ERC-8004 agent discovery
│   └── PaymentProcessor.sol       # x402 payment escrow
├── deploy/
│   ├── deploy.js                  # Deployment script
│   ├── verify.js                  # Verification script
│   ├── generate-evm-key.js        # EVM key generator
│   └── verify-config.js           # Config verification
├── tests/
│   ├── AgentRegistry.test.js      # Agent registry tests
│   └── PaymentProcessor.test.js   # Payment processor tests
├── hardhat.config.js              # Hardhat configuration
├── package.json                   # Dependencies
├── deployment.json                # Deployed addresses (generated)
└── README.md                      # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file in project root with:

```env
EVM_PRIVATE_KEY=0x...
RPC_URL=https://testnet.hashio.io/api
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

### 4. Run Tests

```bash
npx hardhat test
```

### 5. Deploy to Testnet

```bash
npx hardhat run deploy/deploy.js --network hedera_testnet
```

## 📝 Smart Contracts

### AgentRegistry.sol

**Purpose:** ERC-8004 compliant agent discovery and capability registry

**Key Features:**
- Register agents with capabilities
- **ERC-8004 Trust Score Generation**: Automatic calculation based on metadata and capabilities (50-65 initial score)
- Search agents by capability
- Update agent capabilities
- **ERC-8004 Reputation Registry**: Submit and retrieve feedback with proof-of-payment linking
- **A2A Communication**: Initiate and complete agent-to-agent interactions with trust establishment
- **Trust Establishment**: Automatic trust boosts from successful payments and interactions
- Trust score management (owner-only for manual overrides)
- On-chain agent discovery

**Main Functions:**
```solidity
function registerAgent(string name, string[] capabilities, string metadata)
function getAgent(address agentAddress) returns (Agent)
function searchByCapability(string capability) returns (address[])
function updateCapabilities(string[] newCapabilities)
function updateTrustScore(address agent, uint256 score) onlyOwner
function submitFeedback(address toAgent, uint256 rating, string comment, bytes32 paymentTxHash)
function getAgentReputation(address agentAddress) returns (ReputationFeedback[])
function initiateA2ACommunication(address toAgent, string capability) returns (bytes32)
function completeA2AInteraction(bytes32 interactionId)
function establishTrustFromPayment(address agent1, address agent2, bytes32 transactionHash)
function getA2AInteraction(bytes32 interactionId) returns (A2AInteraction)
function getAgentInteractions(address agentAddress) returns (bytes32[])
```

**Events:**
```solidity
event AgentRegistered(address indexed agentAddress, string name, string[] capabilities)
event AgentUpdated(address indexed agentAddress, string[] newCapabilities)
event TrustScoreUpdated(address indexed agentAddress, uint256 newScore)
event ReputationFeedbackSubmitted(address indexed fromAgent, address indexed toAgent, uint256 rating)
event A2AInteractionInitiated(bytes32 indexed interactionId, address indexed fromAgent, address indexed toAgent, string capability)
event A2AInteractionCompleted(bytes32 indexed interactionId, address indexed fromAgent, address indexed toAgent)
event TrustEstablished(address indexed agent1, address indexed agent2, bytes32 indexed transactionHash)
```

### PaymentProcessor.sol

**Purpose:** x402-compatible payment processor with escrow functionality

**Key Features:**
- Create escrow payments
- Release payments to payee
- Refund payments to payer
- Query escrow status
- Reentrancy protection

**Main Functions:**
```solidity
function createEscrow(address payee, string description, uint256 expirationDays) payable returns (bytes32)
function releaseEscrow(bytes32 escrowId)
function refundEscrow(bytes32 escrowId)
function getEscrow(bytes32 escrowId) returns (Escrow)
```

**Events:**
```solidity
event EscrowCreated(bytes32 indexed escrowId, address payer, address payee, uint256 amount, string description, uint256 expirationTime)
event EscrowCompleted(bytes32 indexed escrowId, uint256 amount)
event EscrowRefunded(bytes32 indexed escrowId, uint256 amount)
event TrustEstablishmentTriggered(bytes32 indexed escrowId, address indexed payer, address indexed payee)
```

## 🧪 Testing

### Run All Tests

```bash
npx hardhat test
```

### Run Specific Test File

```bash
npx hardhat test tests/AgentRegistry.test.js
```

### Test Coverage

The test suite covers:

**AgentRegistry:**
- ✅ Agent registration
- ✅ Duplicate registration prevention
- ✅ Agent search by capability
- ✅ Capability updates
- ✅ Trust score management
- ✅ Access control

**PaymentProcessor:**
- ✅ Escrow creation
- ✅ Escrow release
- ✅ Escrow refund
- ✅ Authorization checks
- ✅ Reentrancy protection
- ✅ Balance tracking

## 🔗 Deployment

### Deploy to Hedera Testnet

```bash
npx hardhat run deploy/deploy.js --network hedera_testnet
```

This will:
1. Deploy AgentRegistry contract
2. Deploy PaymentProcessor contract
3. Save addresses to `deployment.json`
4. Display HashScan links for verification

### Deployment Output

```json
{
  "network": "hedera_testnet",
  "chainId": 296,
  "deployer": "0x...",
  "contracts": {
    "AgentRegistry": "0x...",
    "PaymentProcessor": "0x..."
  },
  "timestamp": "2025-11-01T...",
  "blockNumber": 12345
}
```

## 🔍 Verification

### Verify on HashScan (Manual)

1. Visit https://hashscan.io/testnet/contract/<address>
2. Click "Contract" tab
3. Click "Verify & Publish"
4. Upload source code or use Sourcify

### Verify with Foundry (if using Forge)

```bash
forge verify-contract \
  --chain-id 296 \
  --verifier sourcify \
  --verifier-url "https://server-verify.hashscan.io/" \
  <CONTRACT_ADDRESS> \
  src/AgentRegistry.sol:AgentRegistry
```

## 📊 Gas Usage

Approximate gas costs on Hedera testnet:

| Operation | Gas Used | Cost (at 0.0000001 HBAR/gas) |
|-----------|----------|-------------------------------|
| Deploy AgentRegistry | ~800,000 | ~0.08 HBAR |
| Deploy PaymentProcessor | ~600,000 | ~0.06 HBAR |
| Register Agent | ~150,000 | ~0.015 HBAR |
| Create Escrow | ~100,000 | ~0.01 HBAR |
| Release Escrow | ~50,000 | ~0.005 HBAR |

## 🛠️ Development

### Compile Contracts

```bash
npx hardhat compile
```

### Clean Build

```bash
npx hardhat clean
```

### Run Hardhat Console

```bash
npx hardhat console --network hedera_testnet
```

### Interact with Contracts

```javascript
// In Hardhat console
const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
const registry = await AgentRegistry.attach("0x...");
await registry.getAllAgents();
```

## 🔐 Security

### Audited Features

- ✅ OpenZeppelin Ownable for access control
- ✅ ReentrancyGuard for payment safety
- ✅ Input validation on all functions
- ✅ Event emission for all state changes

### Security Best Practices

1. **Access Control:** Only contract owner can update trust scores
2. **Reentrancy Protection:** All payment functions use `nonReentrant`
3. **Input Validation:** All functions validate inputs before execution
4. **Event Logging:** All critical operations emit events

## 📚 Dependencies

```json
{
  "@nomicfoundation/hardhat-ethers": "^3.0.0",
  "@nomicfoundation/hardhat-toolbox": "^4.0.0",
  "hardhat": "^2.19.0",
  "ethers": "^6.9.0",
  "@openzeppelin/contracts": "^5.0.0"
}
```

## 🐛 Troubleshooting

### "Cannot find module '@openzeppelin/contracts'"

```bash
npm install
```

### "Invalid private key"

Ensure `EVM_PRIVATE_KEY` is in hex format (`0x...`)

### "Network request failed"

Check RPC URL and internet connection:
```bash
curl https://testnet.hashio.io/api
```

### "Insufficient funds"

Get testnet HBAR from: https://portal.hedera.com/faucet

## 📖 Resources

- **Hedera Docs:** https://docs.hedera.com/
- **Hardhat:** https://hardhat.org/docs
- **OpenZeppelin:** https://docs.openzeppelin.com/contracts/
- **ERC-8004:** https://github.com/erc-8004/erc-8004-contracts

## ✅ Checklist

Before deployment:
- [ ] Dependencies installed
- [ ] `.env` configured
- [ ] Contracts compile successfully
- [ ] All tests passing
- [ ] Sufficient testnet HBAR

After deployment:
- [ ] `deployment.json` created
- [ ] Contracts verified on HashScan
- [ ] Backend updated with addresses
- [ ] Integration tested

---

**Need help?** Check the [main setup guide](../SETUP_WEB3.md) or ask the team!
