"use client"

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from './lib/api-client'
import Link from 'next/link'
import styles from './App.module.css'

type Health = { status: string; timestamp: string; network?: string; version?: string }

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Connect form state
  const [accountId, setAccountId] = useState('')
  const [evmAddress, setEvmAddress] = useState('')
  const [agentName, setAgentName] = useState('')
  const [capability, setCapability] = useState('')
  const [signature, setSignature] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectResult, setConnectResult] = useState<any | null>(null)

  useEffect(() => {
    apiClient.healthCheck().then(setHealth).catch((e: any) => setError(e.message))
  }, [])

  const messageObject = useMemo(() => ({
    action: 'registerAgent',
    name: agentName || undefined,
    capabilities: capability ? [capability] : [],
    timestamp: new Date().toISOString()
  }), [agentName, capability])

  const loadAgents = async () => {
    setError(null)
    try {
      const res = await apiClient.getAllAgents()
      setAgents(res.agents)
    } catch (e: any) {
      setError(e.message)
    }
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
    <>
      {/* Top navigation aligned with Payment/Marketplace styling */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hedera Agent Economy</h2>
          <div className="flex gap-3">
            <Link href="/payments" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">Payments</Link>
            <Link href="/marketplace" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">Agent Marketplace</Link>
          </div>
        </div>
      </nav>

      <div className={styles.container}>
        <h1 className={styles.title}>Overview</h1>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Backend Health</h2>
        {health ? (
          <pre className={styles.pre}>{JSON.stringify(health, null, 2)}</pre>
        ) : (
          <p className={styles.muted}>Loading health...</p>
        )}
        <div className={styles.buttonRow}>
          <Link href="/marketplace" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">Browse Marketplace</Link>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Agents</h2>
        <div className={styles.buttonRow}>
          <button className={styles.button} onClick={loadAgents}>Load Agents</button>
        </div>
        {error && <p className={styles.error}>Error: {error}</p>}
        {agents && <pre className={styles.pre}>{JSON.stringify(agents, null, 2)}</pre>}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Connect (Verify Signature)</h2>
        <p className={styles.muted} style={{ marginTop: -6 }}>
          Fill the fields and paste a real wallet signature. This will call{' '}
          <code className={styles.inlineCode}>/api/auth/verify-signature</code> and you should see backend logs.
        </p>
        <div className={`${styles.grid} ${styles.grid2}`} style={{ maxWidth: 720 }}>
          <input className={styles.input} placeholder="Hedera Account ID (0.0.x)" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
          <input className={styles.input} placeholder="EVM Address (0x...)" value={evmAddress} onChange={(e) => setEvmAddress(e.target.value)} />
          <input className={styles.input} placeholder="Agent Name" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          <input className={styles.input} placeholder="Capability (e.g., smart-contracts)" value={capability} onChange={(e) => setCapability(e.target.value)} />
          <textarea className={styles.textarea} placeholder="Signature (0x...)" value={signature} onChange={(e) => setSignature(e.target.value)} rows={3} />
          <div className={styles.buttonRow}>
            <button className={styles.button} onClick={onConnect}>Verify Signature</button>
            <Link href="/payments" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">Go to Payments</Link>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Message</strong>
          <pre className={styles.pre}>{JSON.stringify(messageObject, null, 2)}</pre>
        </div>
        {connectError && <p className={styles.error}>Error: {connectError}</p>}
        {connectResult && <pre className={styles.pre}>{JSON.stringify(connectResult, null, 2)}</pre>}
      </section>

      <div className={styles.footer}>
        <small>
          API base: {(() => { try { return (import.meta as any)?.env?.VITE_API_URL || '(proxy /api)' } catch { return '(proxy /api)' } })()}
        </small>
      </div>
    </>
  )
}
