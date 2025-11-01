'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { ProtocolBadge } from './protocol-badge'

interface AgentPaymentProps {
  fromAgentId: string
  fromAgentName: string
  toAgentId: string
  toAgentName: string
  amount: string
  currency?: 'HBAR' | 'USDC'
}

export function AgentPayment({ 
  fromAgentId, 
  fromAgentName, 
  toAgentId, 
  toAgentName,
  amount,
  currency = 'HBAR'
}: AgentPaymentProps) {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Check if wallet is connected to agent
    if (isConnected && address) {
      checkConnection()
    }
  }, [isConnected, address, fromAgentId])

  const checkConnection = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agent-connection/user/${address}`)
      const data = await res.json()
      setConnected(data.agentId === fromAgentId)
    } catch (e) {
      setConnected(false)
    }
  }

  const handlePayment = async () => {
    if (!connected) {
      setError('Please connect your wallet to the agent first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      // For demo: Use backend to create payment
      // In production: Sign transaction with walletClient
      const res = await fetch(`${BASE_URL}/api/agent-connection/pay-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAgentId,
          toAgentId,
          amount,
          currency,
          userWalletAddress: address
          // In production: include signedTx from walletClient
        })
      })

      const data = await res.json()

      if (data.success) {
        // Show success, redirect to transaction
        window.location.href = `/transactions/${data.payment.txHash || data.payment.escrowId || data.payment.id}`
      } else {
        setError(data.error || 'Payment failed')
      }
    } catch (e: any) {
      setError(e.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border p-6 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <ProtocolBadge protocol="x402" size="sm" />
        <span className="font-semibold">Agent-to-Agent Payment</span>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">From:</span> {fromAgentName}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">To:</span> {toAgentName}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Amount:</span> {amount} {currency}
        </div>
      </div>

      {!connected && (
        <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
          Connect your wallet to {fromAgentName} first
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
          {error}
        </div>
      )}

      <Button
        onClick={handlePayment}
        disabled={!connected || loading}
        className="w-full"
      >
        {loading 
          ? 'Processing...' 
          : `${fromAgentName} pays ${toAgentName} ${amount} ${currency}`
        }
      </Button>
      
      <div className="text-xs text-muted-foreground">
        Your wallet ({address?.substring(0, 10)}...) will be used by {fromAgentName} to make this payment.
      </div>
    </div>
  )
}

