# Backend API Endpoints

This document lists the available REST API endpoints exposed by the backend server.
Base URL (local): `http://localhost:3001`

Note: All endpoints are prefixed with `/api`.

## Health

- GET `/api/health`
  - Returns server status, timestamp, network, and version.

## Auth

- POST `/api/auth/verify-signature`
  - Body: `{ accountId?: string, evmAddress?: string, message: object, signature: string }`
  - Verifies a signed JSON payload using ethers.js `verifyMessage`.
  - Response: `{ verified: boolean, recovered: string, accountId?: string }`

## Agents

- POST `/api/agents`
  - Body: `{ name: string, capabilities: string[], metadata?: string }`
  - Registers a new agent via the on-chain AgentRegistry.
  - Response: `{ success: true, txHash: string, agentAddress: string }`

- GET `/api/agents`
  - Returns list of all registered agents with details.
  - Response: `{ agents: Agent[], count: number }`

- GET `/api/agents/search?capability=<string>`
  - Returns agents matching a capability.
  - Response: `{ agents: Agent[], capability: string, count: number }`

- GET `/api/agents/:address`
  - Returns details for a specific agent.
  - Response: `Agent`

- PUT `/api/agents/capabilities`
  - Body: `{ capabilities: string[] }`
  - Updates capabilities of the connected agent (wallet in backend env).
  - Response: `{ success: true, txHash: string }`

Agent object shape (typical):
```json
{
  "name": "string",
  "address": "0x...",
  "capabilities": ["..."],
  "metadata": "",
  "trustScore": "0",
  "registeredAt": "ISO-8601",
  "isActive": true
}
```

## Payments (Escrow)

- POST `/api/payments`
  - Body: `{ payee: string, amount: string|number, description: string }`
  - Creates a new escrow via on-chain PaymentProcessor. `amount` is in HBAR.
  - Response: `{ success: true, escrowId: string|number, txHash: string, amount: string }`

- POST `/api/payments/:escrowId/release`
  - Releases an active escrow.
  - Response: `{ success: true, txHash: string }`

- POST `/api/payments/:escrowId/refund`
  - Refunds an active escrow.
  - Response: `{ success: true, txHash: string }`

- GET `/api/payments/:escrowId`
  - Returns details of an escrow.
  - Response:
```json
{
  "escrowId": "...",
  "payer": "0x...",
  "payee": "0x...",
  "amount": "1.0",
  "serviceDescription": "...",
  "status": "Active|Completed|Refunded|Disputed",
  "createdAt": "ISO-8601",
  "completedAt": "ISO-8601|null"
}
```

- GET `/api/payments/payer/:address`
  - Returns escrows for a payer address.
  - Response: `{ escrows: Escrow[], count: number }`

## Tokens (HTS)

- GET `/api/tokens/:accountId/balances/:tokenId`
  - Gets HBAR and token balance for account.
  - Response: `{ hbar: string, tokenBalance: number }`

- POST `/api/tokens/transfer`
  - Body: `{ tokenId: string, fromId: string, fromKey: string, toId: string, amount: number }`
  - Transfers tokens between accounts using HTS.
  - Response: `{ status: string }`

## x402 (HTTP 402 Payment)

- POST `/api/x402/challenge`
  - Body: `{ amountHbar: string|number, memo?: string }`
  - Responds with a 402 payment challenge including `payTo` operator account.
  - Response (HTTP 402):
```json
{
  "status": 402,
  "payment": {
    "network": "testnet|mainnet",
    "asset": "HBAR",
    "amount": "1",
    "memo": "x402-payment",
    "payTo": "0.0.x"
  }
}
```

- POST `/api/x402/verify`
  - Body: `{ txId: string, expectedAmount?: string|number, expectedPayTo?: string }`
  - Verifies settlement using Mirror Node; optionally checks amount & recipient.
  - Response: `{ verified: boolean, tx: object }`

## Messages (HCS)

- POST `/api/messages/topics`
  - Body: `{ memo?: string }`
  - Creates an HCS topic. Response: `{ topicId: string }`

- POST `/api/messages/topics/:topicId/messages`
  - Body: `{ message: string }`
  - Submits a message to the topic.
  - Response: `{ topicId: string, sequenceNumber: string, status: string }`

- GET `/api/messages/topics/:topicId/messages?limit=25`
  - Retrieves topic messages from Mirror Node.
  - Response: Mirror Node payload.

## Notes

