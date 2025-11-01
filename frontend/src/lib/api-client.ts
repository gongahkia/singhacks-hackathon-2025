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
  },

  // Phase 2: Transaction endpoints
  async prepareTransaction(params: { to: string; data: string; value?: string; from?: string }) {
    const res = await fetch(url('/api/transactions/prepare'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = (data && (data.error || data.message)) || 'Failed to prepare transaction'
      throw new Error(msg)
    }
    return res.json()
  },

  async sendSignedTransaction(signedTx: string) {
    const res = await fetch(url('/api/transactions/send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTx })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = (data && (data.error || data.message)) || 'Failed to send transaction'
      throw new Error(msg)
    }
    return res.json()
  },

  // Phase 2: Register agent with signed transaction
  async registerAgentWithSignedTx(params: { name: string; capabilities: string[]; metadata?: string; signedTx: string }) {
    const res = await fetch(url('/api/agents'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, signedTx: params.signedTx })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = (data && (data.error || data.message)) || 'Failed to register agent'
      throw new Error(msg)
    }
    return res.json()
  },

  // Phase 2: Create payment escrow with signed transaction
  async createEscrowWithSignedTx(params: { payee: string; amount: number; description: string; signedTx: string; expirationDays?: number }) {
    const res = await fetch(url('/api/payments'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, signedTx: params.signedTx })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = (data && (data.error || data.message)) || 'Failed to create escrow'
      throw new Error(msg)
    }
    return res.json()
  }
}
