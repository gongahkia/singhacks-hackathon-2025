# Hedera - Building an Agent-first Digital Economy

> **Agentic Economy Solutions** — Build agentic AI-driven solutions using ERC-8004 and x402 payments for trustless, autonomous agent interactions on the Hedera testnet

---

## 📚 Documentation Structure

This hackathon project includes **4 comprehensive guides** for your team:

### 1. **[QUICKSTART.md](./QUICKSTART.md)** - Start Here! ⚡
- **For**: Everyone
- **Time**: 30 minutes
- **Content**: 
  - Environment setup
  - Hedera account creation
  - Project structure
  - 48-hour timeline overview
  - Testing procedures

### 2. **[WEB3_GUIDE.md](./WEB3_GUIDE.md)** - Blockchain Developer 🔵
- **For**: Developer 1 (Junior, Blockchain Lead)
- **Time**: 45 minutes
- **Content**:
  - Smart contract development (AgentRegistry, PaymentProcessor)
  - Solidity code examples
  - Hardhat setup & deployment
  - Contract testing
  - Backend integration

### 3. **[WEB2_GUIDE.md](./WEB2_GUIDE.md)** - Backend Developer 🟢
- **For**: Developer 2 (Junior, Backend Lead)
- **Time**: 45 minutes
- **Content**:
  - Express.js API development
  - Hedera SDK integration
  - HCS (Consensus Service) usage
  - Service layer architecture
  - REST API endpoints

### 4. **[FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)** - UI Developers 🟡🟠
- **For**: Developer 3 & 4 (Undergraduates)
- **Time**: 45 minutes
- **Content**:
  - Framework-agnostic setup (choose React, Vue, Svelte, etc.)
  - Required integration stubs for backend/Web3
  - Wallet connection patterns (WalletConnect/HashPack/Blade)
  - API client specifications
  - Component and page requirements

### 5. **[TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)** - Testing & Demo 🧪
- **For**: All Developers, Demo Preparation
- **Time**: 30 minutes
- **Content**:
  - How to test agent-to-agent payment and communication
  - REST API testing examples
  - Hedera MCP tools usage
  - Complete demo flow and scripts
  - Troubleshooting guide

### 6. **[MCP_DEMO_GUIDE.md](./docs/MCP_DEMO_GUIDE.md)** - Hedera MCP Integration 🛠️
- **For**: Developers using Hedera MCP tools
- **Time**: 20 minutes
- **Content**:
  - Hedera MCP tools setup
  - Direct blockchain operations
  - Hybrid API + MCP workflows
  - Complete payment flow examples

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Read Documentation
1. **Everyone**: Read [QUICKSTART.md](./QUICKSTART.md) first
2. **Then read your role-specific guide**:
   - Dev 1 (Web3): [WEB3_GUIDE.md](./WEB3_GUIDE.md)
   - Dev 2 (Web2): [WEB2_GUIDE.md](./WEB2_GUIDE.md)
   - Dev 3 & 4 (Frontend): [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)

### Step 2: Setup Environment
```bash
# 1. Create Hedera testnet account
Visit: https://portal.hedera.com/

# 2. Clone repository
git clone <your-repo-url>
cd hedera-agent-economy

# 3. Install dependencies
npm install
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Configure .env (see QUICKSTART.md)
```

### Step 3: Start Building
- Follow your hour-by-hour timeline in your role-specific guide
- Communicate frequently with team
- Test early and often

### Step 4: Test Agent-to-Agent Features

**Option A: Single Wallet (Limited)**
```bash
# Run automated demo (uses single wallet - limited A2A testing)
node tests/integration/a2a-payment-demo.js
```

**Option B: Multi-Wallet (Full A2A Testing) - Recommended**
```bash
# 1. Generate .env files for two agents
npm run setup:agents

# 2. Create two Hedera accounts (via MCP or Portal)
#    See docs/MULTI_AGENT_SETUP.md for details

# 3. Fill in .env.alice and .env.bob with account credentials

# 4. Run full multi-agent demo
npm run test:a2a-demo-multi
```

See `docs/MULTI_AGENT_SETUP.md` for complete multi-agent setup instructions.

---

## 🗺️ Hackathon Roadmap (Aligned to Scoring)

### Day 1
- Foundation (Feasibility, Technical Depth)
  - Contracts: compile, deploy to testnet, export `deployment.json`
  - Backend: health check, agents, payments, tokens, x402 challenge/verify
  - Frontend: choose framework, scaffold, implement `api-client` + wallet connect
  - Verify end-to-end: register agent, create escrow, release, view on HashScan

