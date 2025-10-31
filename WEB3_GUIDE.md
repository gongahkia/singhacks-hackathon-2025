# 🔵 Web3 Developer Guide
## Smart Contracts & Blockchain Integration (Developer 1)

---

## 👤 Your Role

**Focus**: Smart contracts, Hedera blockchain integration, contract deployment

**Your Workspace**: `/contracts` folder

**Timeline Focus**: Hours 3-18 (contracts & deployment)

**Key Deliverables**:
- ✅ AgentRegistry.sol (ERC-8004 compliant)
- ✅ PaymentProcessor.sol (x402 integration)
- ✅ Deployment scripts
- ✅ Contract testing
- ✅ Hedera SDK wrapper for backend

---

## ⏰ Your 48-Hour Timeline

### Day 1

| Hours | Tasks | Deliverables |
|-------|-------|--------------|
| **0-3** | Setup Hardhat, create contract files | Structure ready |
| **3-6** | Write AgentRegistry contract | Agent registry working |
| **6-9** | Deploy to testnet, start PaymentProcessor | Contracts on-chain |
| **9-12** | Complete PaymentProcessor, test | Payment system working |
| **12-15** | Add trust scores, optimize gas | Features complete |
| **15-18** | Backend integration helpers | Backend can call contracts |
| **18-24** | Help with debugging, code review | Support team |

### Day 2

| Hours | Tasks | Focus |
|-------|-------|-------|
| **24-30** | Contract optimizations, security review | Polish |
| **30-36** | Fix any contract bugs, final testing | Stability |
| **36-48** | Help with demo, prepare tech talk | Presentation |

---

## 📁 Your File Structure

```
contracts/
├── src/
│   ├── AgentRegistry.sol          # Your main contract #1
│   └── PaymentProcessor.sol       # Your main contract #2
├── scripts/
│   ├── deploy.js                  # Deployment script
│   └── verify.js                  # Verification script
├── test/
│   ├── AgentRegistry.test.js      # Unit tests
│   └── PaymentProcessor.test.js   # Unit tests
├── hardhat.config.js              # Hardhat configuration
├── deployment.json                # Deployed addresses (output)
└── package.json
```

---

## 🛠️ Setup (Hour 0-3)

### Install Dependencies

```bash
cd contracts
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npm install @openzeppelin/contracts
npx hardhat
# Choose: Create a JavaScript project
```

### Hardhat Configuration

Create `hardhat.config.js`:

```javascript
require("@nomiclabs/hardhat-ethers");
require("dotenv").config({ path: '../.env' });

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hedera_testnet: {
      url: process.env.RPC_URL || "https://testnet.hashio.io/api",
      accounts: [process.env.HEDERA_PRIVATE_KEY],
      chainId: 296
    }
  }
};
```

---

## 📝 Contract 1: AgentRegistry.sol (Hour 3-6)

### Implementation

