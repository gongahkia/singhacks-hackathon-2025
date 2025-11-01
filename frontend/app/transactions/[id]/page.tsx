"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { findAgentTransaction, AgentTxRecord } from '@/lib/tx-store'
import { TransactionTimeline } from '@/components/transaction-timeline'

function BlockViz({ tx }: { tx: AgentTxRecord }) {
  // Simulate last 6 blocks and place the tx into the 3rd from last
  const data = useMemo(() => {
    const seed = (tx.txHash || tx.escrowId || tx.id).slice(0, 8)
    const blocks = Array.from({ length: 6 }).map((_, i) => ({
      id: `${i}`,
      number: 1000 + i,
      hash: `0x${(Math.abs(hashCode(seed + i)) >>> 0).toString(16).slice(0, 8)}...`,
      containsTx: i === 2
    }))
    return blocks.reverse()
  }, [tx])

  return (
    <div className="space-y-3">
      <div className="text-sm text-foreground/60">Recent blocks (simulated)</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.map((b) => (
          <div key={b.id} className={`border p-3 text-xs font-mono ${b.containsTx ? 'border-green-600 bg-green-600/10' : 'border-border bg-foreground/5'}`}>
            <div className="font-semibold">Block #{b.number}</div>
            <div className="truncate">{b.hash}</div>
            {b.containsTx && (
              <div className="mt-2 text-green-700 font-semibold">Contains tx</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function hashCode(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return h
}

export default function TxDetailsPage() {
  const params = useParams<{ id: string }>()
  const [tx, setTx] = useState<AgentTxRecord | null>(null)

  useEffect(() => {
    if (!params?.id) return
    const rec = findAgentTransaction(params.id)
    setTx(rec || null)
  }, [params?.id])

  return (
    <main className="min-h-screen flex flex-col">
      <div className="p-12 max-w-5xl mx-auto w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Transaction Details</h1>
          {!tx && <p className="text-foreground/60">Transaction not found in local history.</p>}
        </div>

        {tx && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border border-border p-6 space-y-2">
                <div className="text-sm text-foreground/60">Transaction ID</div>
                <div className="font-mono text-sm break-all">{tx.txHash || tx.escrowId || tx.id}</div>
              </div>
              <div className="border border-border p-6 space-y-2">
                <div className="text-sm text-foreground/60">Status</div>
                <div className="font-semibold">{tx.status}</div>
              </div>
              <div className="border border-border p-6 space-y-2">
                <div className="text-sm text-foreground/60">Amount</div>
                <div className="font-semibold">{tx.amountHBAR} HBAR</div>
              </div>
              <div className="border border-border p-6 space-y-2">
                <div className="text-sm text-foreground/60">Recipient</div>
                <div className="font-mono text-sm">{tx.payee}</div>
              </div>
              <div className="border border-border p-6 space-y-2">
                <div className="text-sm text-foreground/60">Agent</div>
                <div className="font-semibold">{tx.sellerName || 'Unknown'}</div>
              </div>
              <div className="border border-border p-6 space-y-2">
                <div className="text-sm text-foreground/60">Timestamp</div>
                <div className="text-sm">{new Date(tx.timestamp).toLocaleString()}</div>
              </div>
            </div>

            {/* Transaction Timeline */}
            <div className="border border-border p-6 space-y-4">
              <h2 className="text-lg font-semibold">Transaction Timeline</h2>
              <TransactionTimeline transactionId={tx.txHash || tx.escrowId || tx.id} type="a2a-payment" />
            </div>

            {/* Blockchain proof */}
            <div className="border border-border p-6 space-y-4">
              <h2 className="text-lg font-semibold">Blockchain Validation</h2>
              <p className="text-sm text-foreground/60">The visualization below shows recent blocks and highlights the block containing this transaction (simulated view).</p>
              <BlockViz tx={tx} />

              {(tx.txHash || tx.escrowId) && (
                <div className="text-sm">
                  <span className="text-foreground/60">Explorer link:&nbsp;</span>
                  <a
                    className="underline"
                    href={`https://hashscan.io/#/testnet/transaction/${encodeURIComponent(tx.txHash || tx.escrowId!)}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    View on HashScan (testnet)
                  </a>
                </div>
              )}
            </div>

            {/* Description */}
            {tx.description && (
              <div className="border border-border p-6 space-y-2">
                <div className="text-sm text-foreground/60">Description</div>
                <div className="text-sm">{tx.description}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
