// Frontend API client - avoids hardcoded URLs
// Uses relative /api paths with Vite proxy in dev, or VITE_API_URL when provided

const API_URL = import.meta.env.VITE_API_URL || ''

function url(p: string) {
  if (API_URL) return `${API_URL}${p}`
  return p // rely on dev proxy (/api -> backend)
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
  }
}
