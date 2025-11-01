"use client"

import { useState, useEffect } from 'react'
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

  // Wallet connection state
  const [walletType, setWalletType] = useState<'metamask' | 'walletconnect' | ''>('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)

  // Gemini settings
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiUrl, setGeminiUrl] = useState('')
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null)

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

  const connectWallet = async () => {
    setWalletError(null)
    try {
      if (!walletType) {
        throw new Error('Please select a wallet type (MetaMask or WalletConnect)')
      }

      // Simulated wallet connection logic
      const simulatedAddress = walletAddress || `0x${Math.random().toString(16).substr(2, 40)}`
      setWalletAddress(simulatedAddress)
      setWalletConnected(true)
    } catch (e: any) {
      setWalletError(e.message)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress('')
    setWalletConnected(false)
    setWalletType('')
  }

  return (
    <main className="min-h-screen">
      {/* Top navigation bar */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/heracles-icon.jpg" alt="Heracles" className="w-8 h-8 object-contain" />
            <h2 className="text-xl font-semibold">Heracles</h2>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Agent Marketplace
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Chat
            </Link>
          </div>
        </div>
      </nav>

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
                placeholder="Signature (from wallet to verify)"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors"
                onClick={onConnect}
              >
                Verify Signature
              </button>
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

          {/* Connect Crypto Wallet Section */}
          <section className="border border-border p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Connect Crypto Wallet</h2>
              <p className="text-sm text-foreground/60">
                Link your EVM-compatible wallet (MetaMask or WalletConnect) to interact with the platform.
              </p>
            </div>

            {!walletConnected ? (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Wallet Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      className={`px-4 py-3 border transition-colors ${
                        walletType === 'metamask'
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setWalletType('metamask')}
                    >
                      MetaMask
                    </button>
                    <button
                      className={`px-4 py-3 border transition-colors ${
                        walletType === 'walletconnect'
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setWalletType('walletconnect')}
                    >
                      WalletConnect
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Wallet Address (Optional - will be auto-filled on connect)</label>
                  <input
                    className="w-full px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                </div>

                <button
                  className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={connectWallet}
                  disabled={!walletType}
                >
                  Connect Wallet
                </button>

                {walletError && (
                  <div className="p-4 border border-red-200 bg-red-50 text-red-800 text-sm">
                    Error: {walletError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl">
                <div className="p-4 border border-green-200 bg-green-50 text-green-800 text-sm">
                  <div className="font-medium mb-1">Wallet Connected Successfully!</div>
                  <div className="text-xs">Type: {walletType === 'metamask' ? 'MetaMask' : 'WalletConnect'}</div>
                  <div className="text-xs font-mono mt-2">{walletAddress}</div>
                </div>

                <button
                  className="px-6 py-3 border border-border hover:bg-accent transition-colors font-medium"
                  onClick={disconnectWallet}
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}