### Day 2
- Creativity + Visual Design + Reachability
  - Agent directory: multi-capability filters, sort by trust/date
  - Trust visuals: badges/charts, mobile responsiveness, animations
  - Real-time UX: polling for agents/payments, toast notifications
  - x402 full flow UI: challenge → pay → verify with clear steps
  - HCS interaction timeline: show on-chain interaction logs

### Cross-Team Syncs (15 min)
- Hour 12, 24, 36: demo readiness checks; unblock issues; assign polish tasks

### Deliverables for Judging
- Live demo with: discovery, trust, payment, verification on HashScan
- Docs: setup, endpoints, contract addresses, architecture diagram

---

## Challenge Summary

**Goal**: Build a working prototype of an agentic system that uses **ERC-8004 for agent discovery and trust**, integrated with **x402 for secure on-chain payments**, showcasing autonomous agent-to-agent transactions on the Hedera testnet.

**Expected Final Product**: A unified agentic system that demonstrates how agents can discover each other, establish trust, and execute payments seamlessly on the Hedera testnet, fostering a decentralized digital economy.

> **📖 IMPORTANT**: Before diving into the code, please read this **README.md** document first. It contains essential context, detailed requirements, and additional guidance that will help you build a winning solution.

---

## 📋 The Problem We're Solving

### Current State
- AI agents lack standardized, trustless mechanisms for communication and payments, leading to silos and security risks
- Autonomous interactions face inefficiencies where real-time, verifiable transactions are essential
- **Cross-functional friction**: AI agents struggle to discover each other, establish trust, and execute payments seamlessly
- **High operational risk**: Manual processes and lack of interoperability limit the potential of autonomous agent-driven services

### What You're Building
- **Unified Agentic Economy Platform**
  - Implement ERC-8004 protocol for agent discovery and capability queries
  - Enable A2A (Agent-to-Agent) communication with trust establishment
  - Integrate x402 payments for secure on-chain transactions
  - Provide agent interaction logs using Hedera Consensus Service
  - Support autonomous agent-to-agent transactions and negotiations
  - Enable stablecoin transfers and crypto payments on Hedera testnet

### Who Benefits
- AI x web3 developers building agentic applications, businesses integrating autonomous systems, and end-users benefiting from seamless agent-driven services like automated payments or negotiations.

---

## 🎯 What You're Building

A unified agentic system that enables autonomous agent interactions:

```
┌─────────────────────────────────────────────────────────────────┐
│  ERC-8004 Agent Discovery & Trust                               │
│  ↓ Agent discovery → Capability queries → Trust establishment    │
├─────────────────────────────────────────────────────────────────┤
│  x402 Payment Integration                                       │
│  ↓ Secure payments → On-chain transactions → Verification      │
├─────────────────────────────────────────────────────────────────┤
│  Unified Agentic Digital Economy                               │
│  ↓ Autonomous agent-to-agent transactions & negotiations       │
├─────────────────────────────────────────────────────────────────┤
```

---

## 🏗️ Solution Components — Step-by-Step Build Guide

### Unified Agentic Economy System

**What it does**: Creates a seamless integration of ERC-8004 agent discovery and x402 payments to enable autonomous agent-to-agent transactions on the Hedera testnet.

**Key Components**:

#### 1. ERC-8004 Agent Discovery & Trust
- **Agent discovery**: Implement ERC-8004 protocol for agent discovery and capability queries
- **Trust establishment**: Enable secure A2A communication mechanisms
- **Capability registry**: Maintain registry of agent capabilities and services
- **Service discovery**: Enable agents to find relevant services and capabilities
- **Identity verification**: Verify agent identities and capabilities

#### 2. x402 Payment Integration
- **Payment processing**: Handle stablecoin transfers and crypto payments
- **Transaction validation**: Verify payment authenticity and completeness
- **Multi-currency support**: Support various payment tokens and stablecoins
- **Payment routing**: Optimize payment paths and minimize fees
- **Conditional payments**: Enable payments based on specific conditions

#### 3. Hedera Testnet Integration
- **Network connectivity**: Connect to Hedera testnet using provided APIs
- **Transaction submission**: Submit and track payment transactions
- **Mirror node integration**: Access real-time network data and transaction history
- **Account management**: Handle agent account creation and management
- **Consensus logging**: Log agent interactions using Hedera Consensus Service

#### 4. Autonomous Transaction Engine
- **A2A messaging**: Enable secure agent-to-agent communication
- **Transaction intents**: Process and validate agent transaction intentions
- **Smart contracts**: Implement automated payment logic
- **Escrow mechanisms**: Support secure escrow and release protocols
- **Micropayment optimization**: Handle small-value transactions efficiently

