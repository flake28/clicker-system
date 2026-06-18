import { useState } from 'react'
import useSocket from './hooks/useSocket.jsx'

export default function App() {
  const [events, setEvents] = useState([])

  const { connected } = useSocket((name, data) => {
    setEvents(prev => [...prev, { name, data, time: Date.now() }])
  })

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Clicker System</h1>
      <p>Server: <strong>{connected ? '🟢 connected' : '🔴 disconnected'}</strong></p>

      <h2>Live events</h2>
      {events.length === 0 && <p>No events yet.</p>}
      {events.map((e, i) => (
        <div key={i} style={{ 
          fontFamily: 'monospace', 
          fontSize: '13px',
          padding: '6px 10px',
          marginBottom: '4px',
          background: '#f4f4f4',
          borderRadius: '4px'
        }}>
          <strong>{e.name}</strong> — {JSON.stringify(e.data)}
        </div>
      ))}
    </div>
  )
}