Create `src/AgentRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 compliant agent discovery and capability registry
 * @dev Stores agent information on-chain for trustless discovery
 */
contract AgentRegistry is Ownable {
    
    struct Agent {
        string name;
        address agentAddress;
        string[] capabilities;
        string metadata;        // IPFS hash or JSON
        uint256 trustScore;     // 0-100
        uint256 registeredAt;
        bool isActive;
    }
    
    // Storage
    mapping(address => Agent) public agents;
    mapping(string => address[]) public capabilityIndex;
    address[] public agentList;
    
    // Events
    event AgentRegistered(
        address indexed agentAddress,
        string name,
        string[] capabilities
    );
    
    event AgentUpdated(
        address indexed agentAddress,
        string[] newCapabilities
    );
    
    event TrustScoreUpdated(
        address indexed agentAddress,
        uint256 newScore
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Register a new agent
     * @param _name Agent name
     * @param _capabilities Array of capability strings
     * @param _metadata Additional metadata (IPFS hash)
     */
    function registerAgent(
        string memory _name,
        string[] memory _capabilities,
        string memory _metadata
    ) external {
        require(bytes(_name).length > 0, "Name required");
        require(!agents[msg.sender].isActive, "Already registered");
        require(_capabilities.length > 0, "At least one capability required");
        
        Agent storage newAgent = agents[msg.sender];
        newAgent.name = _name;
        newAgent.agentAddress = msg.sender;
        newAgent.capabilities = _capabilities;
        newAgent.metadata = _metadata;
        newAgent.trustScore = 50; // Neutral starting score
        newAgent.registeredAt = block.timestamp;
        newAgent.isActive = true;
        
        agentList.push(msg.sender);
        
        // Index capabilities for search
        for (uint i = 0; i < _capabilities.length; i++) {
            capabilityIndex[_capabilities[i]].push(msg.sender);
        }
        
        emit AgentRegistered(msg.sender, _name, _capabilities);
    }
    
    /**
     * @notice Get agent details
     * @param _agentAddress Agent's address
     * @return Agent struct
     */
    function getAgent(address _agentAddress) 
        external 
        view 
        returns (Agent memory) 
    {
        require(agents[_agentAddress].isActive, "Agent not found");
        return agents[_agentAddress];
    }
    
    /**
     * @notice Search agents by capability
     * @param _capability Capability to search for
     * @return Array of agent addresses
     */
    function searchByCapability(string memory _capability) 
        external 
        view 
        returns (address[] memory) 
    {
        return capabilityIndex[_capability];
    }
    
    /**
     * @notice Get all registered agents
     * @return Array of all agent addresses
     */
    function getAllAgents() external view returns (address[] memory) {
        return agentList;
    }
    
    /**
     * @notice Update agent capabilities
     * @param _newCapabilities New array of capabilities
     */
    function updateCapabilities(string[] memory _newCapabilities) external {
        require(agents[msg.sender].isActive, "Not registered");
        require(_newCapabilities.length > 0, "At least one capability required");
        
        // Remove old capability indexes
        string[] memory oldCapabilities = agents[msg.sender].capabilities;
        for (uint i = 0; i < oldCapabilities.length; i++) {
            _removeFromCapabilityIndex(oldCapabilities[i], msg.sender);
        }
        
        // Update and index new capabilities
        agents[msg.sender].capabilities = _newCapabilities;
        for (uint i = 0; i < _newCapabilities.length; i++) {
            capabilityIndex[_newCapabilities[i]].push(msg.sender);
        }
        
        emit AgentUpdated(msg.sender, _newCapabilities);
    }
    
    /**
     * @notice Update trust score (owner only)
     * @param _agentAddress Agent to update
     * @param _newScore New trust score (0-100)
     */
    function updateTrustScore(address _agentAddress, uint256 _newScore) 
        external 
        onlyOwner 
    {
        require(agents[_agentAddress].isActive, "Agent not found");
        require(_newScore <= 100, "Score must be 0-100");
        
        agents[_agentAddress].trustScore = _newScore;
        emit TrustScoreUpdated(_agentAddress, _newScore);
    }
    
    /**
     * @notice Get agent count
     * @return Total number of registered agents
     */
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }
    
    /**
     * @notice Internal: Remove agent from capability index
     */
    function _removeFromCapabilityIndex(
        string memory _capability, 
        address _agent
    ) internal {
        address[] storage addresses = capabilityIndex[_capability];
        for (uint i = 0; i < addresses.length; i++) {
            if (addresses[i] == _agent) {
                addresses[i] = addresses[addresses.length - 1];
                addresses.pop();
                break;
            }
        }
    }
}
```

### Test Compilation

```bash
npx hardhat compile
# Should see: "Compiled 1 Solidity file successfully"
```

---

## 💰 Contract 2: PaymentProcessor.sol (Hour 6-12)

### Implementation

