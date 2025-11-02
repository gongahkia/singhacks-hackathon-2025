"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Star, Download, Shield } from "lucide-react"
import { AIAgentSearch } from "@/components/ai-agent-search"
import { ProtocolInfoPanel } from "@/components/protocol-badge"

interface Agent {
  name: string
  address: string
  capabilities: string[]
  metadata: string
  trustScore: string
  registeredAt: string
  isActive: boolean
  agentId?: string
  erc8004AgentId?: string | null
}

interface HybridTrust {
  final: number
  hybrid: number
  custom: number
  official: number
  weights: {
    custom: number
    official: number
  }
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trustScores, setTrustScores] = useState<Map<string, HybridTrust>>(new Map())

  const categories = ["All", "Finance", "Trading", "Security", "DeFi", "NFT", "Governance", "Utility", "Infrastructure", "Analytics"]

  useEffect(() => {
    fetchAgents()
    
    // Poll for new agents every 10 seconds
    const interval = setInterval(() => {
      fetchAgents()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchAgents = async () => {
    setLoading(true)
    setError(null)
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agents`)
      if (!res.ok) throw new Error('Failed to fetch agents from backend')
      const data = await res.json()
      const fetchedAgents = data.agents || []
      setAgents(fetchedAgents)
      
      // Fetch hybrid trust scores for all agents
      const trustMap = new Map<string, HybridTrust>()
      await Promise.all(
        fetchedAgents.map(async (agent: Agent) => {
          try {
            const trustRes = await fetch(`${BASE_URL}/api/reputation/agents/${agent.address}/hybrid-trust`)
            if (trustRes.ok) {
              const trustData = await trustRes.json()
              trustMap.set(agent.address, trustData)
            }
          } catch (e) {
            // Failed to fetch trust, use default
          }
        })
      )
      setTrustScores(trustMap)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "All" || agent.capabilities.includes(selectedCategory.toLowerCase())
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen">
      <div className="p-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Agent Marketplace</h1>
          <p className="text-foreground/60">Discover AI agents registered on the Hedera blockchain. Each agent is an automated program that can perform specific tasks like trading tokens, managing NFTs, or executing smart contracts. Browse by category or search for agents with specific capabilities.</p>

          {/* Protocol Compliance Panel */}
          <div className="mt-6">
            <ProtocolInfoPanel />
          </div>

          {/* Register Agent Button */}
          <div className="mt-6">
            <Link
              href="/deploy-agent"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-lg"
            >
              <span>+</span>
              <span>Register New Agent</span>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">
              Register your AI agent and it will automatically appear in the marketplace with ERC-8004 compliance
            </p>
          </div>

          {/* AI-Powered Search */}
          <div className="mt-8">
            <AIAgentSearch />
          </div>

          {/* Traditional Search Bar */}
          <div className="mt-6">
            <input
              type="text"
              placeholder="Or use traditional search by name, capabilities, or wallet address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category Filter */}
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-foreground text-background"
                    : "bg-background border border-border hover:bg-accent"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <p className="text-xl text-foreground/60">Loading agents from backend...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="border border-red-300 bg-red-50 p-8 text-center">
            <p className="text-xl font-semibold text-red-800 mb-2">Failed to Load Agents</p>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="space-y-2 text-sm text-red-700">
              <p>Possible issues:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Backend server is not running (should be at http://localhost:3001)</li>
                <li>AgentRegistry smart contract is not deployed</li>
                <li>AGENT_REGISTRY_ADDRESS not set in backend .env</li>
              </ul>
            </div>
            <button
              onClick={fetchAgents}
              className="mt-6 px-6 py-3 bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && (
          <div className="mb-6 text-foreground/60">
            {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'} found
          </div>
        )}

        {/* Agent Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map(agent => (
              <Link
                key={agent.agentId || agent.address}
                href={`/marketplace/${agent.agentId || agent.address}`}
                className="border border-border p-6 hover:border-foreground/40 transition-all hover:shadow-lg group"
              >
                {/* Agent Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold group-hover:text-foreground/80 transition-colors">
                          {agent.name}
                        </h3>
                        {agent.paymentMode === 'permissionless' && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-600 border border-purple-500/30 rounded" title="Autonomous payment agent">
                            🤖
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/40 font-mono break-all mb-2">
                    {agent.address}
                  </p>
                  {agent.paymentMode === 'permissionless' && agent.agentWalletAddress && (
                    <div className="text-xs text-purple-600 mb-1">
                      Wallet: {agent.agentWalletAddress.substring(0, 16)}...
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  {/* Trust Score */}
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-foreground/60" />
                    <span className="text-sm text-foreground/60">Trust Score:</span>
                    {trustScores.has(agent.address) ? (
                      <span className="text-sm font-semibold">{trustScores.get(agent.address)?.final || trustScores.get(agent.address)?.hybrid || agent.trustScore}</span>
                    ) : (
                      <span className="text-sm font-semibold">{agent.trustScore}</span>
                    )}
                  </div>

                  {/* Registered Date */}
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-foreground/60" />
                    <span className="text-sm text-foreground/60">
                      Registered: {new Date(agent.registeredAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {agent.capabilities.slice(0, 3).map(cap => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 text-xs bg-foreground/5 border border-foreground/10 rounded"
                    >
                      {cap}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="px-2 py-0.5 text-xs text-foreground/60">
                      +{agent.capabilities.length - 3} more
                    </span>
                  )}
                </div>

                {/* Metadata */}
                {agent.metadata && (
                  <div className="pt-4 border-t border-border text-xs text-foreground/60">
                    {agent.metadata}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredAgents.length === 0 && agents.length > 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-foreground/60">No agents found matching your criteria</p>
            <p className="text-sm text-foreground/40 mt-2">Try adjusting your search or filters</p>
          </div>
        )}

        {/* No Agents at All */}
        {!loading && !error && agents.length === 0 && (
          <div className="border border-border p-12 text-center">
            <p className="text-xl font-semibold text-foreground mb-2">No Agents Registered Yet</p>
            <p className="text-sm text-foreground/60 mb-6">
              There are no agents registered on the blockchain yet. Be the first to register an agent!
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors inline-block"
            >
              Go to Dashboard to Register
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
