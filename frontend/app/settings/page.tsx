"use client"

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { apiClient } from '../../src/lib/api-client'
import Link from 'next/link'
import { ProtocolBadge, ProtocolInfoPanel } from '@/components/protocol-badge'

export default function SettingsPage() {
  // Wallet connection using wagmi
  const { address: walletAddress, isConnected: walletConnected } = useAccount()

  // Groq AI settings
  const [groqKey, setGroqKey] = useState('')
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null)
  // Registered agent for chat
  const [registeredAgentName, setRegisteredAgentName] = useState('')
  const [agentSavedMsg, setAgentSavedMsg] = useState<string | null>(null)
  
  // Wallet connection status
  const [connectedAgents, setConnectedAgents] = useState<any[]>([])
  const [loadingConnections, setLoadingConnections] = useState(false)

  useEffect(() => {
    // Load current masked Groq API settings on mount
    apiClient.getSettings().then((res) => {
      if (res && res.config) {
        // Don't set masked values in the input - keep them empty so user knows to enter new key
        // Only set non-masked values
        const apiKey = res.config.GROQ_API_KEY || ''

        // Check if API key is masked (contains "..." or is masked format)
        if (!apiKey.includes('...')) {
          setGroqKey(apiKey)
        }
      }
    }).catch(() => {})

    // Load registered agent from localStorage (used by Chat)
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('heracles.registeredAgentName') : null
      if (stored) setRegisteredAgentName(stored)
    } catch {}

    // Load wallet connections if wallet is connected
    if (walletConnected && walletAddress) {
      fetchWalletConnections()
    }
  }, [walletConnected, walletAddress])

  const fetchWalletConnections = async () => {
    if (!walletAddress) return
    
    setLoadingConnections(true)
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/agent-connection/user/${walletAddress}`)
      if (res.ok) {
        const data = await res.json()
        setConnectedAgents([data])
      } else {
        setConnectedAgents([])
      }
    } catch (error) {
      setConnectedAgents([])
    } finally {
      setLoadingConnections(false)
    }
  }


  return (
    <main className="min-h-screen">
      {/* Main content */}
      <div className="p-12 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Settings</h1>
          <p className="text-foreground/60">
            Configure your connection to the Hedera blockchain network and register your AI agent. You'll need a Hedera account, wallet, and Groq API key to get started.
          </p>
        </div>

        <div className="space-y-8">
          {/* Wallet Connection Status */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Wallet Connection Status</h2>
              <p className="text-sm text-foreground/60">
                View your connected wallet and agents associated with it.
              </p>
            </div>
            
            {walletConnected && walletAddress ? (
              <div className="space-y-4">
                <div className="p-4 border border-border bg-foreground/5 rounded">
                  <div className="text-sm text-foreground/60 mb-1">Connected Wallet</div>
                  <div className="font-mono text-sm break-all">{walletAddress}</div>
                </div>
                
                {loadingConnections ? (
                  <div className="text-sm text-foreground/60">Loading connected agents...</div>
                ) : connectedAgents.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium mb-2">Connected Agents:</div>
                    {connectedAgents.map((conn, idx) => (
                      <div key={idx} className="p-4 border border-border bg-green-50 dark:bg-green-950 rounded">
                        <div className="text-sm font-medium">{conn.agent?.name || 'Unknown Agent'}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Agent ID: <span className="font-mono">{conn.agentId}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Connected: {new Date(conn.connectedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-foreground/60">
                    No agents connected to this wallet. Visit the marketplace to connect your wallet to an agent.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-foreground/60">
                Connect your wallet to view connection status.
              </div>
            )}
          </section>

          {/* Quick Links Section */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Quick Links</h2>
              <p className="text-sm text-foreground/60">
                Access key pages and features.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/marketplace"
                className="p-4 border border-border hover:bg-accent transition-colors rounded"
              >
                <div className="font-medium mb-1">Marketplace</div>
                <div className="text-sm text-foreground/60">Browse and discover AI agents</div>
              </Link>
              <Link
                href="/deploy-agent"
                className="p-4 border border-border hover:bg-accent transition-colors rounded"
              >
                <div className="font-medium mb-1">Deploy Agent</div>
                <div className="text-sm text-foreground/60">Register a new AI agent</div>
              </Link>
              <Link
                href="/chat"
                className="p-4 border border-border hover:bg-accent transition-colors rounded"
              >
                <div className="font-medium mb-1">Chat</div>
                <div className="text-sm text-foreground/60">AI-powered agent assistant</div>
              </Link>
            </div>
          </section>

          {/* Protocol Information */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Protocol Information</h2>
              <p className="text-sm text-foreground/60">
                Information about the protocols used in this platform.
              </p>
            </div>
            <ProtocolInfoPanel />
            <div className="text-sm text-foreground/60 space-y-2">
              <div>
                <strong>ERC-8004:</strong> Official Identity & Reputation Registry on Hedera Testnet
              </div>
              <div>
                <strong>Contract Address:</strong>{' '}
                <a 
                  href="https://hashscan.io/testnet/address/0x4c74ebd72921d537159ed2053f46c12a7d8e5923" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  0x4c74ebd72921d537159ed2053f46c12a7d8e5923
                </a>
              </div>
              <div>
                <strong>x402 Protocol:</strong> Micropayment Standard via hosted facilitator
              </div>
              <div>
                <strong>Hybrid Trust:</strong> Combines custom metrics (60%) with ERC-8004 reputation (40%)
              </div>
            </div>
          </section>

          {/* Registered Agent for Chat */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Registered Agent (for Chat)</h2>
              <p className="text-sm text-foreground/60">This name is used by the Agent Chat when initializing your session.</p>
            </div>
            <div className="max-w-xl flex items-center gap-3">
              <input
                className="flex-1 px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Alice Tan"
                value={registeredAgentName}
                onChange={(e) => setRegisteredAgentName(e.target.value)}
              />
              <button
                className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  try {
                    const v = (registeredAgentName || '').trim()
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('heracles.registeredAgentName', v)
                      window.dispatchEvent(new CustomEvent('heracles:agentNameChanged', { detail: { name: v } }))
                    }
                    setAgentSavedMsg('Registered agent saved')
                    setTimeout(() => setAgentSavedMsg(null), 1500)
                  } catch (e: any) {
                    setAgentSavedMsg('Save failed')
                    setTimeout(() => setAgentSavedMsg(null), 2000)
                  }
                }}
              >
                Save
              </button>
            </div>
            {agentSavedMsg && <div className="text-sm text-foreground/70">{agentSavedMsg}</div>}
          </section>

          {/* Groq AI API Key Section */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Groq AI (Ultra-Fast LLM)</h2>
              <p className="text-sm text-foreground/60">
                Add your Groq API key for ultra-fast AI agent discovery and natural language search. The key is stored server-side and masked in the UI. Get a free API key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.groq.com</a>.
              </p>
            </div>

            <div className="max-w-3xl">
              <input
                className="w-full px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your Groq API key (gsk_...)"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
                onClick={async () => {
                  try {
                    setSettingsSaveMsg(null)
                    // Only send non-empty values to avoid overwriting with empty strings
                    const updateData: Record<string, string> = {}
                    if (groqKey && groqKey.trim()) {
                      updateData.GROQ_API_KEY = groqKey.trim()
                    }
                    await apiClient.updateSettings(updateData)
                    setSettingsSaveMsg('Saved successfully!')
                  } catch (e: any) {
                    setSettingsSaveMsg('Save failed: ' + (e.message || e))
                  }
                }}
              >
                Save Groq Settings
              </button>
              {settingsSaveMsg && (
                <div className="px-4 py-3 text-sm">{settingsSaveMsg}</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}