#### 5. Trust & Security Layer
- **Permission management**: Control access to agent services and data
- **Audit trails**: Maintain comprehensive logs of agent interactions
- **Security protocols**: Implement secure communication channels
- **Error handling**: Manage failed transactions and retry mechanisms
- **Performance monitoring**: Track agent performance and availability

**Deliverables**:
- [x] Working ERC-8004 integration system (Completed: Official ERC-8004 contracts + custom contracts with hybrid trust scoring)
- [x] Agent discovery and capability registry (Completed: AI-powered search with Groq + traditional capability search)
- [x] Secure A2A communication protocols (Completed: MCP protocol + traditional A2A service)
- [x] x402 payment integration (Completed: x402 hosted facilitator + payment verification flow)
- [x] Hedera testnet connectivity and transaction management (Completed: Hedera Agent Kit integration)
- [x] Real-time payment verification system (Completed: WebSocket live updates + polling + Mirror node queries)
- [x] Comprehensive audit trails for all activities (Completed: HCS logging with real-time timeline visualization)
- [x] Autonomous transaction execution capabilities (Completed: Multi-currency payments + automatic trust establishment)

**Enhanced Features**:
- ⚡ **Groq AI Integration**: Ultra-fast agent discovery (<500ms)
- 📡 **MCP Protocol**: Industry-standard Model Context Protocol for agent communication
- 🔐 **Hybrid Trust Scoring**: Combines official ERC-8004 + custom performance metrics
- 💵 **x402 Payment Flow**: Full integration with hosted facilitator for payment verification
- 💰 **Multi-Currency**: HBAR + USDC token support
- 🔴 **Real-Time Updates**: WebSocket + polling for live transaction visualization
- 🤖 **AI-Powered Features**: Natural language search, capability suggestions, transaction analysis

---

## 🛠️ Technology Stack & Resources

### APIs & Services
- **Groq AI**: Ultra-fast LLM inference for agent discovery and analysis
  - https://console.groq.com/docs/overview
- **Hedera Agent Kit**: Official toolkit with MCP server support
  - https://github.com/hashgraph/hedera-agent-kit-js
- **x402 Facilitator**: Hosted payment verification service
  - https://x402-hedera-production.up.railway.app
- **Hedera Mirror Node Swagger Doc**: For real-time network data and transaction history
  - https://testnet.mirrornode.hedera.com/api/v1/docs/
- **HashScan Explorer**: For browsing transactions and smart contracts
  - https://hashscan.io/testnet/home
- **JSON RPC**: https://testnet.hashio.io/api (CHAIN ID: 296)

### SDKs & Libraries
- **Groq**: Ultra-fast LLM inference (@langchain/groq)
- **Hedera Agent Kit**: Official SDK with MCP protocol (@hashgraphonline/standards-agent-kit)
  - Overview: https://docs.hedera.com/hedera/open-source-solutions/ai-studio-on-hedera/hedera-ai-agent-kit
  - SDK: https://github.com/hashgraph/hedera-agent-kit-js
  - MCP Server: https://github.com/hashgraph/hedera-agent-kit-js/blob/main/docs/DEVEXAMPLES.md#option-d-try-out-the-mcp-server
- **Official ERC-8004 Contracts**: Deployed on Hedera Testnet
  - IdentityRegistry: 0x4c74ebd72921d537159ed2053f46c12a7d8e5923
  - ReputationRegistry: 0xc565edcba77e3abeade40bfd6cf6bf583b3293e0
- **Hedera x402 repo**: https://github.com/hedera-dev/x402-hedera
- **Hedera SDKs**: JavaScript (@hashgraph/sdk), Python, Go, Rust, Java, C++

### Development Resources
- **Dev Portal**: https://portal.hedera.com/ (Creates account and tops up with testnet hbar)
- **Testnet Faucet**: https://portal.hedera.com/faucet
- **Dev Playground**: https://portal.hedera.com/playground

### Data Sources
- **Agent interaction logs (JSON)**: Data for agent discovery, capability queries, A2A communication
- **Payment data (CSV)**: Timestamped records of x402 transactions on Hedera testnet

---


## 🏆 Judging Criteria

Your submission will be evaluated on:

### Main Hackathon Criteria

| Criteria | Weight | Description |
|----------|--------|-------------|
| **Creativity** | 20% | Innovative integration of ERC-8004 and x402 in agentic workflows |
| **Visual Design** | 10% | Clarity and intuitiveness of the agent interface and transaction visualizations |
| **Feasibility** | 20% | Practicality for real-world deployment on DLT networks |
| **Reachability** | 20% | Potential for broad adoption across various sectors |
| **Technical Depth** | 30% | Effective use of protocols, security measures, and agent autonomy |

---

## 🤝 Support & Contact

