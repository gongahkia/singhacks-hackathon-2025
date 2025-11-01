'use client'

import { useState } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import Link from 'next/link'

interface MatchedAgent {
  name: string
  address: string
  accountId?: string
  trustScore: number
  capabilities: string[]
  relevanceScore?: number
  reasoning?: string
}

export function AIAgentSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MatchedAgent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setError(null)
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      // First get all agents
      const agentsRes = await fetch(`${BASE_URL}/api/agents`)
      const agentsData = await agentsRes.json()
      
      // Then use Groq AI to rank them
      const res = await fetch(`${BASE_URL}/api/ai/search-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          availableAgents: agentsData.agents 
        })
      })
      const data = await res.json()
      
      setResults(data.matchedAgents || data.agents || [])
    } catch (error: any) {
      console.error('AI search failed:', error)
      setError(error.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Find me a data analyst under 10 HBAR/hour..."
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Search
            </>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="border border-red-300 bg-red-50 dark:bg-red-950 p-4 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      
      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">AI-Matched Agents</h3>
            <Badge variant="outline">
              {results.length} {results.length === 1 ? 'match' : 'matches'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((agent) => (
              <Link
                key={agent.address}
                href={`/marketplace/${agent.address}`}
                className="border border-border p-4 rounded-lg hover:shadow-lg transition-all hover:border-blue-500"
              >
                <div className="space-y-3">
                  {/* Agent Header */}
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold">{agent.name}</h4>
                    <Badge variant={agent.trustScore >= 70 ? "default" : "secondary"}>
                      Trust: {agent.trustScore}
                    </Badge>
                  </div>
                  
                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 3).map(cap => (
                      <span
                        key={cap}
                        className="px-2 py-1 text-xs bg-muted rounded"
                      >
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span className="px-2 py-1 text-xs text-muted-foreground">
                        +{agent.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  {/* AI Relevance Score */}
                  {agent.relevanceScore !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${agent.relevanceScore * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(agent.relevanceScore * 100)}% match
                      </span>
                    </div>
                  )}
                  
                  {/* AI Reasoning */}
                  {agent.reasoning && (
                    <p className="text-xs text-muted-foreground italic">
                      {agent.reasoning}
                    </p>
                  )}
                  
                  {/* Address */}
                  <div className="text-xs font-mono text-muted-foreground truncate">
                    {agent.address}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Powered by Groq badge */}
      {results.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          ⚡ Powered by Groq AI - Ultra-fast inference
        </div>
      )}
    </div>
  )
}

