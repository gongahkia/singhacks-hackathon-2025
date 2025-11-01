// Wallet service using wagmi hooks
// This is a TypeScript module that exports hooks and utilities for wallet operations
// For React components, use wagmi hooks directly: useAccount, useConnect, useDisconnect, useSignMessage

import { Address } from 'viem'

export interface WalletState {
  isConnected: boolean
  accountId: string | null
  evmAddress: Address | null
  chainId: number | undefined
}

/**
 * Helper function to sign a message using wagmi wallet
 * Usage in React components:
 * 
 * import { useSignMessage, useAccount } from 'wagmi'
 * 
 * const { signMessageAsync } = useSignMessage()
 * const { address } = useAccount()
 * 
 * const signature = await signMessageAsync({ message: 'Hello World' })
 */
export const createWalletService = () => {
  return {
    // These are meant to be used with wagmi hooks in React components
    // See app/components/wallet-connect-button.tsx for example usage
  }
}

export type { Address }
