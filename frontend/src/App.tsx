"use client"

import { useEffect, useState } from 'react'
import { apiClient } from './lib/api-client'
import { getAgentTransactions, AgentTxRecord } from '../lib/tx-store'
import Link from 'next/link'

type Health = { status: string; timestamp: string; network?: string; version?: string }

type Transaction = {
  id: string
  type: string
  agent: string
  amount: string
  status: 'completed' | 'pending' | 'failed'
  timestamp: string
  hash?: string
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    apiClient.healthCheck().then(setHealth).catch((e: any) => setError(e.message))
    loadAgents()
    hydrateTransactions()
    const onNewTx = () => hydrateTransactions()
    window.addEventListener('agent-tx-added', onNewTx as EventListener)
    return () => window.removeEventListener('agent-tx-added', onNewTx as EventListener)
  }, [])
  const hydrateTransactions = () => {
    const fromStore = getAgentTransactions()
    const mapped: Transaction[] = fromStore.map(mapAgentTxToRow)
    setTransactions(mapped)
  }

  const mapAgentTxToRow = (r: AgentTxRecord): Transaction => ({
    id: r.id,
    type: 'Agent Payment',
    agent: r.sellerName || 'Unknown Agent',
    amount: `${r.amountHBAR} HBAR`,
    status: r.status,
    timestamp: new Date(r.timestamp).toISOString(),
    hash: r.txHash || r.escrowId
  })

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
          <div className="flex items-center gap-3">
            <img src="/heracles-icon.jpg" alt="Heracles" className="w-8 h-8 object-contain" />
            <h2 className="text-xl font-semibold">Heracles</h2>
          </div>
          <div className="flex gap-3">
            <Link href="/marketplace" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Agent Marketplace
            </Link>
            <Link href="/chat" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Chat
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
          <p className="text-foreground/60">Welcome to the Heracles Dashboard. This platform allows you to discover, register, and interact with AI agents that can perform automated tasks on the Hedera blockchain network.</p>
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

          {/* Agent Transactions Section */}
          <section className="border border-border p-8 space-y-4">
            <h2 className="text-lg font-semibold">Agent Transactions</h2>
            <p className="text-sm text-foreground/60">
              View all transactions conducted by your AI agents. This includes token transfers, smart contract calls,
              payments, and other blockchain activities. Each transaction shows the type, agent involved, amount,
              status, and transaction hash for verification on the blockchain.
            </p>

            <div className="border border-border overflow-hidden">
              {/* Table header */}
              <div className="bg-foreground/5 border-b border-border px-4 py-3">
                <div className="grid grid-cols-6 gap-4 text-sm font-semibold">
                  <div>Type</div>
                  <div>Agent</div>
                  <div>Amount</div>
                  <div>Status</div>
                  <div>Time</div>
                  <div>Hash</div>
                </div>
              </div>

              {/* Scrollable table body */}
              <div className="max-h-96 overflow-y-auto">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <Link
                      href={`/transactions/${encodeURIComponent(tx.id)}`}
                      key={tx.id}
                      className="block border-b border-border px-4 py-3 hover:bg-foreground/5 transition-colors"
                    >
                      <div className="grid grid-cols-6 gap-4 text-sm">
                        <div className="font-medium">{tx.type}</div>
                        <div className="text-foreground/60">{tx.agent}</div>
                        <div className="font-mono">{tx.amount}</div>
                        <div>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              tx.status === 'completed'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : tx.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-foreground/60 text-xs">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                        <div className="font-mono text-xs text-foreground/60 truncate">
                          {tx.hash || 'N/A'}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-foreground/60">
                    No transactions yet. Start using agents to see your transaction history.
                  </div>
                )}
              </div>
            </div>

            {transactions.length > 0 && (
              <div className="text-xs text-foreground/60 pt-2">
                Showing {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
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
