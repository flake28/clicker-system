import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:3001/api'

export default function Dashboard({ lastEvent }) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [deviceState, setDeviceState] = useState(null)

  useEffect(() => {
    fetch(`${API}/sessions`)
      .then(r => r.json())
      .then(setSessions)

    fetch(`${API}/device/status`)
      .then(r => r.json())
      .then(setDeviceState)
  }, [])

  async function deleteSession(id) {
    if (!window.confirm('Delete this session and all its data?')) return
    await fetch(`${API}/sessions/${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  function formatDate(ms) {
    return new Date(ms).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const s = {
    page:     { padding: '32px 48px', maxWidth: '860px' },
    card:     { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    btn:      { padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff' },
    btnGhost: { padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', color: '#374151' },
    btnRed:   { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px', fontWeight: 600 },
  }

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Dashboard</h1>
        <button style={s.btn} onClick={() => navigate('/session/new')}>+ New Session</button>
      </div>

      {/* ── Device status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Receiver</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>
            {deviceState?.connected ? '🟢 Connected' : '🔴 Not connected'}
          </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Total sessions</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{sessions.length}</div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Last event</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>
            {lastEvent ? lastEvent.name : '—'}
          </div>
        </div>
      </div>

      {/* ── Sessions list ── */}
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
        Sessions
      </h2>

      {sessions.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>No sessions yet. Create one to get started.</p>
      )}

      {sessions.map(session => (
        <div key={session.id} style={s.card}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{session.name}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              #{session.id} · {formatDate(session.created_at)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={s.btnGhost} onClick={() => navigate(`/session/${session.id}/live`)}>
              Go Live
            </button>
            <button style={s.btnGhost} onClick={() => navigate(`/session/${session.id}/results`)}>
              Results
            </button>
            <button style={s.btnRed} onClick={() => deleteSession(session.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}

    </div>
  )
}