Create `src/PaymentProcessor.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PaymentProcessor
 * @notice x402-compatible payment processor with escrow functionality
 * @dev Handles secure payments between agents with escrow mechanism
 */
contract PaymentProcessor is ReentrancyGuard {
    
    enum EscrowStatus {
        Active,
        Completed,
        Refunded,
        Disputed
    }
    
    struct Escrow {
        bytes32 escrowId;
        address payer;
        address payee;
        uint256 amount;
        string serviceDescription;
        EscrowStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    // Storage
    mapping(bytes32 => Escrow) public escrows;
    mapping(address => bytes32[]) public payerEscrows;
    mapping(address => bytes32[]) public payeeEscrows;
    
    // Events
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string serviceDescription
    );
    
    event EscrowCompleted(
        bytes32 indexed escrowId,
        uint256 amount
    );
    
    event EscrowRefunded(
        bytes32 indexed escrowId,
        uint256 amount
    );
    
    /**
     * @notice Create an escrow payment
     * @param _payee Recipient address
     * @param _serviceDescription Description of service
     * @return escrowId Unique escrow identifier
     */
    function createEscrow(
        address _payee,
        string memory _serviceDescription
    ) external payable returns (bytes32) {
        require(msg.value > 0, "Amount must be > 0");
        require(_payee != address(0), "Invalid payee");
        require(_payee != msg.sender, "Cannot pay yourself");
        require(bytes(_serviceDescription).length > 0, "Description required");
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                _payee,
                msg.value,
                block.timestamp,
                block.number
            )
        );
        
        require(escrows[escrowId].payer == address(0), "Escrow exists");
        
        Escrow storage newEscrow = escrows[escrowId];
        newEscrow.escrowId = escrowId;
        newEscrow.payer = msg.sender;
        newEscrow.payee = _payee;
        newEscrow.amount = msg.value;
        newEscrow.serviceDescription = _serviceDescription;
        newEscrow.status = EscrowStatus.Active;
        newEscrow.createdAt = block.timestamp;
        newEscrow.completedAt = 0;
        
        payerEscrows[msg.sender].push(escrowId);
        payeeEscrows[_payee].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, _payee, msg.value, _serviceDescription);
        
        return escrowId;
    }
    
    /**
     * @notice Release escrow payment to payee
     * @param _escrowId Escrow to release
     */
    function releaseEscrow(bytes32 _escrowId) external nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.payer == msg.sender, "Only payer can release");
        require(escrow.status == EscrowStatus.Active, "Not active");
        require(escrow.amount > 0, "Invalid amount");
        
        escrow.status = EscrowStatus.Completed;
        escrow.completedAt = block.timestamp;
        
        uint256 amount = escrow.amount;
        address payee = escrow.payee;
        
        (bool success, ) = payee.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit EscrowCompleted(_escrowId, amount);
    }
    
    /**
     * @notice Refund escrow payment to payer
     * @param _escrowId Escrow to refund
     */
    function refundEscrow(bytes32 _escrowId) external nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        
        require(
            escrow.payer == msg.sender || escrow.payee == msg.sender,
            "Not authorized"
        );
        require(escrow.status == EscrowStatus.Active, "Not active");
        require(escrow.amount > 0, "Invalid amount");
        
        escrow.status = EscrowStatus.Refunded;
        escrow.completedAt = block.timestamp;
        
        uint256 amount = escrow.amount;
        address payer = escrow.payer;
        
        (bool success, ) = payer.call{value: amount}("");
        require(success, "Refund failed");
        
        emit EscrowRefunded(_escrowId, amount);
    }
    
    /**
     * @notice Get escrow details
     * @param _escrowId Escrow ID
     * @return Escrow struct
     */
    function getEscrow(bytes32 _escrowId) 
        external 
        view 
        returns (Escrow memory) 
    {
        require(escrows[_escrowId].payer != address(0), "Escrow not found");
        return escrows[_escrowId];
    }
    
    /**
     * @notice Get all escrows for a payer
     * @param _payer Payer address
     * @return Array of escrow IDs
     */
    function getPayerEscrows(address _payer) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return payerEscrows[_payer];
    }
    
    /**
     * @notice Get all escrows for a payee
     * @param _payee Payee address
     * @return Array of escrow IDs
     */
    function getPayeeEscrows(address _payee) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return payeeEscrows[_payee];
    }
    
    /**
     * @notice Get contract balance
     * @return Balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
```

### Test Compilation

```bash
npx hardhat compile
# Should compile both contracts
```

---

