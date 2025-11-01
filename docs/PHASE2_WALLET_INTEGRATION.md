# Phase 2: Wallet Integration - Production Mode

## Overview

Phase 2 enables users to connect their wallets (MetaMask, WalletConnect) and sign transactions directly in their browser. **No private keys are shared with the backend** - transactions are signed by the user's wallet and then sent to the backend for broadcasting.

## Architecture

### Frontend Flow
1. User connects wallet via RainbowKit (MetaMask or WalletConnect)
2. Frontend prepares transaction data using viem
3. User's wallet signs the transaction
4. Frontend sends signed transaction to backend
5. Backend broadcasts the signed transaction to Hedera network

### Backend Flow
1. Receives signed transaction hex
2. Verifies transaction signature
3. Broadcasts to Hedera network
4. Returns transaction receipt with hash

## Setup

### Frontend Environment Variables

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_RPC_URL=https://testnet.hashio.io/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0xfEa57b56F27dC78Ca464E552198BD1A3bE083F7e
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x0B41d31eD77cC40C8F2d126CAFdcee098F938445
```

### Get WalletConnect Project ID

1. Visit https://cloud.walletconnect.com/
2. Create a new project
3. Copy the Project ID
4. Add it to `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Install Dependencies

```bash
cd frontend
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
```

## Usage

### Connect Wallet

The `WalletProvider` is already set up in `app/layout.tsx`. Users can connect via:

```tsx
import { WalletConnectButton } from '../components/wallet-connect-button'

<WalletConnectButton />
```

### Register Agent with Wallet

```tsx
import { useAccount, useWalletClient } from 'wagmi'
import { prepareAgentRegistrationTransaction } from '../lib/transaction-helpers'
import { apiClient } from '../src/lib/api-client'

const { address } = useAccount()
const { data: walletClient } = useWalletClient()

const registerAgent = async () => {
  // 1. Prepare transaction data
  const txData = await prepareAgentRegistrationTransaction({
    name: 'My Agent',
    capabilities: ['data-analysis', 'api-integration'],
    metadata: 'Agent description'
  })

  // 2. Get transaction request (gas, nonce, etc.)
  const txRequest = await apiClient.prepareTransaction({
    to: txData.to,
    data: txData.data,
    value: txData.value.toString(),
    from: address
  })

  // 3. Sign transaction with user's wallet
  const signedTx = await walletClient.signTransaction({
    ...txRequest,
    account: address
  })

  // 4. Send signed transaction to backend
  const result = await apiClient.sendSignedTransaction(signedTx)
  
  // 5. Register agent with signed transaction
  await apiClient.registerAgentWithSignedTx({
    name: 'My Agent',
    capabilities: ['data-analysis'],
    signedTx
  })
}
```

### Create Payment Escrow with Wallet

```tsx
import { prepareEscrowTransaction } from '../lib/transaction-helpers'

const createPayment = async () => {
  // 1. Prepare transaction data
  const txData = await prepareEscrowTransaction({
    payee: '0xPayeeAddress',
    amountInHbar: '10',
    description: 'Service payment'
  })

  // 2. Get transaction request
  const txRequest = await apiClient.prepareTransaction({
    to: txData.to,
    data: txData.data,
    value: txData.value.toString(),
    from: address
  })

  // 3. Sign transaction
  const signedTx = await walletClient.signTransaction({
    ...txRequest,
    account: address
  })

  // 4. Create escrow with signed transaction
  const result = await apiClient.createEscrowWithSignedTx({
    payee: '0xPayeeAddress',
    amount: 10,
    description: 'Service payment',
    signedTx
  })
}
```

## API Endpoints

### Transaction Endpoints

- `POST /api/transactions/prepare` - Prepare transaction request (gas, nonce, etc.)
- `POST /api/transactions/send` - Send signed transaction
- `POST /api/transactions/verify` - Verify transaction signature

### Updated Endpoints (Support Signed Transactions)

- `POST /api/agents` - Accepts `signedTx` parameter
- `POST /api/payments` - Accepts `signedTx` parameter

## Security

- **No Private Keys**: Backend never sees user private keys
- **Signature Verification**: Backend verifies all signed transactions before broadcasting
- **User Consent**: All transactions require explicit wallet approval
- **Nonce Management**: Backend handles nonce calculation to prevent replay attacks

## Comparison: Phase 1 vs Phase 2

| Feature | Phase 1 (Demo) | Phase 2 (Production) |
|---------|---------------|---------------------|
| Private Keys | Shared with backend | Never shared |
| Wallet Connection | Manual input | Real wallet (MetaMask/WalletConnect) |
| Transaction Signing | Backend signs | User wallet signs |
| User Experience | Limited | Full wallet integration |
| Security | Demo only | Production ready |

## Troubleshooting

### Wallet Not Connecting

1. Check WalletConnect Project ID is set
2. Verify MetaMask is installed (for MetaMask connector)
3. Check browser console for errors

### Transaction Fails

1. Verify user has sufficient HBAR balance
2. Check gas estimation from `/api/transactions/prepare`
3. Verify contract addresses in environment variables

### Signature Verification Fails

1. Ensure transaction data matches prepared request
2. Check chain ID matches Hedera testnet (296)
3. Verify user's wallet address matches transaction signer

## Next Steps

- Add support for escrow release with signed transactions
- Add support for A2A communication with signed transactions
- Implement transaction status polling
- Add transaction history UI

