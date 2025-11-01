export interface Agent {
  name: string
  address: string
  capabilities: string[]
  metadata: string
  trustScore: string
  registeredAt: string
  isActive: boolean
}

export interface Payment {
  escrowId: string
  payer: string
  payee: string
  amount: string
  serviceDescription: string
  status: 'Active' | 'Completed' | 'Refunded' | 'Disputed'
  createdAt: string
  completedAt: string | null
  txHash?: string
}

export interface TokenBalance {
  hbar: string
  tokenBalance: number
}

export interface x402Challenge {
  status: number
  payment: {
    network: string
    asset: string
    amount: string
    memo?: string
    payTo: string
  }
}

export interface ApiResponseError {
  error?: string
  message?: string
}

export default null as unknown as {}
