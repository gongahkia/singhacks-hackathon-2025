# 🟢 Backend Directory

**Developer 2 - Your Workspace**

## Quick Start

1. Read **[WEB2_GUIDE.md](../docs/WEB2_GUIDE.md)** first
2. Setup:
   ```bash
   cd backend
   npm install  # package.json already created with all dependencies
   ```
3. Configure .env in project root with:
   - Hedera account credentials
   - Deployed contract addresses from contracts/deployment.json
   - RPC and Mirror Node URLs
4. Start: `npm run dev`
5. Test: `curl http://localhost:3001/api/health`

**Dependencies Included**:
- express (API framework)
- cors (Cross-origin support)
- dotenv (Environment variables)
- @hashgraph/sdk (Hedera SDK)
- ethers (Contract interaction)
- axios (HTTP client)
- nodemon (Dev server with auto-reload)

## Key Files Implemented

- `server.js` - Main Express app (8 route modules registered)
- `routes/agents.js` - Agent endpoints (7 endpoints)
- `routes/payments.js` - Payment endpoints (5 endpoints)
- `routes/reputation.js` - Reputation feedback (3 endpoints)
- `routes/a2a.js` - A2A communication (4 endpoints)
- `routes/tokens.js` - Token operations
- `routes/x402.js` - x402 payment flow
- `routes/messages.js` - HCS messaging
- `routes/auth.js` - Signature verification
- `services/hedera-client.js` - Hedera SDK wrapper
- `services/agent-service.js` - Agent business logic
- `services/payment-service.js` - Payment business logic with trust establishment
- `services/reputation-service.js` - Reputation and trust management
- `services/a2a-service.js` - Agent-to-agent communication
- `services/token-service.js` - HTS token operations
- `services/hcs-service.js` - Consensus service
- `utils/error-handler.js` - Error middleware
- `utils/validation.js` - Input validation

## API Endpoints Summary

**Core Endpoints**:
- `GET /api/health` - Health check
- `POST /api/agents` - Register agent
- `GET /api/agents` - List all agents
- `GET /api/agents/search?capability=...` - Search by capability
- `POST /api/payments` - Create escrow
- `POST /api/payments/:id/release` - Release escrow (with automatic trust establishment)

**ERC-8004 Endpoints**:
- `POST /api/reputation/feedback` - Submit reputation rating
- `GET /api/agents/:address/reputation` - Get agent reputation
- `POST /api/a2a/communicate` - Initiate A2A communication
- `POST /api/a2a/interactions/:id/complete` - Complete A2A interaction
- `GET /api/agents/:address/interactions` - Get interaction history

**Additional Endpoints**:
- `POST /api/x402/challenge` - Issue payment challenge
- `POST /api/x402/verify` - Verify payment
- `POST /api/messages/topics` - Create HCS topic
- `POST /api/messages/topics/:id/messages` - Submit message
- `POST /api/tokens/transfer` - Transfer HTS tokens
- `POST /api/auth/verify-signature` - Verify wallet signature

Total: 19+ endpoints across 8 route modules

See [ENDPOINTS.md](./ENDPOINTS.md) for complete documentation.

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