## 🚀 Deployment Script (Hour 9)

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Hedera Agent Economy Contracts...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "HBAR\n");

  // Deploy AgentRegistry
  console.log("📝 Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.deployed();
  console.log("✅ AgentRegistry deployed to:", agentRegistry.address);

  // Deploy PaymentProcessor
  console.log("\n💰 Deploying PaymentProcessor...");
  const PaymentProcessor = await hre.ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy();
  await paymentProcessor.deployed();
  console.log("✅ PaymentProcessor deployed to:", paymentProcessor.address);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      AgentRegistry: agentRegistry.address,
      PaymentProcessor: paymentProcessor.address
    },
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Deployment complete! Info saved to deployment.json");
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🔍 Verify on HashScan:");
  console.log(`AgentRegistry: https://hashscan.io/testnet/contract/${agentRegistry.address}`);
  console.log(`PaymentProcessor: https://hashscan.io/testnet/contract/${paymentProcessor.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
```

### Deploy to Testnet

```bash
npx hardhat run scripts/deploy.js --network hedera_testnet
```

**Verify on HashScan**: https://hashscan.io/testnet

---

## 🧪 Testing (Hour 12-15)

Create `test/AgentRegistry.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentRegistry", function () {
  let agentRegistry;
  let owner, agent1, agent2;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();
    
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.deployed();
  });

  it("Should register an agent", async function () {
    await agentRegistry.connect(agent1).registerAgent(
      "Alice Agent",
      ["smart-contracts", "auditing"],
      "ipfs://metadata"
    );

    const agent = await agentRegistry.getAgent(agent1.address);
    expect(agent.name).to.equal("Alice Agent");
    expect(agent.capabilities.length).to.equal(2);
    expect(agent.trustScore).to.equal(50);
  });

  it("Should search agents by capability", async function () {
    await agentRegistry.connect(agent1).registerAgent(
      "Alice",
      ["smart-contracts"],
      ""
    );
    
    await agentRegistry.connect(agent2).registerAgent(
      "Bob",
      ["smart-contracts", "frontend"],
      ""
    );

    const results = await agentRegistry.searchByCapability("smart-contracts");
    expect(results.length).to.equal(2);
  });

  it("Should prevent duplicate registration", async function () {
    await agentRegistry.connect(agent1).registerAgent(
      "Alice",
      ["testing"],
      ""
    );

    await expect(
      agentRegistry.connect(agent1).registerAgent("Alice2", ["testing2"], "")
    ).to.be.revertedWith("Already registered");
  });
});

describe("PaymentProcessor", function () {
  let paymentProcessor;
  let payer, payee;

  beforeEach(async function () {
    [payer, payee] = await ethers.getSigners();
    
    const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
    paymentProcessor = await PaymentProcessor.deploy();
    await paymentProcessor.deployed();
  });

  it("Should create an escrow", async function () {
    const amount = ethers.utils.parseEther("10");
    
    const tx = await paymentProcessor.connect(payer).createEscrow(
      payee.address,
      "Smart contract development",
      { value: amount }
    );

    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "EscrowCreated");
    const escrowId = event.args.escrowId;

    const escrow = await paymentProcessor.getEscrow(escrowId);
    expect(escrow.payer).to.equal(payer.address);
    expect(escrow.payee).to.equal(payee.address);
    expect(escrow.amount).to.equal(amount);
  });

  it("Should release escrow to payee", async function () {
    const amount = ethers.utils.parseEther("10");
    
    const tx = await paymentProcessor.connect(payer).createEscrow(
      payee.address,
      "Service",
      { value: amount }
    );

    const receipt = await tx.wait();
    const escrowId = receipt.events[0].args.escrowId;

    const payeeBalanceBefore = await payee.getBalance();
    
    await paymentProcessor.connect(payer).releaseEscrow(escrowId);
    
    const payeeBalanceAfter = await payee.getBalance();
    expect(payeeBalanceAfter.sub(payeeBalanceBefore)).to.equal(amount);
  });
});
```

### Run Tests

```bash
npx hardhat test
```

---

## 🔗 Backend Integration Helper (Hour 15-18)

Create `backend/blockchain/hedera-client.js`:

```javascript
const { ethers } = require('ethers');
const deploymentInfo = require('../../contracts/deployment.json');

// Import ABIs
const AgentRegistryABI = require('../../contracts/artifacts/contracts/src/AgentRegistry.sol/AgentRegistry.json').abi;
const PaymentProcessorABI = require('../../contracts/artifacts/contracts/src/PaymentProcessor.sol/PaymentProcessor.json').abi;

class BlockchainClient {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.HEDERA_PRIVATE_KEY, this.provider);
    
    this.agentRegistry = new ethers.Contract(
      deploymentInfo.contracts.AgentRegistry,
      AgentRegistryABI,
      this.wallet
    );
    
    this.paymentProcessor = new ethers.Contract(
      deploymentInfo.contracts.PaymentProcessor,
      PaymentProcessorABI,
      this.wallet
    );
  }

  // Agent Registry Methods
  async registerAgent(name, capabilities, metadata) {
    const tx = await this.agentRegistry.registerAgent(name, capabilities, metadata);
    const receipt = await tx.wait();
    return receipt;
  }

  async getAgent(address) {
    return await this.agentRegistry.getAgent(address);
  }

  async searchByCapability(capability) {
    return await this.agentRegistry.searchByCapability(capability);
  }

  async getAllAgents() {
    return await this.agentRegistry.getAllAgents();
  }

  // Payment Methods
  async createEscrow(payee, description, amountInHbar) {
    const amount = ethers.utils.parseEther(amountInHbar.toString());
    const tx = await this.paymentProcessor.createEscrow(payee, description, { value: amount });
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'EscrowCreated');
    return event.args.escrowId;
  }

  async releaseEscrow(escrowId) {
    const tx = await this.paymentProcessor.releaseEscrow(escrowId);
    return await tx.wait();
  }

  async getEscrow(escrowId) {
    return await this.paymentProcessor.getEscrow(escrowId);
  }
}

module.exports = new BlockchainClient();
```

---

## 🔐 Identity Verification & Tokens (Required by README)

### Signed Registration (Identity Verification)

To satisfy identity verification, require frontend/backend to submit a signed message when registering an agent. The backend should verify the signature recovers the caller’s address before calling `registerAgent`. Suggested message schema:

```json
{
  "action": "registerAgent",
  "name": "<agentName>",
  "capabilities": ["smart-contracts"],
  "timestamp": "<iso>"
}
```

Recovery and validation happen in backend (see WEB2 guide). No contract change is required.

### Stablecoin & Multi-currency Support

Stablecoin and fungible token transfers are handled via Hedera Token Service (HTS) at the service layer (see WEB2 guide token routes). The `PaymentProcessor` escrow handles native HBAR; tokens do not require changes to the contract for transfers.

---

## 👜 Wallets (WalletConnect) — No Contract Changes Needed

Wallet-based verification uses signed messages validated in the backend; smart contracts remain unchanged. Payments can be initiated by the wallet (HBAR escrow) and tokens via HTS service routes. Keep contract interfaces simple and rely on off-chain signature checks for identity.

## ✅ Your Checklist

### Hour 0-3: Setup
- [ ] Install Hardhat and dependencies
- [ ] Configure hardhat.config.js
- [ ] Create contract file structure
- [ ] Test compilation works

### Hour 3-6: AgentRegistry
- [ ] Write AgentRegistry contract
- [ ] Compile successfully
- [ ] Write basic tests
- [ ] Document functions

### Hour 6-9: Deployment
- [ ] Write deployment script
- [ ] Deploy to Hedera testnet
- [ ] Verify on HashScan
- [ ] Save deployment addresses

### Hour 9-12: PaymentProcessor
- [ ] Write PaymentProcessor contract
- [ ] Compile successfully
- [ ] Deploy to testnet
- [ ] Test escrow functions

### Hour 12-15: Testing & Polish
- [ ] Write comprehensive tests
- [ ] Run all tests (should pass)
- [ ] Optimize gas costs
- [ ] Add security checks

### Hour 15-18: Backend Integration
- [ ] Create blockchain client wrapper
- [ ] Export ABIs
- [ ] Test integration with backend
- [ ] Document usage

### Day 2: Support & Polish
- [ ] Fix any bugs found
- [ ] Help team with integration
- [ ] Prepare technical explanation for demo
- [ ] Security review

---

## 🚨 Common Issues

### Gas Estimation Failures
```javascript
// Add gas limit manually
const tx = await contract.method({ gasLimit: 500000 });
```

### Nonce Too Low
```javascript
// Get nonce manually
const nonce = await wallet.getTransactionCount();
const tx = await contract.method({ nonce });
```

### Contract Not Deployed
```bash
# Redeploy
npx hardhat run scripts/deploy.js --network hedera_testnet

# Update deployment.json path in backend
```

---

## 📚 Resources

- **Solidity Docs**: https://docs.soliditylang.org/
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts/
- **Hardhat**: https://hardhat.org/docs
- **Ethers.js**: https://docs.ethers.org/v6/
- **Hedera EVM**: https://docs.hedera.com/hedera/core-concepts/smart-contracts

---

## 🎯 Success Criteria

- [ ] Both contracts deployed and verified on testnet
- [ ] All tests passing
- [ ] Backend can interact with contracts
- [ ] Gas costs optimized
- [ ] Code is secure and well-documented
- [ ] Can explain architecture in demo

**You're the foundation of the project. Your contracts are the backbone! 🚀**

---

*Your focus: Make it secure, make it work, make it fast.*

