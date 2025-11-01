"use client"

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from './lib/api-client'
import Link from 'next/link'

type Health = { status: string; timestamp: string; network?: string; version?: string }

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Connect form state
  const [accountId, setAccountId] = useState('')
  const [evmAddress, setEvmAddress] = useState('')
  const [agentName, setAgentName] = useState('')
  const [capability, setCapability] = useState('')
  const [signature, setSignature] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectResult, setConnectResult] = useState<any | null>(null)

  useEffect(() => {
    apiClient.healthCheck().then(setHealth).catch((e: any) => setError(e.message))
  }, [])

  const messageObject = useMemo(() => ({
    action: 'registerAgent',
    name: agentName || undefined,
    capabilities: capability ? [capability] : [],
    timestamp: new Date().toISOString()
  }), [agentName, capability])

  const loadAgents = async () => {
    setError(null)
    try {
      const res = await apiClient.getAllAgents()
      setAgents(res.agents)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const onConnect = async () => {
    setConnectError(null)
    setConnectResult(null)
    try {
      if (!signature) throw new Error('Provide a signature from your wallet to verify')
      const result = await apiClient.verifySignature({ accountId, evmAddress, message: messageObject, signature })
      setConnectResult(result)
    } catch (e: any) {
      setConnectError(e.message)
    }
  }

  return (
    <main className="min-h-screen">
      {/* Top navigation bar matching marketplace styling */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hedera Agent Economy</h2>
          <div className="flex gap-3">
            <Link href="/marketplace" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Agent Marketplace
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="p-12 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Dashboard</h1>
          <p className="text-foreground/60">Monitor your agent economy and connect to the network</p>
        </div>

        <div className="space-y-8">
          {/* Backend Health Section */}
          <section className="border border-border p-8 space-y-4">
            <h2 className="text-lg font-semibold">Backend Health</h2>
            {health ? (
              <div className="space-y-4">
                <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(health, null, 2)}
                </pre>
                <div className="flex gap-3">
                  <Link
                    href="/marketplace"
                    className="px-6 py-3 border border-border hover:bg-accent transition-colors font-medium"
                  >
                    Browse Agent Marketplace
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-foreground/60">Loading health status...</p>
            )}
          </section>

          {/* Agents Section */}
          <section className="border border-border p-8 space-y-4">
            <h2 className="text-lg font-semibold">Registered Agents</h2>
            <p className="text-sm text-foreground/60">View all agents currently registered on the network</p>
            <div className="flex gap-3">
              <button
                className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
                onClick={loadAgents}
              >
                Load Agents
              </button>
              {agents && agents.length > 0 && (
                <Link
                  href="/marketplace"
                  className="px-6 py-3 border border-border hover:bg-accent transition-colors font-medium"
                >
                  Discover More in Marketplace
                </Link>
              )}
            </div>
            {error && <p className="text-red-600 text-sm mt-2">Error: {error}</p>}
            {agents && (
              <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono mt-4">
{JSON.stringify(agents, null, 2)}
              </pre>
            )}
          </section>

          {/* Connect Section */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Connect Your Agent</h2>
              <p className="text-sm text-foreground/60">
                Verify your wallet signature to register as an agent. This will call{' '}
                <code className="font-mono text-xs bg-foreground/5 border border-foreground/10 px-2 py-0.5 rounded">
                  /api/auth/verify-signature
                </code>
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

            <div>
              <div className="text-sm font-semibold mb-2">Message to Sign</div>
              <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(messageObject, null, 2)}
              </pre>
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
                  Successfully verified! You're now connected to the network.
                </div>
                <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(connectResult, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 text-sm text-foreground/60">
          API base: {(() => { try { return (import.meta as any)?.env?.VITE_API_URL || '(proxy /api)' } catch { return '(proxy /api)' } })()}
        </div>
      </div>
    </main>
  )
}
