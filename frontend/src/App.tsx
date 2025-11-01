import { useEffect, useMemo, useState } from 'react'
import { apiClient } from './lib/api-client'

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

  const messageObject = useMemo(() => ({
    action: 'registerAgent',
    name: agentName || undefined,
    capabilities: capability ? [capability] : [],
    timestamp: new Date().toISOString()
  }), [agentName, capability])

  useEffect(() => {
    apiClient.healthCheck().then(setHealth).catch((e: any) => setError(e.message))
  }, [])

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
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>Hedera Agent Economy</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Backend Health</h2>
        {health ? (
          <pre style={{ background: '#f6f8fa', padding: 12 }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : (
          <p>Loading health...</p>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Connect (Verify Signature)</h2>
        <p style={{ color: '#555', marginTop: -8 }}>Fill the fields and paste a real wallet signature. This will call <code>/api/auth/verify-signature</code> and you should see backend logs.</p>
        <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
          <input placeholder="Hedera Account ID (0.0.x)" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
          <input placeholder="EVM Address (0x...)" value={evmAddress} onChange={(e) => setEvmAddress(e.target.value)} />
          <input placeholder="Agent Name" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          <input placeholder="Capability (e.g., smart-contracts)" value={capability} onChange={(e) => setCapability(e.target.value)} />
          <textarea placeholder="Signature (0x...)" value={signature} onChange={(e) => setSignature(e.target.value)} rows={3} />
          <button onClick={onConnect}>Verify Signature</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Message</strong>
          <pre style={{ background: '#f6f8fa', padding: 12 }}>{JSON.stringify(messageObject, null, 2)}</pre>
        </div>
        {connectError && <p style={{ color: 'crimson' }}>Error: {connectError}</p>}
        {connectResult && (
          <pre style={{ background: '#f6f8fa', padding: 12 }}>
            {JSON.stringify(connectResult, null, 2)}
          </pre>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Agents</h2>
        <button onClick={loadAgents}>Load Agents</button>
        {error && (
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        )}
        {agents && (
          <pre style={{ background: '#f6f8fa', padding: 12 }}>
            {JSON.stringify(agents, null, 2)}
          </pre>
        )}
      </section>

      <small style={{ color: '#666' }}>
        API base: {import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '(proxy /api)'}
      </small>
    </div>
  )
}
