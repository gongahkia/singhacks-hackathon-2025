"use client"

import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '../../src/lib/api-client'
import Link from 'next/link'

type ConfigSchema = {
  [key: string]: {
    type: string
    description: string
    example: string
    required: boolean
    sensitive?: boolean
  }
}

export default function SettingsPage() {
  const [schema, setSchema] = useState<ConfigSchema | null>(null)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Connect agent state
  const [accountId, setAccountId] = useState('')
  const [evmAddress, setEvmAddress] = useState('')
  const [agentName, setAgentName] = useState('')
  const [capability, setCapability] = useState('')
  const [signature, setSignature] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectResult, setConnectResult] = useState<any | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const messageObject = useMemo(() => ({
    action: 'registerAgent',
    name: agentName || undefined,
    capabilities: capability ? [capability] : [],
    timestamp: new Date().toISOString()
  }), [agentName, capability])

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const [schemaRes, configRes] = await Promise.all([
        apiClient.getSettingsSchema(),
        apiClient.getSettings(),
      ])

      setSchema(schemaRes.schema)
      setConfig(configRes.config)

      // Initialize form values with current config
      const initialValues: Record<string, string> = {}
      Object.keys(schemaRes.schema).forEach((key) => {
        initialValues[key] = configRes.config[key] || ''
      })
      setFormValues(initialValues)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Only send non-empty values
      const configToSave: Record<string, string> = {}
      Object.keys(formValues).forEach((key) => {
        if (formValues[key] && formValues[key].trim()) {
          configToSave[key] = formValues[key].trim()
        }
      })

      const result = await apiClient.updateSettings(configToSave)
      setSuccessMessage(result.message)
      setConfig(result.config)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const onConnect = async () => {
    setConnectError(null)
    setConnectResult(null)
    try {
      if (!signature) throw new Error('Provide a signature from your wallet to verify')
      const result = await apiClient.verifySignature({ accountId, evmAddress, message: messageObject, signature })
      setConnectResult(result)
    } catch (e: any) {
      setConnectError(e.message)
    }
  }

  return (
    <main className="min-h-screen">
      {/* Top navigation bar */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hedera Agent Economy</h2>
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
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="p-12 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">Settings</h1>
          <p className="text-foreground/60">
            Configure your connection to the Hedera blockchain network and register your AI agent. You'll need a Hedera account and wallet to get started.
          </p>
        </div>

        {loading ? (
          <div className="border border-border p-8">
            <p className="text-foreground/60">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Success/Error Messages */}
            {successMessage && (
              <div className="p-4 border border-green-200 bg-green-50 text-green-800 text-sm font-medium">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="p-4 border border-red-200 bg-red-50 text-red-800 text-sm">
                Error: {error}
              </div>
            )}

            {/* Settings Form */}
            <section className="border border-border p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Blockchain Configuration</h2>
                <p className="text-sm text-foreground/60">
                  Enter your Hedera account credentials and API keys. These settings allow the backend to interact with the Hedera blockchain on your behalf. Private keys are encrypted and never shown in plain text.
                </p>
              </div>

              {schema && (
                <div className="space-y-6">
                  {Object.entries(schema).map(([key, fieldSchema]) => (
                    <div key={key} className="space-y-2">
                      <label className="block">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{key}</span>
                          {fieldSchema.required && (
                            <span className="text-xs text-red-600">*required</span>
                          )}
                          {fieldSchema.sensitive && (
                            <span className="text-xs px-2 py-0.5 bg-foreground/5 border border-border">
                              sensitive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground/60 mb-2">
                          {fieldSchema.description}
                        </p>
                        <input
                          type={fieldSchema.sensitive ? 'password' : 'text'}
                          className="w-full px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                          placeholder={fieldSchema.example}
                          value={formValues[key] || ''}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                  className="px-6 py-3 border border-border hover:bg-accent transition-colors font-medium"
                  onClick={loadSettings}
                  disabled={loading}
                >
                  Reset
                </button>
              </div>
            </section>

            {/* Current Configuration Display */}
            <section className="border border-border p-8 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Current Configuration</h2>
                <p className="text-sm text-foreground/60">
                  Displaying saved configuration (sensitive values are masked)
                </p>
              </div>
              <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(config, null, 2)}
              </pre>
            </section>

            {/* Connect Agent Section */}
            <section className="border border-border p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Register Your AI Agent</h2>
                <p className="text-sm text-foreground/60">
                  To register your AI agent on the Hedera network, you need to prove you own a wallet by signing a message. This is like showing an ID - it confirms you have the private key to your wallet without revealing it. Fill in your Hedera Account ID (looks like 0.0.12345), your EVM wallet address (starts with 0x), give your agent a name, and describe what it can do. Then sign the message with your wallet and paste the signature below.
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
                  placeholder="Agent Name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
                <input
                  className="px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Capability (e.g., smart-contracts)"
                  value={capability}
                  onChange={(e) => setCapability(e.target.value)}
                />
                <textarea
                  className="md:col-span-2 px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Wallet Signature (0x...)"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Message to Sign</div>
                <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(messageObject, null, 2)}
                </pre>
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
                    Successfully verified! You're now connected to the network.
                  </div>
                  <pre className="bg-foreground/5 border border-border p-4 overflow-auto text-sm font-mono">
{JSON.stringify(connectResult, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
