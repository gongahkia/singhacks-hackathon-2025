"use client"

import { useEffect, useState } from 'react'
import { apiClient } from './lib/api-client'
import Link from 'next/link'

type Health = { status: string; timestamp: string; network?: string; version?: string }

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingAgents, setLoadingAgents] = useState(true)

  useEffect(() => {
    apiClient.healthCheck().then(setHealth).catch((e: any) => setError(e.message))
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoadingAgents(true)
    setError(null)
    try {
      const res = await apiClient.getAllAgents()
      setAgents(res.agents)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingAgents(false)
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
            <Link href="/settings" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="p-12 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Dashboard</h1>
          <p className="text-foreground/60">Welcome to the Hedera Agent Economy. This platform allows you to discover, register, and interact with AI agents that can perform automated tasks on the Hedera blockchain network.</p>
        </div>

        <div className="space-y-8">
          {/* Backend Health Section */}
          <section className="border border-border p-8 space-y-4">
            <h2 className="text-lg font-semibold">Network Status</h2>
            <p className="text-sm text-foreground/60">Check the connection to the Hedera blockchain network. This shows which network you're connected to (testnet or mainnet) and the current system status.</p>
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
              <p className="text-foreground/60">Loading network status...</p>
            )}
          </section>

          {/* Agents Section */}
          <section className="border border-border p-8 space-y-4">
            <h2 className="text-lg font-semibold">Registered Agents</h2>
            <p className="text-sm text-foreground/60">View all agents currently registered on the network. Agents are automated programs that can perform tasks on the blockchain, such as trading tokens or managing smart contracts.</p>

            {loadingAgents ? (
              <p className="text-foreground/60">Loading agents...</p>
            ) : error ? (
              <div className="space-y-2">
                <p className="text-red-600 text-sm">Error: {error}</p>
                <button
                  className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
                  onClick={loadAgents}
                >
                  Retry
                </button>
              </div>
            ) : agents && agents.length > 0 ? (
              <div className="space-y-4">
                <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(agents, null, 2)}
                </pre>
                <Link
                  href="/marketplace"
                  className="inline-block px-6 py-3 border border-border hover:bg-accent transition-colors font-medium"
                >
                  Discover More in Marketplace
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-foreground/60">No agents registered yet. Be the first to register an agent!</p>
                <Link
                  href="/settings"
                  className="inline-block px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
                >
                  Register Your Agent
                </Link>
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
