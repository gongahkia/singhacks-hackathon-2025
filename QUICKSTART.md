# ⚡ Quick Start Guide
## Get Running in 30 Minutes

---

## 📋 Hackathon Overview

**Project**: Hedera Agentic Economy Platform  
**Timeline**: 48 hours  
**Team**: 4 developers  
**Goal**: Build autonomous agent system with ERC-8004 discovery + x402 payments

---

## 🎯 What We're Building

A platform where AI agents can:
1. **Discover** each other (ERC-8004 registry)
2. **Establish trust** (on-chain reputation)
3. **Execute payments** (x402 escrow on Hedera)
4. **Log interactions** (Hedera Consensus Service)

---

## 👥 Team Structure

```
┌─────────────────────────────────────────────────────┐
│  🔵 Dev 1 (Junior)    │  🟢 Dev 2 (Junior)          │
│  Web3/Blockchain      │  Web2/Backend               │
│  Smart Contracts      │  API & Services             │
│  See: WEB3_GUIDE.md   │  See: WEB2_GUIDE.md         │
├─────────────────────────────────────────────────────┤
│  🟡 Dev 3 (Undergrad) │  🟠 Dev 4 (Undergrad)       │
│  Frontend Development │  Frontend Development       │
│  UI Components        │  Pages & Integration        │
│  See: FRONTEND_GUIDE.md                             │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Pre-Hackathon Setup (Do This Now!)

### Step 1: Create Hedera Account (5 minutes)

1. Visit: https://portal.hedera.com/
2. Sign up and create testnet account
3. **SAVE THESE VALUES**:
   ```
   Account ID: 0.0.xxxxx
   Private Key: 302e020100300506032b657004220420xxxxx
   ```
4. Get testnet HBAR from faucet: https://portal.hedera.com/faucet
5. Verify on HashScan: https://hashscan.io/testnet

---

### Step 2: Install Software (10 minutes)

```bash
# Check Node.js (need v18+)
node --version

# If not installed: https://nodejs.org/

# Check Git
git --version

# If not installed: https://git-scm.com/
```

**VS Code Extensions** (Recommended):
- Solidity
- ESLint
- Prettier
- Tailwind CSS IntelliSense

---

### Step 3: Setup Project (15 minutes)

```bash
# 1. Clone repository
git clone <your-repo-url>
cd hedera-agent-economy

# 2. Create project structure
mkdir -p contracts/src contracts/scripts
mkdir -p backend/routes backend/services
mkdir -p frontend/app frontend/components
mkdir -p tests docs

# 3. Install dependencies
npm init -y
npm install

# For contracts
cd contracts
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npm install @openzeppelin/contracts
cd ..

# For backend
cd backend
npm init -y
npm install express cors dotenv @hashgraph/sdk ethers axios
cd ..

# For frontend
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
npm install ethers @hashgraph/sdk zustand axios
cd ..
```

---

### Step 4: Configure Environment

Create `.env` in root:

```env
# Hedera Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420xxxxx

# Network Configuration
RPC_URL=https://testnet.hashio.io/api
CHAIN_ID=296
MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1

# Backend Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=296
# Optional: default token id for stablecoin demos
NEXT_PUBLIC_TOKEN_ID=0.0.xxxxx
```

---

## 📂 Project Structure

```
hedera-agent-economy/
│
├── contracts/              # 🔵 Web3 Dev (Dev 1)
│   ├── src/
│   │   ├── AgentRegistry.sol
│   │   └── PaymentProcessor.sol
│   ├── scripts/deploy.js
│   └── hardhat.config.js
│
├── backend/                # 🟢 Web2 Dev (Dev 2)
│   ├── server.js
│   ├── routes/
│   │   ├── agents.js
│   │   ├── payments.js
│   │   └── messages.js
│   └── services/
│       ├── hedera-client.js
│       ├── agent-service.js
│       └── payment-service.js
│
├── frontend/               # 🟡🟠 Frontend Devs (Dev 3 & 4)
│   ├── app/
│   │   ├── page.tsx          # Dev 4: Dashboard
│   │   ├── agents/page.tsx   # Dev 3: Agent list
│   │   └── payments/page.tsx # Dev 4: Payments
│   ├── components/
│   │   ├── AgentCard.tsx     # Dev 3
│   │   ├── PaymentForm.tsx   # Dev 4
│   │   └── Header.tsx        # Dev 3
│   └── lib/
│       └── api-client.ts     # Shared
│
└── tests/                  # All team
    └── integration/
