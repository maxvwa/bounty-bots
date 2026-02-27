import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

function App() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => {
        if (res.ok) setBackendStatus('online')
        else setBackendStatus('offline')
      })
      .catch(() => setBackendStatus('offline'))
  }, [])

  return (
    <div className="app">
      <h1>Bounty Bots</h1>
      <p>FastAPI + Postgres + React Vite scaffolding is ready.</p>
      <p>
        Backend: <span className={`status ${backendStatus}`}>{backendStatus}</span>
      </p>
      <p className="hint">
        API: <code>{API_BASE_URL}</code>
      </p>
    </div>
  )
}

export default App
