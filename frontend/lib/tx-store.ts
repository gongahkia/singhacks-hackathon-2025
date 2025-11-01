"use client"

export type AgentTxRecord = {
  id: string
  txHash?: string
  escrowId?: string
  amountHBAR: number
  payee: string
  sellerName?: string
  description?: string
  status: 'completed' | 'pending' | 'failed'
  timestamp: number
  source: 'chat' | 'dashboard'
}

const KEY = 'agent_transactions'

export function getAgentTransactions(): AgentTxRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function addAgentTransaction(tx: AgentTxRecord) {
  if (typeof window === 'undefined') return
  const list = getAgentTransactions()
  const dedup = list.filter((t) => t.id !== tx.id)
  const next = [tx, ...dedup]
  window.localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('agent-tx-added', { detail: { id: tx.id } }))
}

export function findAgentTransaction(id: string): AgentTxRecord | undefined {
  const list = getAgentTransactions()
  return list.find((t) => t.id === id)
}