```

---

## ⏰ 48-Hour Timeline

### Day 1 (24 hours)

| Hours | Phase | All Team Focus |
|-------|-------|----------------|
| **0-6** | Foundation | Setup, scaffolding, infrastructure |
| **6-12** | Sprint 1 | Contracts deployed, APIs working |
| **12-18** | Sprint 2 | Payments working, UI started |
| **18-24** | Integration | Full stack connected |

### Day 2 (24 hours)

| Hours | Phase | All Team Focus |
|-------|-------|----------------|
| **24-30** | Refinement | Feature completion |
| **30-36** | Testing | Bug fixes |
| **36-42** | Demo Prep | Video, docs, presentation |
| **42-48** | Submission | Final polish, submit |

---

## 🎯 Key Milestones

- ✅ **Hour 6**: Environment working, first commits
- ✅ **Hour 12**: Contracts deployed to testnet
- ✅ **Hour 18**: Backend API functional
- ✅ **Hour 24**: UI connected to backend
- ✅ **Hour 36**: Demo script ready
- ✅ **Hour 48**: Project submitted

---

## 🧪 Test Your Setup

### Test Hedera Connection

```javascript
// test-hedera.js
const { Client, AccountId, PrivateKey } = require('@hashgraph/sdk');
require('dotenv').config();

async function test() {
  const client = Client.forTestnet();
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
  
  client.setOperator(accountId, privateKey);
  const balance = await client.getAccountBalance(accountId);
  
  console.log('✅ Connected!');
  console.log(`Account: ${accountId}`);
  console.log(`Balance: ${balance.hbars.toString()} HBAR`);
}

test();
```

Run: `node test-hedera.js`

---

## 🔧 Development Commands

```bash
# Contracts
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network hedera_testnet

# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
# Open http://localhost:3000

# Test APIs
curl http://localhost:3001/api/health

# Tokens (stablecoin) — replace placeholders
curl "http://localhost:3001/api/tokens/0.0.<accountId>/balances/0.0.<tokenId>"
curl -X POST http://localhost:3001/api/tokens/transfer \
  -H "Content-Type: application/json" \
  -d '{"tokenId":"0.0.<tokenId>","fromId":"0.0.<from>","fromKey":"<privateKey>","toId":"0.0.<to>","amount":5}'

