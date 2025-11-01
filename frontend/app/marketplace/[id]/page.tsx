"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Star, Download, Shield, ArrowLeft, Check } from "lucide-react"

interface Agent {
  name: string
  address: string
  capabilities: string[]
  metadata: string
  trustScore: string
  registeredAt: string
  isActive: boolean
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AgentDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    fetchAgent()
  }, [id])

  const fetchAgent = async () => {
    setLoading(true)
    setError(null)
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agents/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Agent not found')
        }
        throw new Error('Failed to fetch agent from backend')
      }
      const data = await res.json()
      setAgent(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading || error || !agent) {
    return (
      <main className="min-h-screen">
        {/* Top navigation bar */}
        <nav className="border-b border-border px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/heracles-icon.jpg" alt="Heracles" className="w-8 h-8 object-contain" />
              <h2 className="text-xl font-semibold">Heracles</h2>
            </div>
            <div className="flex gap-3">
              <Link href="/" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/marketplace" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
                Marketplace
              </Link>
            </div>
          </div>
        </nav>

        <div className="p-12 flex items-center justify-center min-h-[calc(100vh-80px)]">
          {loading && (
            <div className="text-center">
              <p className="text-xl text-foreground/60">Loading agent details...</p>
            </div>
          )}

          {error && (
            <div className="text-center max-w-2xl">
              <h1 className="text-3xl font-bold mb-4 text-red-800">Failed to Load Agent</h1>
              <p className="text-foreground/60 mb-4">{error}</p>
              <div className="border border-red-300 bg-red-50 p-6 text-sm text-red-700 mb-8">
                <p className="font-semibold mb-2">Possible issues:</p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>Backend server is not running</li>
                  <li>Smart contract not deployed</li>
                  <li>Agent with address {id} does not exist</li>
                </ul>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={fetchAgent}
                  className="px-6 py-3 border border-border hover:bg-accent transition-colors"
                >
                  Retry
                </button>
                <Link
                  href="/marketplace"
                  className="px-6 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors inline-block"
                >
                  Back to Marketplace
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    )
  }

  const handleConnect = () => {
    setIsConnecting(true)
    setTimeout(() => {
      setIsConnected(true)
      setIsConnecting(false)
    }, 1000)
  }

  return (
    <main className="min-h-screen">
      {/* Top navigation bar matching main page styling */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/heracles-icon.jpg" alt="Heracles" className="w-8 h-8 object-contain" />
            <h2 className="text-xl font-semibold">Heracles</h2>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/marketplace" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Marketplace
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-12 max-w-5xl mx-auto">
        {/* Back Button */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 mb-8 text-foreground/60 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        {/* Agent Header */}
        <div className="border border-border p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{agent.name}</h1>
                <Badge variant="outline">{agent.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-sm text-foreground/60 mb-4 font-mono break-all">{agent.address}</p>
              {agent.metadata && (
                <p className="text-lg text-foreground/80 max-w-3xl">
                  {agent.metadata}
                </p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div className="flex flex-wrap gap-2 mt-6">
            {agent.capabilities.map(cap => (
              <span
                key={cap}
                className="px-3 py-1 text-sm bg-foreground/5 border border-foreground/10 rounded"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trust Score */}
            <div className="border border-border p-8">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-foreground" />
                <h2 className="text-2xl font-semibold">Trust Score</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold">{agent.trustScore}</div>
                </div>
                <p className="text-sm text-foreground/60">
                  This is the on-chain trust score for this agent. Trust scores are calculated based on
                  smart contract interactions, transaction history, and network reputation.
                </p>
              </div>
            </div>

            {/* Capabilities Detail */}
            <div className="border border-border p-8">
              <h2 className="text-2xl font-semibold mb-6">Agent Capabilities</h2>
              <div className="space-y-4">
                {agent.capabilities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {agent.capabilities.map(cap => (
                      <div
                        key={cap}
                        className="p-4 border border-border bg-foreground/5 rounded"
                      >
                        <div className="font-medium">{cap}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground/60">No capabilities registered</p>
                )}
              </div>
            </div>

            {/* Additional Info */}
            {agent.metadata && (
              <div className="border border-border p-8">
                <h2 className="text-2xl font-semibold mb-4">Metadata</h2>
                <p className="text-foreground/80">{agent.metadata}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connect Button */}
            <div className="border border-border p-6">
              <button
                onClick={handleConnect}
                disabled={isConnected || isConnecting}
                className={`w-full py-4 text-lg font-semibold transition-all ${
                  isConnected
                    ? "bg-foreground/10 text-foreground cursor-default"
                    : "bg-foreground text-background hover:bg-foreground/90"
                } ${isConnecting ? "opacity-50 cursor-wait" : ""}`}
              >
                {isConnecting ? (
                  "Connecting..."
                ) : isConnected ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Connected
                  </span>
                ) : (
                  "Connect Agent"
                )}
              </button>
              {isConnected && (
                <p className="text-sm text-foreground/60 mt-3 text-center">
                  Agent successfully connected to your wallet
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Agent Information</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-foreground/60 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{agent.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Registered</div>
                  <span className="text-base font-medium">
                    {new Date(agent.registeredAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Agent Address</div>
                  <div className="font-mono text-xs break-all">
                    {agent.address}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Trust Score</div>
                  <span className="text-base font-medium">{agent.trustScore}</span>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Capabilities Count</div>
                  <span className="text-base font-medium">{agent.capabilities.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
