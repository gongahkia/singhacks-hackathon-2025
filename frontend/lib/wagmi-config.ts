import { http } from 'wagmi'
import { defineChain } from 'viem'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'

// Hedera Testnet Chain Configuration
// Chain ID: 296 (from deployment.json)
export const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: [
        typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RPC_URL 
          ? process.env.NEXT_PUBLIC_RPC_URL 
          : 'https://testnet.hashio.io/api'
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'HashScan',
      url: 'https://hashscan.io/testnet',
    },
  },
  testnet: true,
})

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id'

// Define wallets array structure for getDefaultConfig
// getDefaultConfig expects wallets as an array of wallet objects or grouped structure
const wallets = [
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet,
      walletConnectWallet,
    ],
  },
]

export const wagmiConfig = getDefaultConfig({
  appName: 'Heracles Agent Economy',
  projectId,
  chains: [hederaTestnet],
  wallets,
  transports: {
    [hederaTestnet.id]: http(),
  },
})

// Declare module to avoid TypeScript errors for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

