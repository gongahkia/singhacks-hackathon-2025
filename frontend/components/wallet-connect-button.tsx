'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'

export function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  return (
    <div className="flex items-center gap-4">
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
          const ready = mounted
          const connected = ready && !!account && !!chain

          if (!connected) {
            return (
              <button
                onClick={openConnectModal}
                className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium rounded-none"
              >
                Connect Wallet
              </button>
            )
          }

          return (
            <button
              onClick={openAccountModal}
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium rounded-none"
            >
              {account?.displayName || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
            </button>
          )
        }}
      </ConnectButton.Custom>
      {isConnected && address && (
        <div className="text-sm text-muted-foreground">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}
    </div>
  )
}

