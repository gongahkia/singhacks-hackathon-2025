'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Button } from './ui/button'
import { ProtocolBadge } from './protocol-badge'

interface ConnectAgentWalletProps {
  agentId: string
  agentName: string
  onConnected?: () => void
}

export function ConnectAgentWallet({ agentId, agentName, onConnected }: ConnectAgentWalletProps) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if already connected
    if (isConnected && address) {
      checkConnection()
    }
  }, [isConnected, address, agentId])

  const checkConnection = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agent-connection/user/${address}`)
      const data = await res.json()
      if (data.agentId === agentId) {
        setConnected(true)
      }
    } catch (e) {
      // Not connected
    }
  }

  const handleConnect = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Sign message to verify wallet ownership
      const message = `Connect wallet ${address} to agent ${agentId}`
      const signature = await signMessageAsync({ message })

      // Send to backend - agentId could be an address or actual agentId
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agent-connection/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId, // Backend will try both agentId and address lookup
          userWalletAddress: address,
          signature
        })
      })

      const data = await res.json()

      if (data.success) {
        setConnected(true)
        if (onConnected) onConnected()
      } else {
        setError(data.error || 'Connection failed')
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  if (connected) {
    return (
      <div className="border border-green-500 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-semibold">✓ Connected</span>
          <span className="text-sm text-muted-foreground">
            Your wallet is connected to {agentName}. The agent can now use your wallet to transact.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Connect your wallet to allow <strong>{agentName}</strong> to use it for transactions.
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
          {error}
        </div>
      )}
      <Button
        onClick={handleConnect}
        disabled={!isConnected || loading}
        className="w-full"
      >
        {loading ? 'Connecting...' : `Connect Wallet to ${agentName}`}
      </Button>
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <ProtocolBadge protocol="erc8004" size="sm" />
        <span>Agent verified via ERC-8004</span>
      </div>
    </div>
  )
}

