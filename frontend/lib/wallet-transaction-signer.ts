// lib/wallet-transaction-signer.ts
// Helper functions to sign transactions using wagmi/viem
// This enables wallet popups for user-signed transactions

import { Address, type WalletClient } from 'viem'
import { prepareEscrowTransaction } from './transaction-helpers'

export interface SignEscrowParams {
  payee: Address
  amountInHbar: string | number
  description: string
  expirationDays?: number
}

/**
 * Sends an escrow transaction using the user's wallet
 * For JSON-RPC wallets (MetaMask, etc.), we use sendTransaction which triggers the popup
 * MetaMask doesn't support eth_signTransaction, so we send the transaction directly
 * @returns Transaction hash - the transaction is already sent to the network
 */
export async function prepareAndSignEscrowForBackend(
  params: SignEscrowParams,
  walletClient: WalletClient,
  account: Address
): Promise<{ txHash: string }> {
  // Prepare the escrow transaction data
  const { to, data, value } = await prepareEscrowTransaction({
    payee: params.payee,
    amountInHbar: params.amountInHbar,
    description: params.description,
    expirationDays: params.expirationDays
  })
  
  // Use prepareTransactionRequest to automatically populate gas, nonce, and fees
  // This is the recommended approach in viem - it handles all transaction parameters
  // @ts-expect-error - viem types are strict but walletClient handles chain inference
  const transactionRequest = await walletClient.prepareTransactionRequest({
    account,
    to,
    data,
    value,
  })
  
  // For JSON-RPC accounts (MetaMask), signTransaction is not supported
  // Instead, we use sendTransaction which triggers the popup and sends the transaction
  // The transaction is sent directly to the network, so we return the hash
  // @ts-expect-error - viem types are strict but this works at runtime
  const txHash = await walletClient.sendTransaction(transactionRequest)
  
  return { txHash }
}

