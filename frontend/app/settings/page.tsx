"use client"

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { apiClient } from '../../src/lib/api-client'
import Link from 'next/link'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Connect agent state
  const [accountId, setAccountId] = useState('')
  const [evmAddress, setEvmAddress] = useState('')
  const [agentName, setAgentName] = useState('')
  const [capability, setCapability] = useState('')
  const [signature, setSignature] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectResult, setConnectResult] = useState<any | null>(null)

  // Wallet connection using wagmi
  const { address: walletAddress, isConnected: walletConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  // Gemini settings
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiUrl, setGeminiUrl] = useState('')
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null)
  // Registered agent for chat
  const [registeredAgentName, setRegisteredAgentName] = useState('')
  const [agentSavedMsg, setAgentSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    // Load current masked Gemini API settings on mount
    apiClient.getSettings().then((res) => {
      if (res && res.config) {
        // Don't set masked values in the input - keep them empty so user knows to enter new key
        // Only set non-masked values
        const apiKey = res.config.GEMINI_API_KEY || ''
        const apiUrl = res.config.GEMINI_API_URL || ''

        // Check if API key is masked (contains "..." or is masked format)
        if (!apiKey.includes('...')) {
          setGeminiKey(apiKey)
        }
        setGeminiUrl(apiUrl)
      }
    }).catch(() => {})

    // Load registered agent from localStorage (used by Chat)
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('heracles.registeredAgentName') : null
      if (stored) setRegisteredAgentName(stored)
    } catch {}
  }, [])

  const onConnect = async () => {
    setConnectError(null)
    setConnectResult(null)
    try {
      if (!signature) throw new Error('Provide a signature from your wallet to verify')

      const messageObject = {
        action: 'registerAgent',
        name: agentName || undefined,
        capabilities: capability ? [capability] : [],
        timestamp: new Date().toISOString()
      }

      const result = await apiClient.verifySignature({ accountId, evmAddress, message: messageObject, signature })
      setConnectResult(result)
    } catch (e: any) {
      setConnectError(e.message)
    }
  }

  // Auto-fill EVM address when wallet connects
  useEffect(() => {
    if (walletAddress && !evmAddress) {
      setEvmAddress(walletAddress)
    }
  }, [walletAddress, evmAddress])

  // Helper to sign message for agent registration
  const signMessageForRegistration = async () => {
    if (!walletAddress) {
      throw new Error('Please connect your wallet first')
    }
    
    const messageObject = {
      action: 'registerAgent',
      name: agentName || undefined,
      capabilities: capability ? [capability] : [],
      timestamp: new Date().toISOString(),
      address: walletAddress,
    }

    const message = JSON.stringify(messageObject)
    const signature = await signMessageAsync({ message })
    setSignature(signature)
    return signature
  }

  return (
    <main className="min-h-screen">
      {/* Main content */}
      <div className="p-12 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Settings</h1>
          <p className="text-foreground/60">
            Configure your connection to the Hedera blockchain network and register your AI agent. You'll need a Hedera account, wallet, and Gemini API key to get started.
          </p>
        </div>

        <div className="space-y-8">
          {/* Register/Link Hedera Agent Section */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Register/Link Your Hedera Agent</h2>
              <p className="text-sm text-foreground/60">
                Connect your Hedera Agent to gain access to the Hedera network.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <input
                className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Hedera Account ID (0.0.x)"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
              <input
                className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="EVM Address (0x...)"
                value={evmAddress}
                onChange={(e) => setEvmAddress(e.target.value)}
                disabled={!!walletAddress}
              />
              <input
                className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Agent Name (Optional)"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
              <input
                className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Capability (Optional description)"
                value={capability}
                onChange={(e) => setCapability(e.target.value)}
              />
              <input
                className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Signature (will be generated when you click 'Sign & Verify')"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                readOnly
              />
            </div>

            <div className="flex gap-3">
              {!signature && walletConnected && (
                <button
                  className="px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  onClick={async () => {
                    try {
                      setConnectError(null)
                      await signMessageForRegistration()
                    } catch (e: any) {
                      setConnectError(e.message)
                    }
                  }}
                >
                  Sign & Verify
                </button>
              )}
              {signature && (
                <button
                  className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
                  onClick={onConnect}
                >
                  Verify Signature
                </button>
              )}
              {!walletConnected && (
                <div className="text-sm text-foreground/60">
                  Connect your wallet to sign messages
                </div>
              )}
              {connectResult && (
                <Link
                  href="/marketplace"
                  className="px-6 py-3 border border-border hover:bg-accent transition-colors font-medium"
                >
                  Browse Marketplace
                </Link>
              )}
            </div>

            {connectError && (
              <div className="p-4 border border-red-200 bg-red-50 text-red-800 text-sm">
                Error: {connectError}
              </div>
            )}
            {connectResult && (
              <div className="space-y-2">
                <div className="p-4 border border-green-200 bg-green-50 text-green-800 text-sm font-medium">
                  Successfully verified! Your wallet is now linked to the network.
                </div>
                <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
                  {JSON.stringify(connectResult, null, 2)}
                </pre>
              </div>
            )}
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

          {/* Gemini API Key Section */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Gemini / Generative AI</h2>
              <p className="text-sm text-foreground/60">
                Add your Gemini (Generative AI) API key so the chat agent can generate responses. The key is stored server-side and masked in the UI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <input
                className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your Gemini API key (AIza...)"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />

              <input
                className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="GEMINI_API_URL (optional, leave empty for default)"
                value={geminiUrl}
                onChange={(e) => setGeminiUrl(e.target.value)}
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
                    if (geminiKey && geminiKey.trim()) {
                      updateData.GEMINI_API_KEY = geminiKey.trim()
                    }
                    if (geminiUrl !== undefined) {
                      updateData.GEMINI_API_URL = geminiUrl.trim()
                    }
                    await apiClient.updateSettings(updateData)
                    setSettingsSaveMsg('Saved successfully!')
                  } catch (e: any) {
                    setSettingsSaveMsg('Save failed: ' + (e.message || e))
                  }
                }}
              >
                Save Gemini Settings
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