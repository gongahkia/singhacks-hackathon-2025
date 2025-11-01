"use client"

import { useState } from 'react'
import { apiClient } from '../../src/lib/api-client'
import Link from 'next/link'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Connect agent state
  const [accountId, setAccountId] = useState('')
  const [evmAddress, setEvmAddress] = useState('')
  const [agentName, setAgentName] = useState('')
  const [capability, setCapability] = useState('')
  const [signature, setSignature] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectResult, setConnectResult] = useState<any | null>(null)

  const onConnect = async () => {
    setConnectError(null)
    setConnectResult(null)
    try {
      if (!signature) throw new Error('Provide a signature from your wallet to verify')

      const messageObject = {
        action: 'registerAgent',
        name: agentName || undefined,
        capabilities: capability ? [capability] : [],
        timestamp: new Date().toISOString()
      }

      const result = await apiClient.verifySignature({ accountId, evmAddress, message: messageObject, signature })
      setConnectResult(result)
    } catch (e: any) {
      setConnectError(e.message)
    }
  }

  return (
    <main className="min-h-screen">
      {/* Top navigation bar */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hedera Agent Economy</h2>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Agent Marketplace
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Chat
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="p-12 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Settings</h1>
          <p className="text-foreground/60">
            Configure your connection to the Hedera blockchain network and register your AI agent. You'll need a Hedera account and wallet to get started.
          </p>
        </div>

        <div className="space-y-8">
            {/* Register/Link Bitcoin Wallet Section */}
            <section className="border border-border p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Register/Link Your Bitcoin Wallet</h2>
                <p className="text-sm text-foreground/60">
                  Connect your Bitcoin wallet to the Hedera network by signing a message. This proves you own the wallet without revealing your private key. Fill in your wallet details and sign the verification message.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <input
                  className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Hedera Account ID (0.0.x)"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                />
                <input
                  className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="EVM Address (0x...)"
                  value={evmAddress}
                  onChange={(e) => setEvmAddress(e.target.value)}
                />
                <input
                  className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Agent Name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
                <input
                  className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Capability (e.g., smart-contracts)"
                  value={capability}
                  onChange={(e) => setCapability(e.target.value)}
                />
                <textarea
                  className="md:col-span-2 px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Wallet Signature (0x...)"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
                  onClick={onConnect}
                >
                  Verify Signature
                </button>
                {connectResult && (
                  <Link
                    href="/marketplace"
                    className="px-6 py-3 border border-border hover:bg-accent transition-colors font-medium"
                  >
                    Browse Marketplace
                  </Link>
                )}
              </div>

              {connectError && (
                <div className="p-4 border border-red-200 bg-red-50 text-red-800 text-sm">
                  Error: {connectError}
                </div>
              )}
              {connectResult && (
                <div className="space-y-2">
                  <div className="p-4 border border-green-200 bg-green-50 text-green-800 text-sm font-medium">
                    Successfully verified! Your wallet is now linked to the network.
                  </div>
                  <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(connectResult, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          </div>
      </div>
    </main>
  )
}
