import type { Agent, Payment, TokenBalance, x402Challenge, ApiResponseError } from './types'

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL as string) || 'http://localhost:3001'

async function parseJson<T>(res: Response): Promise<T> {
  const txt = await res.text()
  try {
    return txt ? (JSON.parse(txt) as T) : ({} as T)
  } catch (err) {
    // If response isn't JSON, throw a generic error
    throw new Error(`Invalid JSON response (status=${res.status})`)
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return parseJson<T>(res)
  const body = (await parseJson<ApiResponseError>(res)) || {}
  throw new Error(body.error || body.message || `Request failed: ${res.status}`)
}

export const apiClient = {
  // ===== Health =====
  async healthCheck() {
    const res = await fetch(`${API_URL}/api/health`)
    return handleResponse<any>(res)
  },

  // ===== Auth =====
  async verifySignature(payload: {
    accountId?: string
    evmAddress?: string
    message: object
    signature: string
  }) {
    const res = await fetch(`${API_URL}/api/auth/verify-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleResponse<{ verified: boolean; recovered: string; accountId?: string }>(res)
  },

  // ===== Agents =====
  async registerAgent(name: string, capabilities: string[], metadata = '') {
    const res = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, capabilities, metadata }),
    })
    return handleResponse<{ success: boolean; txHash: string; agentAddress: string }>(res)
  },

  async getAllAgents(): Promise<{ agents: Agent[]; count: number }> {
    const res = await fetch(`${API_URL}/api/agents`)
    return handleResponse<{ agents: Agent[]; count: number }>(res)
  },

  async searchAgents(capability: string) {
    const res = await fetch(`${API_URL}/api/agents/search?capability=${encodeURIComponent(capability)}`)
    return handleResponse<{ agents: Agent[]; capability: string; count: number }>(res)
  },

  async getAgent(address: string) {
    const res = await fetch(`${API_URL}/api/agents/${address}`)
    return handleResponse<Agent>(res)
  },

  async updateCapabilities(capabilities: string[]) {
    const res = await fetch(`${API_URL}/api/agents/capabilities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capabilities }),
    })
    return handleResponse<{ success: boolean; txHash: string }>(res)
  },

  // ===== Payments (Escrow) =====
  async createPayment(payee: string, amount: string, description: string) {
    const res = await fetch(`${API_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payee, amount, description }),
    })
    return handleResponse<{ success: true; escrowId: string | number; txHash: string; amount: string }>(res)
  },

  async releasePayment(escrowId: string | number) {
    const res = await fetch(`${API_URL}/api/payments/${escrowId}/release`, { method: 'POST' })
    return handleResponse<{ success: boolean; txHash: string }>(res)
  },

  async refundPayment(escrowId: string | number) {
    const res = await fetch(`${API_URL}/api/payments/${escrowId}/refund`, { method: 'POST' })
    return handleResponse<{ success: boolean; txHash: string }>(res)
  },

  async getPayment(escrowId: string | number) {
    const res = await fetch(`${API_URL}/api/payments/${escrowId}`)
    return handleResponse<Payment>(res)
  },

  async getPayerPayments(address: string) {
    const res = await fetch(`${API_URL}/api/payments/payer/${address}`)
    return handleResponse<{ escrows: Payment[]; count: number }>(res)
  },

  // ===== Tokens =====
  async getBalances(accountId: string, tokenId: string) {
    const res = await fetch(`${API_URL}/api/tokens/${accountId}/balances/${tokenId}`)
    return handleResponse<TokenBalance>(res)
  },

  async transferToken(params: {
    tokenId: string
    fromId: string
    fromKey: string
    toId: string
    amount: number
  }) {
    const res = await fetch(`${API_URL}/api/tokens/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return handleResponse<any>(res)
  },

  // ===== x402 =====
  async x402Challenge(amountHbar: string, memo?: string) {
    const res = await fetch(`${API_URL}/api/x402/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountHbar, memo }),
    })
    // note: server may return 402 status; we still parse body
    if (res.status === 402) return parseJson<x402Challenge>(res)
    return handleResponse<x402Challenge>(res)
  },

  async x402Verify(txId: string, expectedAmount?: string, expectedPayTo?: string) {
    const res = await fetch(`${API_URL}/api/x402/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId, expectedAmount, expectedPayTo }),
    })
    return handleResponse<{ verified: boolean; tx?: any }>(res)
  },

  // ===== Messages (HCS) =====
  async createTopic(memo?: string) {
    const res = await fetch(`${API_URL}/api/messages/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo }),
    })
    return handleResponse<{ topicId: string }>(res)
  },

  async submitMessage(topicId: string, message: string) {
    const res = await fetch(`${API_URL}/api/messages/topics/${topicId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    return handleResponse<{ topicId: string; sequenceNumber: string; status: string }>(res)
  },

  async getTopicMessages(topicId: string, limit = 25) {
    const res = await fetch(`${API_URL}/api/messages/topics/${topicId}/messages?limit=${limit}`)
    return handleResponse<any>(res)
  },

  // ===== Settings =====
  async getSettings() {
    const res = await fetch(`${API_URL}/api/settings`)
    return handleResponse<{ success: boolean; config: Record<string, string> }>(res)
  },

  async updateSettings(config: Record<string, string>) {
    const res = await fetch(`${API_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    return handleResponse<{ success: boolean; message: string; config: Record<string, string> }>(res)
  },

  async getSettingsSchema() {
    const res = await fetch(`${API_URL}/api/settings/schema`)
    return handleResponse<{ success: boolean; schema: Record<string, any> }>(res)
  },
}

export default apiClient
