import { useEffect, useState } from 'react'
import { apiClient } from './lib/api-client'

type Health = { status: string; timestamp: string; network?: string; version?: string }

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
