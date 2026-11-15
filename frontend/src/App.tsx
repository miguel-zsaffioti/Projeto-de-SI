import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface HealthResponse {
  status: string
  db: string
  timestamp?: string
  error?: string
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', db: 'unreachable' }))
  }, [])

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>OTO — Olympia Tourist System</h1>
      <h2>Módulo de Pesquisas</h2>
      {health ? (
        <p>
          API: <strong>{health.status}</strong> | DB: <strong>{health.db}</strong>
        </p>
      ) : (
        <p>Conectando à API…</p>
      )}
    </main>
  )
}