- Env variables expected: `HEDERA_NETWORK`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `MIRROR_NODE_URL`, `RPC_URL`, `EVM_PRIVATE_KEY`, `AGENT_TOPIC_ID?`, `PAYMENT_TOPIC_ID?`, or `AGENT_REGISTRY_ADDRESS`/`PAYMENT_PROCESSOR_ADDRESS` when artifacts are absent.
- Amounts are expected in HBAR units (string/number) for payment endpoints; HTS transfer uses integer token amounts.
- Errors return JSON `{ error: string }` with appropriate HTTP status codes.

---

## Try it with curl (zsh)

Below are ready-to-run curl snippets for quick testing. Replace placeholders like `0.0.ACCOUNT`, `0xAddress`, `<txId>`, etc. `jq` is optional and used for pretty-printing.

```bash
# Base URL
BASE=http://localhost:3001

# 1) Health
curl -s $BASE/api/health | jq

# 2) HCS Messages
# 2a) Create a topic
curl -s -X POST $BASE/api/messages/topics \
  -H "Content-Type: application/json" \
  -d '{"memo":"Agent messages"}' | tee /tmp/topic.json
TOPIC_ID=$(jq -r .topicId /tmp/topic.json)

# 2b) Submit a message
curl -s -X POST $BASE/api/messages/topics/$TOPIC_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"hello hedera"}' | jq

# 2c) Fetch messages (Mirror Node)
curl -s "$BASE/api/messages/topics/$TOPIC_ID/messages?limit=5" | jq

# 3) x402 (HTTP 402 Payment)
# 3a) Get payment challenge
curl -i -s -X POST $BASE/api/x402/challenge \
  -H "Content-Type: application/json" \
  -d '{"amountHbar":"0.5","memo":"paywall-123"}'

# 3b) Verify settlement after wallet pays (use a real Hedera transaction ID)
curl -s -X POST $BASE/api/x402/verify \
  -H "Content-Type: application/json" \
  -d '{"txId":"<txId>","expectedAmount":"0.5","expectedPayTo":"0.0.RECIPIENT"}' | jq

# 4) Agents
# 4a) Register agent
curl -s -X POST $BASE/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"MyAgent","capabilities":["smart-contracts","payments"],"metadata":""}' | jq

# 4b) List agents
curl -s $BASE/api/agents | jq

# 4c) Search by capability
curl -s "$BASE/api/agents/search?capability=payments" | jq

# 4d) Get by address (EVM address)
curl -s "$BASE/api/agents/0xAgentAddress" | jq

# 4e) Update capabilities
curl -s -X PUT $BASE/api/agents/capabilities \
  -H "Content-Type: application/json" \
  -d '{"capabilities":["smart-contracts","payments","hcs"]}' | jq

# 5) Payments (Escrow)
# 5a) Create escrow (amount in HBAR)
curl -s -X POST $BASE/api/payments \
  -H "Content-Type: application/json" \
  -d '{"payee":"0xPayee","amount":"1.25","description":"escrow-1"}' | tee /tmp/escrow.json
ESCROW_ID=$(jq -r .escrowId /tmp/escrow.json)

# 5b) Release escrow
curl -s -X POST $BASE/api/payments/$ESCROW_ID/release | jq

# 5c) Refund escrow
curl -s -X POST $BASE/api/payments/$ESCROW_ID/refund | jq

# 5d) Get escrow details
curl -s $BASE/api/payments/$ESCROW_ID | jq

# 5e) List escrows by payer
curl -s "$BASE/api/payments/payer/0xPayerAddress" | jq

# 6) Tokens (HTS)
# 6a) Get HBAR + token balances
curl -s "$BASE/api/tokens/0.0.ACCOUNT/balances/0.0.TOKEN" | jq

# 6b) Transfer tokens (requires association and permissions)
curl -s -X POST $BASE/api/tokens/transfer \
  -H "Content-Type: application/json" \
  -d '{"tokenId":"0.0.TOKEN","fromId":"0.0.FROM","fromKey":"<PRIVATE_KEY>","toId":"0.0.TO","amount":1}' | jq

# 7) Auth: verify wallet signature
curl -s -X POST $BASE/api/auth/verify-signature \
  -H "Content-Type: application/json" \
  -d '{"evmAddress":"0xSigner","message":{"action":"registerAgent","timestamp":"2025-11-01T00:00:00Z"},"signature":"0x..."}' | jq
```
