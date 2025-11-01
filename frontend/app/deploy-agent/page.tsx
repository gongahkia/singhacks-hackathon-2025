'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Plus, X, Loader2, CheckCircle, Shield } from 'lucide-react'
import Link from 'next/link'
import { ProtocolBadge } from '@/components/protocol-badge'

export default function DeployAgentPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [newCapability, setNewCapability] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentAddress, setAgentAddress] = useState<string | null>(null)

  const getSuggestions = async () => {
    if (!description.trim()) return
    
    setLoadingSuggestions(true)
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/ai/suggest-capabilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      })
      const data = await res.json()
      
      // Parse suggestions - they might be in different formats
      let suggestions = []
      if (Array.isArray(data.suggestions)) {
        suggestions = data.suggestions
      } else if (typeof data.suggestions === 'string') {
        try {
          suggestions = JSON.parse(data.suggestions)
        } catch {
          suggestions = [data.suggestions]
        }
      }
      
      setAiSuggestions(suggestions)
    } catch (error) {
      console.error('Failed to get suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const addCapability = (cap: string) => {
    if (cap && !capabilities.includes(cap)) {
      setCapabilities([...capabilities, cap])
      setNewCapability('')
    }
  }

  const removeCapability = (cap: string) => {
    setCapabilities(capabilities.filter(c => c !== cap))
  }

  const [erc8004AgentId, setErc8004AgentId] = useState<string | null>(null)
  const [registrationData, setRegistrationData] = useState<any>(null)

  const handleRegister = async () => {
    if (!name || capabilities.length === 0) {
      setError('Name and at least one capability are required')
      return
    }
    
    setRegistering(true)
    setError(null)
    
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      // Use walletless registration endpoint
      const res = await fetch(`${BASE_URL}/api/agents/register-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          capabilities,
          metadata: description
          // No wallet required - uses service wallet
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        const errorMsg = errorData.error || 'Registration failed'
        
        // Handle "Already registered" error gracefully
        if (errorMsg.includes('Already registered') || errorMsg.includes('already exists')) {
          setError(`This agent is already registered. You can view it in the marketplace or try registering with a different name.`)
        } else {
          throw new Error(errorMsg)
        }
        return
      }
      
      const data = await res.json()
      setAgentAddress(data.registeredAddress || data.agentAddress)
      setErc8004AgentId(data.erc8004AgentId || null)
      setRegistrationData(data)
      setRegistered(true)
      
      // Refresh marketplace after short delay to show new agent
      setTimeout(() => {
        // Optionally redirect to marketplace to see new agent
        window.location.href = '/marketplace'
      }, 3000)
    } catch (error: any) {
      setError(error.message || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  if (registered && agentAddress) {
    return (
      <main className="min-h-screen">
        <div className="p-12 max-w-3xl mx-auto">
          <div className="border border-green-500 bg-green-50 dark:bg-green-950 p-8 rounded-lg text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h1 className="text-3xl font-bold">Agent Registered Successfully!</h1>
            <p className="text-lg">Your agent <strong>{name}</strong> has been registered on the Hedera blockchain.</p>
            
            {/* ERC-8004 Status */}
            {erc8004AgentId && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-500 p-4 rounded-lg text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">ERC-8004 Registered</span>
                  <ProtocolBadge protocol="erc8004" size="sm" />
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>ERC-8004 Agent ID: <span className="font-mono">{erc8004AgentId}</span></div>
                  <div className="mt-1 text-xs">
                    This agent is now part of the official ERC-8004 Identity Registry and will use ERC-8004 reputation (70% weight) in trust scoring.
                  </div>
                </div>
              </div>
            )}
            
            {!erc8004AgentId && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-500 p-4 rounded-lg text-left">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ ERC-8004 registration was skipped (non-critical). Agent is still functional.
                </div>
              </div>
            )}
            
            <div className="bg-background border border-border p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Agent Address</div>
              <div className="font-mono text-sm break-all">{agentAddress}</div>
            </div>
            
            <div className="text-sm text-muted-foreground pt-2">
              Redirecting to marketplace in 3 seconds...
            </div>
            
            <div className="flex gap-3 justify-center pt-4">
              <Link
                href={`/marketplace/${agentAddress}`}
                className="px-6 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                View Agent Profile
              </Link>
              <Link
                href="/marketplace"
                className="px-6 py-3 border border-border hover:bg-accent transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="p-12 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Deploy Your Agent</h1>
          <p className="text-foreground/60">Register your AI agent on the Hedera blockchain with AI-powered capability suggestions</p>
        </div>

        <div className="space-y-6">
          {/* Agent Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Data Analyst Bot"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your agent does, its specialization, and any unique features..."
              rows={4}
              className="w-full"
            />
            <Button
              onClick={getSuggestions}
              disabled={!description.trim() || loadingSuggestions}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              {loadingSuggestions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get AI Capability Suggestions
                </>
              )}
            </Button>
          </div>

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="border border-blue-500 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm">AI-Suggested Capabilities (Powered by Groq)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => addCapability(suggestion)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    disabled={capabilities.includes(suggestion)}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Capabilities *</label>
            <div className="flex gap-2">
              <Input
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCapability(newCapability)}
                placeholder="e.g., data-analysis, payments"
                className="flex-1"
              />
              <Button
                onClick={() => addCapability(newCapability)}
                variant="outline"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Selected Capabilities */}
            {capabilities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {capabilities.map(cap => (
                  <Badge key={cap} variant="default" className="gap-2">
                    {cap}
                    <button
                      onClick={() => removeCapability(cap)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="border border-red-300 bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Register Button */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleRegister}
              disabled={!name || capabilities.length === 0 || registering}
              className="flex-1"
              size="lg"
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering on Hedera...
                </>
              ) : (
                'Register Agent'
              )}
            </Button>
            <Button
              onClick={() => window.location.href = '/marketplace'}
              variant="outline"
              size="lg"
            >
              Cancel
            </Button>
          </div>

          {/* Info */}
          <div className="border border-border p-4 rounded-lg text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Registration Process:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Agent will be registered on the Hedera blockchain (no wallet required)</li>
              <li>Automatically registered with ERC-8004 Identity Registry</li>
              <li>Initial trust score based on ERC-8004 (70% weight) + Custom metrics</li>
              <li>Transaction recorded on HCS (Hedera Consensus Service)</li>
              <li>Agent will appear in marketplace immediately</li>
              <li className="flex items-center gap-1 mt-2">
                <ProtocolBadge protocol="erc8004" size="sm" />
                <ProtocolBadge protocol="x402" size="sm" />
                <span className="ml-1">Protocol compliance enabled</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
