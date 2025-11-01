# 🟢 Backend Directory

**Developer 2 - Your Workspace**

## Quick Start

1. Read **[WEB2_GUIDE.md](../WEB2_GUIDE.md)** first
2. Setup: `npm init -y && npm install express cors dotenv @hashgraph/sdk ethers axios && npm install --save-dev nodemon`
3. Copy `.env.example` from root to `.env` and fill in your keys
4. Start: `npm run dev` (add script to package.json: `"dev": "nodemon server.js"`)

## Key Files You'll Create

- `server.js` - Main Express app
- `routes/agents.js` - Agent endpoints
- `routes/payments.js` - Payment endpoints
- `routes/tokens.js` - Token operations
- `routes/x402.js` - x402 payment flow
- `services/hedera-client.js` - Hedera SDK wrapper
- `services/agent-service.js` - Agent business logic
- `services/payment-service.js` - Payment business logic

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/agents` - Register agent
- `GET /api/agents` - List all agents
- `GET /api/agents/search?capability=...` - Search by capability
- `POST /api/payments` - Create escrow
- `POST /api/payments/:id/release` - Release escrow
- `POST /api/x402/challenge` - Issue payment challenge
- `POST /api/x402/verify` - Verify payment

## ERC-8004 Features

**Trust Score Generation:**
- Automatic calculation at registration (50-65 based on metadata and capabilities)
- Accessed via `GET /api/agents/:address`

**Reputation Registry:**
- `POST /api/reputation/feedback` - Submit 1-5 star rating with optional payment proof
- `GET /api/agents/:address/reputation` - Get all reputation feedback for an agent
- Automatic trust score updates based on average ratings

**A2A Communication:**
- `POST /api/a2a/communicate` - Initiate agent-to-agent communication (requires trust score ≥ 40)
- `POST /api/a2a/interactions/:interactionId/complete` - Complete interaction (establishes trust)
- `GET /api/a2a/interactions/:interactionId` - Get interaction details
- `GET /api/agents/:address/interactions` - Get agent's interaction history

**Trust Establishment:**
- Automatic +2 trust boost for each agent when escrow is successfully released
- Automatic +1 trust boost for each agent when A2A interaction is completed
- Trust established via `POST /api/reputation/trust/payment` (called automatically on escrow release)

## 📚 Full Guide

See **[WEB2_GUIDE.md](../WEB2_GUIDE.md)** for complete instructions.