**Getting Help**:
- **Technical questions**: Ask during mentor sessions
- **Hedera documentation**: Reference Hedera Developer Portal and SDK documentation
- **ERC-8004 resources**: Check GitHub repository and documentation
- **x402 payments**: Reference Hedera x402 repository and examples

## 🔑 Key Resources

### Hedera Docs & Portals
- **Hedera Developer Portal:** https://portal.hedera.com/
- **Hedera Documentation:** https://docs.hedera.com/

### Agentic / Protocol
- **ERC-8004 Contracts (agent discovery & trust):** https://github.com/erc-8004/erc-8004-contracts
- **Hedera Agent Kit (agent-to-agent + HCS/x402 patterns):** https://github.com/hashgraph/hedera-agent-kit-js

### Hedera SDKs (Hiero)
- **JavaScript/TypeScript:** https://github.com/hiero-ledger/hiero-sdk-js  
- **Python:** https://github.com/hiero-ledger/hiero-sdk-python  
- **Go:** https://github.com/hiero-ledger/hiero-sdk-go  
- **Rust:** https://github.com/hiero-ledger/hiero-sdk-rust  
- **Java:** https://github.com/hiero-ledger/hiero-sdk-java  
- **C++:** https://github.com/hiero-ledger/hiero-sdk-cpp

---

## 📋 Presentation Requirements

### Format
- **Live or recorded demo** showcasing your agentic system

### Key Elements
- **Clear problem articulation**: Define the agentic economy challenges addressed
- **Solution representation**: Showcase the prototype's architecture and key flows
- **Functional highlights**: Demonstrate agent discovery, trust establishment, and payments on the Hedera testnet
- **Decision-making process**: Explain how ERC-8004 and x402 solve the issues
- **Visual Components**: Include diagrams of agent interactions and transaction flows

### Requirements
- **Conciseness**: Keep presentation focused and to the point
- **Comprehensiveness**: Cover all key aspects of your solution
- **Descriptions and definitions**: Provide clear explanations where necessary

---

## 🚀 Getting Started

### First 5 Minutes
1. **Clone repository** and run setup: `./setup.sh` (Linux/Mac) or `setup.bat` (Windows)
2. **Create `.env` file** with required credentials (see Environment Variables below)
3. **Read QUICKSTART.md** for full setup instructions

### Environment Variables Required

Create a `.env` file in the root directory with:

```env
# Hedera Network
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e...
RPC_URL=https://testnet.hashio.io/api
MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1

# EVM Compatibility
EVM_PRIVATE_KEY=0x...

# AI Integration (Groq - REQUIRED for AI features)
GROQ_API_KEY=your_groq_api_key_here

# x402 Payment Facilitator
X402_FACILITATOR_URL=https://x402-hedera-production.up.railway.app

# Token Support
USDC_TOKEN_ID=0.0.429274

# Frontend
FRONTEND_URL=http://localhost:3000

# Smart Contracts (auto-filled after deployment)
AGENT_REGISTRY_ADDRESS=0x...
PAYMENT_PROCESSOR_ADDRESS=0x...
```

**Get API Keys:**
- Groq API: https://console.groq.com (free tier available)
- Hedera Account: https://portal.hedera.com (testnet faucet available)

### Next 30 Minutes
4. **Set up Hedera testnet account** via the developer portal (https://portal.hedera.com/)
5. **Generate ECDSA key** for ethers.js: `npx ethers wallet generate` (if needed)
6. **Read your role-specific guide**:
   - Dev 1: [WEB3_GUIDE.md](./WEB3_GUIDE.md)
   - Dev 2: [WEB2_GUIDE.md](./WEB2_GUIDE.md)
   - Dev 3 & 4: [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)

### Build Phase
7. **Familiarize yourself** with ERC-8004 and x402 protocols
8. **Implement core features** following your guide's roadmap
9. **Test end-to-end** on Hedera testnet
10. **Prepare demo** with visual components and clear explanations

**Remember**: Focus on demonstrating autonomous agent interactions with real payments on the Hedera testnet. The goal is to showcase a working agentic digital economy that seamlessly integrates ERC-8004 and x402!

---

## 📁 Project Structure

```
hedera-agent-economy/
├── contracts/          # 🔵 Dev 1: Smart contracts (Solidity/Hardhat)
├── backend/            # 🟢 Dev 2: Express API (Node.js)
├── frontend/           # 🟡🟠 Dev 3 & 4: UI (Your choice of framework)
├── tests/              # Integration tests
├── .env.example        # Environment template (copy to .env)
├── setup.sh            # Automated setup (Linux/Mac)
├── setup.bat           # Automated setup (Windows)
└── README.md           # You are here
```

Each subdirectory has its own README.md with quick start instructions.
