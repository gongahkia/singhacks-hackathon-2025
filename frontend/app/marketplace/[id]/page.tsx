"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { mockAgents } from "@/lib/mock-agents"
import { Badge } from "@/components/ui/badge"
import { Star, Download, Shield, ArrowLeft, Check } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AgentDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = use(params)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const agent = mockAgents.find(a => a.id === id)

  if (!agent) {
    return (
      <main className="min-h-screen">
        {/* Top navigation bar */}
        <nav className="border-b border-border px-12 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Hedera Agent Economy</h2>
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
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Agent Not Found</h1>
            <p className="text-foreground/60 mb-8">The agent you're looking for doesn't exist.</p>
            <Link
              href="/marketplace"
              className="px-6 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors inline-block"
            >
              Back to Marketplace
            </Link>
          </div>
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

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-5 h-5 fill-foreground text-foreground" />
      )
    }
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-5 h-5 fill-foreground/50 text-foreground" />
      )
    }
    const emptyStars = 5 - stars.length
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-5 h-5 text-foreground/20" />
      )
    }
    return stars
  }

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
                <Badge variant="outline">{agent.category}</Badge>
              </div>
              <p className="text-foreground/60 mb-4">by {agent.creator}</p>
              <p className="text-lg text-foreground/80 max-w-3xl">
                {agent.description}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {agent.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 text-sm bg-foreground/5 border border-foreground/10 rounded"
              >
                {tag}
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
                  <div className="text-2xl text-foreground/60">/100</div>
                </div>
                <div className="w-full h-3 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all"
                    style={{ width: `${agent.trustScore}%` }}
                  />
                </div>
                <p className="text-sm text-foreground/60">
                  This agent has been verified and audited. Trust score is calculated based on
                  code quality, security audits, community feedback, and uptime reliability.
                </p>
              </div>
            </div>

            {/* User Ratings */}
            <div className="border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <Star className="w-6 h-6 fill-foreground text-foreground" />
                <h2 className="text-2xl font-semibold">User Ratings</h2>
              </div>

              <div className="space-y-6">
                {/* Overall Rating */}
                <div className="flex items-start gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">{agent.rating}</div>
                    <div className="flex gap-1 mb-2">
                      {renderStars(agent.rating)}
                    </div>
                    <div className="text-sm text-foreground/60">
                      {agent.totalReviews.toLocaleString()} reviews
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map(stars => {
                      const percentage = stars === 5 ? 75 : stars === 4 ? 18 : stars === 3 ? 5 : stars === 2 ? 1 : 1
                      return (
                        <div key={stars} className="flex items-center gap-3">
                          <span className="text-sm w-8">{stars} ★</span>
                          <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-foreground/60 w-12 text-right">
                            {percentage}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Sample Reviews */}
                <div className="pt-6 border-t border-border space-y-4">
                  <h3 className="font-semibold text-lg">Recent Reviews</h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-foreground/5 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {renderStars(5)}
                        </div>
                        <span className="text-sm text-foreground/60">2 days ago</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        Excellent agent! Saved me hours of manual work. The accuracy is impressive
                        and the integration was seamless.
                      </p>
                      <div className="mt-2 text-xs text-foreground/60">- crypto_trader_42</div>
                    </div>

                    <div className="p-4 bg-foreground/5 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {renderStars(4)}
                        </div>
                        <span className="text-sm text-foreground/60">1 week ago</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        Great performance overall. Would love to see more customization options
                        in future updates.
                      </p>
                      <div className="mt-2 text-xs text-foreground/60">- defi_enthusiast</div>
                    </div>

                    <div className="p-4 bg-foreground/5 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {renderStars(5)}
                        </div>
                        <span className="text-sm text-foreground/60">2 weeks ago</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        Best agent in its category. The {agent.creator} team provides excellent
                        support and regular updates.
                      </p>
                      <div className="mt-2 text-xs text-foreground/60">- blockchain_dev</div>
                    </div>
                  </div>
                </div>
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
              <h3 className="text-lg font-semibold mb-4">Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-foreground/60 mb-1">Total Connections</div>
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-foreground/60" />
                    <span className="text-xl font-semibold">
                      {agent.downloads.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Last Updated</div>
                  <span className="text-base font-medium">
                    {new Date(agent.lastUpdated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Creator</div>
                  <span className="text-base font-medium">{agent.creator}</span>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-foreground/60 mb-1">Category</div>
                  <Badge variant="outline">{agent.category}</Badge>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-foreground/60 mb-1">License</div>
                  <div className="font-medium">MIT License</div>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="text-foreground/60 mb-1">Version</div>
                  <div className="font-medium">v2.{Math.floor(Math.random() * 10)}.{Math.floor(Math.random() * 10)}</div>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="text-foreground/60 mb-1">Smart Contract</div>
                  <div className="font-mono text-xs break-all">
                    0x{Math.random().toString(16).substring(2, 10)}...
                    {Math.random().toString(16).substring(2, 6)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
