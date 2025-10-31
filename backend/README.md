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

## 📚 Full Guide

See **[WEB2_GUIDE.md](../WEB2_GUIDE.md)** for complete instructions.

