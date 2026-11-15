import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', db: 'unreachable' }))
  }, [])

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>OTO — Olympia Tourist System</h1>
      <h2>Módulo de Pesquisas</h2>
      {health ? (
        <p>
          API: <strong>{health.status}</strong> | DB:{' '}
          <strong>{health.db}</strong>
        </p>
      ) : (
        <p>Conectando à API…</p>
      )}
    </main>
  )
}