# x402 minimal flow
curl -X POST http://localhost:3001/api/x402/challenge -H "Content-Type: application/json" -d '{"amountHbar":"1"}' -i
curl -X POST http://localhost:3001/api/x402/verify -H "Content-Type: application/json" -d '{"txId":"<transactionId>"}'
```

---

## 🐛 Common Issues

### "Cannot find module"
```bash
cd <directory>
npm install
```

### "Invalid private key"
- Check `.env` file
- No spaces/quotes around key
- Key starts with `302e020100...`

### "Insufficient balance"
- Visit faucet: https://portal.hedera.com/faucet
- Wait 1-2 minutes
- Verify: https://hashscan.io/testnet

### "Contract not deployed"
```bash
cd contracts
npx hardhat run scripts/deploy.js --network hedera_testnet
# Copy addresses to backend/deployment.json
```

---

## 📚 Essential Resources

### Quick Links
- **Hedera Portal**: https://portal.hedera.com/
- **HashScan**: https://hashscan.io/testnet
- **Docs**: https://docs.hedera.com/
- **Faucet**: https://portal.hedera.com/faucet
- **Mirror Node**: https://testnet.mirrornode.hedera.com/api/v1/docs/

### GitHub Resources
- **Hedera SDK**: https://github.com/hiero-ledger/hiero-sdk-js
- **Agent Kit**: https://github.com/hashgraph/hedera-agent-kit-js
- **ERC-8004**: https://github.com/erc-8004/erc-8004-contracts
- **x402**: https://github.com/hedera-dev/x402-hedera

---

## 🎬 Demo Strategy (3 Minutes)

**The Flow**:
1. **Discover** (30s): Show agent search by capability
2. **Trust** (30s): Display trust scores
3. **Pay** (45s): Execute live payment on testnet
4. **Verify** (15s): Show on HashScan
5. **Technical** (60s): Architecture diagram

**Demo Script**:
> "Bob needs a smart contract developer. He searches and finds Alice 
> with a 95% trust score. Bob creates a 10 HBAR escrow payment. 
> The transaction is recorded on Hedera testnet [show HashScan]. 
> All interactions are logged to HCS for auditability."

---

## 🚨 Emergency Protocols

### If Behind at Hour 24
**Cut Features**:
- ✅ Keep: Agent registry, basic payment, UI
- ❌ Cut: Advanced trust scores, complex analytics

### If Behind at Hour 36
**Simplify Demo**:
- Use pre-recorded video
- Focus on core flow only
- Document known issues

### Critical Bug at Hour 42
**Have Backup**:
- Pre-recorded demo video
- Screenshots of working features
- Focus on presentation

---

## ✅ Pre-Hackathon Checklist

### Setup
- [ ] Hedera account created
- [ ] Testnet HBAR received (check balance)
- [ ] Node.js installed (v18+)
- [ ] Git configured
- [ ] VS Code ready
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Test connection working

### Team
- [ ] Roles assigned
- [ ] Communication channel active
- [ ] Read role-specific guide:
  - [ ] Dev 1: WEB3_GUIDE.md
  - [ ] Dev 2: WEB2_GUIDE.md
  - [ ] Dev 3 & 4: FRONTEND_GUIDE.md
- [ ] Meeting schedule agreed

---

## 🎯 First 30 Minutes (Hour 0)

**Minute 0-5**: Team sync
- Confirm roles
- Review timeline
- Assign first tasks

**Minute 5-15**: Environment check
- Everyone: `git pull`
- Everyone: `npm install`
- Everyone: Test Hedera connection

**Minute 15-30**: Start building
- Dev 1: Create contract files
- Dev 2: Create server.js
- Dev 3: Create components
- Dev 4: Create pages

---

## 💡 Success Tips

1. **Commit Often**: Every 1-2 hours
2. **Test Locally**: Before deploying
3. **Use HashScan**: Verify all transactions
4. **Ask Questions**: Use mentors
5. **Take Breaks**: 5 min every hour
6. **Stay Positive**: Learn and have fun!

---

## 📞 Communication

### Daily Syncs (Hour 12, 24, 36)
- **Format**: 15 min standup
- **Questions**: 
  - What did I complete?
  - What am I working on?
  - Any blockers?

### Response Times
- **Critical**: < 15 minutes
- **High**: < 1 hour
- **Normal**: < 3 hours

---

## 🎉 You're Ready!

**Next Steps**:
1. ✅ Complete pre-hackathon setup
2. ✅ Read your role-specific guide:
   - **Dev 1 (Web3)**: Read `WEB3_GUIDE.md`
   - **Dev 2 (Web2)**: Read `WEB2_GUIDE.md`
   - **Dev 3 & 4 (Frontend)**: Read `FRONTEND_GUIDE.md`
3. ✅ Test your environment
4. ✅ Join team communication channel
5. ✅ Get ready to build!

**Good luck team! Let's build something amazing! 🚀**

---

*Last Updated: October 31, 2025*  
*Hackathon: SingHacks 2025*

