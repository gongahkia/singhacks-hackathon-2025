"use client"

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    loadSettings()
  }, [])

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
            Configure your environment variables for the Hedera Agent Economy backend
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
                <h2 className="text-lg font-semibold mb-2">Configuration</h2>
                <p className="text-sm text-foreground/60">
                  Enter your configuration values below. Sensitive values (like private keys) will be
                  masked in the display.
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
          </div>
        )}
      </div>
    </main>
  )
}
