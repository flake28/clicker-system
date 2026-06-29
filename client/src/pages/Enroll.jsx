import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:3001/api'

export default function Enroll({ enrollEvent }) {
  const [students, setStudents] = useState([])
  const [enrolling, setEnrolling] = useState(false)
  const [pendingMacs, setPendingMacs] = useState([])
  const [assigning, setAssigning] = useState(null)
  const [studentName, setStudentName] = useState('')
  const enrollingRef = useRef(false)

  // ── Load existing students on mount ──────────────
  useEffect(() => {
    fetch(`${API}/students`)
      .then(r => r.json())
      .then(setStudents)
  }, [])

  // ── Handle enroll:seen WebSocket event ───────────
  useEffect(() => {
    if (!enrollEvent) return
    if (!enrollingRef.current) return
    const { mac } = enrollEvent
    if (!pendingMacs.includes(mac) && !students.find(s => s.mac === mac)) {
      setPendingMacs(prev => [...prev, mac])
    }
  }, [enrollEvent])

  // ── Start enrollment mode ─────────────────────────
  async function startEnroll() {
    await fetch(`${API}/enroll/start`, { method: 'POST' })
    setEnrolling(true)
    enrollingRef.current = true
    setPendingMacs([])
  }

  async function stopEnroll() {
    await fetch(`${API}/enroll/stop`, { method: 'POST' })
    setEnrolling(false)
    enrollingRef.current = false
    setPendingMacs([])
  }

  // ── Assign MAC to student ─────────────────────────
  async function assignStudent(mac) {
    if (!studentName.trim()) return
    const res = await fetch(`${API}/enroll/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mac, student_id: studentName.trim() })
    })
    const data = await res.json()
    setStudents(prev => {
      const exists = prev.find(s => s.mac === mac)
      if (exists) return prev.map(s => s.mac === mac ? { ...s, student_id: studentName.trim() } : s)
      return [...prev, data]
    })
    setPendingMacs(prev => prev.filter(m => m !== mac))
    setAssigning(null)
    setStudentName('')
  }

  // ── Delete student ────────────────────────────────
  async function deleteStudent(id) {
    await fetch(`${API}/students/${id}`, { method: 'DELETE' })
    setStudents(prev => prev.filter(s => s.id !== id))
  }

  const s = {
    page:     { padding: '32px 48px', maxWidth: '720px' },
    card:     { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    btn:      { padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff' },
    btnRed:   { padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff' },
    btnGhost: { padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', color: '#374151' },
    input:    { padding: '8px 12px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', width: '200px' },
    mac:      { fontFamily: 'monospace', fontSize: '13px', color: '#64748b' },
    pulse:    { width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginRight: '8px', animation: 'pulse 1.5s infinite' }
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Enroll Clickers</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Map clicker MAC addresses to student names
          </p>
        </div>
        {!enrolling ? (
          <button style={s.btn} onClick={startEnroll}>Start Enrollment</button>
        ) : (
          <button style={s.btnRed} onClick={stopEnroll}>Stop Enrollment</button>
        )}
      </div>

      {/* ── Enrollment active banner ── */}
      {enrolling && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '10px', padding: '14px 18px',
          marginBottom: '24px', fontSize: '14px', color: '#15803d'
        }}>
          <span style={s.pulse} />
          Enrollment active — have students press any button on their clicker
        </div>
      )}

      {/* ── Pending MACs (seen but not assigned) ── */}
      {pendingMacs.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Seen — not yet assigned
          </h3>
          {pendingMacs.map(mac => (
            <div key={mac} style={{ ...s.card, borderColor: '#bfdbfe', background: '#eff6ff' }}>
              <span style={s.mac}>{mac}</span>
              {assigning === mac ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    style={s.input}
                    placeholder="Student name or ID"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && assignStudent(mac)}
                    autoFocus
                  />
                  <button style={s.btn} onClick={() => assignStudent(mac)}>Save</button>
                  <button style={s.btnGhost} onClick={() => { setAssigning(null); setStudentName('') }}>Cancel</button>
                </div>
              ) : (
                <button style={s.btn} onClick={() => setAssigning(mac)}>Assign →</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Enrolled students ── */}
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Enrolled ({students.length})
      </h3>

      {students.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>No students enrolled yet.</p>
      )}

      {students.map(s2 => (
        <div key={s2.id} style={s.card}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{s2.student_id}</div>
            <div style={s.mac}>{s2.mac}</div>
          </div>
          <button
            onClick={() => deleteStudent(s2.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px', fontWeight: 600 }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}