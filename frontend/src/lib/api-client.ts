// Frontend API client - avoids hardcoded URLs
// Supports both Vite (VITE_API_URL) and Next.js (NEXT_PUBLIC_API_URL). Falls back to relative /api.

let VITE_API_URL = ''
try {
  VITE_API_URL = (import.meta as any)?.env?.VITE_API_URL || ''
} catch {}
const NEXT_PUBLIC_API_URL = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined
const DEFAULT_BACKEND = 'http://localhost:3001'
const BASE = (NEXT_PUBLIC_API_URL as string | undefined) || VITE_API_URL || DEFAULT_BACKEND

function url(p: string) {
  if (BASE) return `${BASE}${p}`
  return p // rely on dev proxy (/api -> backend) or same-origin Next server if configured
}

export const apiClient = {
  async healthCheck() {
    const res = await fetch(url('/api/health'))
    if (!res.ok) throw new Error('Health check failed')
    return res.json()
  },
  async getAllAgents() {
    const res = await fetch(url('/api/agents'))
    if (!res.ok) throw new Error('Failed to fetch agents')
    return res.json()
  },
  async verifySignature(params: { accountId?: string; evmAddress?: string; message: any; signature: string }) {
    const res = await fetch(url('/api/auth/verify-signature'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    // Return JSON even on 400 to show backend error details to user
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || 'Verification failed'
      throw new Error(msg)
    }
    return data
  },
  async getSettingsSchema() {
    const res = await fetch(url('/api/settings/schema'))
    if (!res.ok) throw new Error('Failed to fetch settings schema')
    return res.json()
  },
  async getSettings() {
    const res = await fetch(url('/api/settings'))
    if (!res.ok) throw new Error('Failed to fetch settings')
    return res.json()
  },
  async updateSettings(config: Record<string, string>) {
    const res = await fetch(url('/api/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = (data && (data.error || data.message)) || 'Failed to update settings'
      throw new Error(msg)
    }
    return res.json()
  }
}
