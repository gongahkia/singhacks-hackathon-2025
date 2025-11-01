"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Star, Download, Shield, ArrowLeft, Check, ChevronDown, ChevronUp } from "lucide-react"
import { ProtocolBadge, ProtocolInfoPanel } from "@/components/protocol-badge"
import { ConnectAgentWallet } from "@/components/connect-agent-wallet"

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
  const [hcsMessages, setHcsMessages] = useState<any[]>([])
  const [showTimeline, setShowTimeline] = useState(false)
  const [pollingActive, setPollingActive] = useState(false)
  const [hybridTrust, setHybridTrust] = useState<any>(null)
  const [connectedWallets, setConnectedWallets] = useState<any[]>([])

  useEffect(() => {
    fetchAgent()
  }, [id])

  useEffect(() => {
    if (showTimeline && pollingActive && agent) {
      fetchHCSMessages()
      const interval = setInterval(fetchHCSMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [showTimeline, pollingActive, agent])

  useEffect(() => {
    if (agent) {
      fetchHybridTrust()
      fetchConnectedWallets()
    }
  }, [agent])

  const fetchConnectedWallets = async () => {
    try {
      // Try to get agentId from metadata
      let agentId = null;
      try {
        const metadataObj = JSON.parse(agent?.metadata || '{}');
        agentId = metadataObj.agentId || null;
      } catch (e) {
        // Not JSON
      }
      
      if (!agentId) {
        // Fallback: try to extract from address or use address as agentId
        agentId = agent?.address || id;
      }
      
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agent-connection/agent/${agentId}/wallets`)
      const data = await res.json()
      setConnectedWallets(data.connectedWallets || [])
    } catch (error) {
      console.error('Failed to fetch connected wallets:', error)
      setConnectedWallets([])
    }
  }

  const fetchHybridTrust = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/reputation/agents/${agent?.address}/hybrid-trust`)
      const data = await res.json()
      setHybridTrust(data)
    } catch (error) {
      console.error('Failed to fetch hybrid trust:', error)
    }
  }

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

  const fetchHCSMessages = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agents/${id}/hcs-messages`)
      const data = await res.json()
      setHcsMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to fetch HCS messages:', error)
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
                {agent.paymentMode === 'permissionless' && (
                  <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
                    🤖 Autonomous Payments
                  </Badge>
                )}
                {agent.paymentMode === 'permissioned' && (
                  <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                    👤 User Controlled
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground/60 mb-2 font-mono break-all">{agent.address}</p>
              {agent.paymentMode === 'permissionless' && agent.agentWalletAddress && (
                <div className="mb-4">
                  <p className="text-xs text-foreground/60 mb-1">Agent Wallet Address (Send funds here for autonomous payments):</p>
                  <p className="text-sm text-purple-600 font-mono break-all bg-purple-500/10 p-2 rounded border border-purple-500/30">
                    {agent.agentWalletAddress}
                  </p>
                </div>
              )}
              {agent.metadata && (
                <p className="text-lg text-foreground/80 max-w-3xl">
                  {(() => {
                    try {
                      const parsed = JSON.parse(agent.metadata);
                      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                        // If it's a JSON object, try to display nicely
                        if (parsed.specialization || parsed.hourlyRate || parsed.location) {
                          return `${parsed.specialization || ''}${parsed.hourlyRate ? ` - ${parsed.hourlyRate}` : ''}${parsed.location ? ` - ${parsed.location}` : ''}`;
                        }
                        return JSON.stringify(parsed, null, 2);
                      }
                      return agent.metadata;
                    } catch {
                      return agent.metadata;
                    }
                  })()}
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

        {/* Protocol Compliance Panel */}
        <div className="mb-6">
          <ProtocolInfoPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI-Generated Description */}
            {agent.metadata && (
              <div className="border border-border p-8">
                <h2 className="text-2xl font-semibold mb-4">About This Agent</h2>
                <p className="text-foreground/80">{agent.metadata}</p>
              </div>
            )}

            {/* Agent Interaction History - Moved from sidebar to main content */}
            <div className="border border-border">
              <button
                onClick={() => {
                  setShowTimeline(!showTimeline)
                  setPollingActive(!pollingActive)
                }}
                className="w-full flex items-center justify-between p-6 hover:bg-accent transition-colors"
              >
                <h2 className="text-2xl font-semibold">Agent Interaction History</h2>
                {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showTimeline && (
                <div className="p-6 pt-0 space-y-3 max-h-96 overflow-y-auto">
                  {hcsMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground">No interactions yet</p>
                  )}
                  {hcsMessages.map((msg, i) => (
                    <div key={i} className="border-l-2 border-blue-500 pl-4 py-2 hover:bg-accent/50 transition-colors">
                      <div className="text-sm font-medium">{msg.event}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Topic: {msg.topicName}
                      </div>
                      {msg.details && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-w-full">
                            {JSON.stringify(msg.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  {pollingActive && (
                    <div className="text-xs text-green-600 flex items-center gap-2 pt-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                      Live updates active (refreshing every 5s)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Wallet Connection */}
            {(() => {
              // Try to extract agentId from metadata
              let agentId = null;
              try {
                const metadataObj = JSON.parse(agent?.metadata || '{}');
                agentId = metadataObj.agentId || null;
              } catch (e) {
                // Not JSON
              }
              
              if (!agentId) {
                agentId = agent?.address || id;
              }
              
              return (
                <div className="border border-border p-8">
                  <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your wallet to allow this agent to use it for transactions with other agents.
                  </p>
                  <ConnectAgentWallet
                    agentId={agentId}
                    agentName={agent?.name || 'Agent'}
                    onConnected={() => {
                      fetchConnectedWallets(); // Refresh wallet list
                    }}
                  />
                </div>
              );
            })()}

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

                {/* Trust Score with Hybrid Breakdown */}
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1 flex items-center gap-2">
                    Trust Score
                    {hybridTrust && <ProtocolBadge protocol="hybrid-trust" size="sm" />}
                  </div>
                  {hybridTrust ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{hybridTrust.final || hybridTrust.hybrid}</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Custom: {hybridTrust.custom} ({Math.round(hybridTrust.weights.custom * 100)}%)</div>
                        <div>ERC-8004: {hybridTrust.official} ({Math.round(hybridTrust.weights.official * 100)}%)</div>
                        {hybridTrust.officialFeedbackCount > 0 && (
                          <div className="text-green-600">{hybridTrust.officialFeedbackCount} official reviews</div>
                        )}
                      </div>
                    </div>
                  ) : (
                  <span className="text-base font-medium">{agent.trustScore}</span>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Capabilities Count</div>
                  <span className="text-base font-medium">{agent.capabilities.length}</span>
                </div>

                {/* Wallet Connection Status */}
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Connected Wallets</div>
                  {connectedWallets.length > 0 ? (
                    <div className="space-y-1">
                      {connectedWallets.map((conn, i) => (
                        <div key={i} className="text-xs font-mono break-all text-green-600 dark:text-green-400">
                          ✓ {conn.wallet.substring(0, 20)}...
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(conn.connectedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No wallets connected</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
