"use client"

import { useState } from "react"
import Link from "next/link"
import { mockAgents } from "@/lib/mock-agents"
import { Badge } from "@/components/ui/badge"
import { Star, Download, Shield } from "lucide-react"

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  const categories = ["All", "Finance", "Trading", "Security", "DeFi", "NFT", "Governance", "Utility", "Infrastructure", "Analytics"]

  const filteredAgents = mockAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "All" || agent.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen">
      {/* Top navigation bar matching main page styling */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hedera Agent Economy</h2>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Agent Marketplace</h1>
          <p className="text-foreground/60">Discover and connect AI agents for Web3</p>

          {/* Search Bar */}
          <div className="mt-8">
            <input
              type="text"
              placeholder="Search agents by name, description, or tags..."
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

        {/* Results Count */}
        <div className="mb-6 text-foreground/60">
          {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'} found
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map(agent => (
            <Link
              key={agent.id}
              href={`/marketplace/${agent.id}`}
              className="border border-border p-6 hover:border-foreground/40 transition-all hover:shadow-lg group"
            >
              {/* Agent Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-semibold group-hover:text-foreground/80 transition-colors">
                    {agent.name}
                  </h3>
                  <Badge variant="outline" className="shrink-0">
                    {agent.category}
                  </Badge>
                </div>
                <p className="text-sm text-foreground/60 line-clamp-2">
                  {agent.description}
                </p>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                {/* Trust Score */}
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-foreground/60" />
                  <span className="text-sm text-foreground/60">Trust Score:</span>
                  <span className="text-sm font-semibold">{agent.trustScore}/100</span>
                  <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground transition-all"
                      style={{ width: `${agent.trustScore}%` }}
                    />
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-foreground text-foreground" />
                  <span className="text-sm font-semibold">{agent.rating}</span>
                  <span className="text-sm text-foreground/60">
                    ({agent.totalReviews.toLocaleString()} reviews)
                  </span>
                </div>

                {/* Downloads */}
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-foreground/60" />
                  <span className="text-sm text-foreground/60">
                    {agent.downloads.toLocaleString()} connections
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {agent.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-foreground/5 border border-foreground/10 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-foreground/60">
                <span>by {agent.creator}</span>
                <span>Updated {new Date(agent.lastUpdated).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* No Results */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-foreground/60">No agents found matching your criteria</p>
            <p className="text-sm text-foreground/40 mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </main>
  )
}
