import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:3001/api'

export default function SessionBuilder() {
  const navigate = useNavigate()

  const [sessionName, setSessionName] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [adding, setAdding] = useState(false)

  const [qText, setQText] = useState('')
  const [qType, setQType] = useState('mcq')
  const [qDuration, setQDuration] = useState(30)
  const [qCorrect, setQCorrect] = useState([])

  const OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

  // ── Create session ────────────────────────────────
  async function createSession() {
    if (!sessionName.trim()) return
    const res = await fetch(`${API}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sessionName })
    })
    const data = await res.json()
    setSessionId(data.id)
  }

  // ── Add question ──────────────────────────────────
  async function addQuestion() {
    if (!qText.trim()) return
    const res = await fetch(`${API}/sessions/${sessionId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        position: questions.length + 1,
        text: qText,
        type: qType,
        options: OPTIONS,
        correct: qCorrect,
        duration_ms: qDuration * 1000
      })
    })
    const data = await res.json()
    setQuestions(prev => [...prev, {
      id: data.id,
      text: qText,
      type: qType,
      duration_ms: qDuration * 1000,
      correct: qCorrect
    }])
    setQText('')
    setQCorrect([])
    setAdding(false)
  }

  async function removeQuestion(questionId, index) {
  await fetch(`${API}/questions/${questionId}`, { method: 'DELETE' })
  setQuestions(prev => prev.filter((_, i) => i !== index))
}

  // ── Toggle correct answer ─────────────────────────
  function toggleCorrect(opt) {
    setQCorrect(prev =>
      prev.includes(opt)
        ? prev.filter(o => o !== opt)
        : [...prev, opt]
    )
  }

  // ── Styles ────────────────────────────────────────
  const s = {
    page:    { padding: '32px 48px', maxWidth: '720px' },
    label:   { fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' },
    input:   { width: '100%', padding: '9px 12px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', marginBottom: '16px' },
    btn:     { padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff' },
    btnGhost:{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', color: '#374151' },
    card:    { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', marginBottom: '12px' },
    row:     { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' },
    optBtn:  (active) => ({
      width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
      background: active ? '#eff6ff' : '#fff', color: active ? '#3b82f6' : '#94a3b8',
      fontWeight: 700, fontSize: '13px', cursor: 'pointer'
    })
  }

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '28px' }}>Session Builder</h1>

      {/* ── Step 1: Name the session ── */}
      {!sessionId ? (
        <div>
          <label style={s.label}>Session name</label>
          <input
            style={s.input}
            placeholder="e.g. Class 6A — June 19"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSession()}
          />
          <button style={s.btn} onClick={createSession}>Create Session</button>
        </div>

      ) : (
        /* ── Step 2: Add questions ── */
        <div>
          <div style={{ ...s.card, background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600 }}>
              Session #{sessionId} — {sessionName}
            </span>
          </div>

          {/* Question list */}
          {questions.map((q, i) => (
            <div key={q.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Q{i + 1} · {q.type} · {q.duration_ms / 1000}s</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {q.correct.length > 0 &&
                    <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ {q.correct.join(', ')}</span>
                  }
                  <button
                    onClick={() => removeQuestion(q.id, i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p style={{ marginTop: '6px', fontSize: '15px' }}>{q.text}</p>
            </div>
          ))}

          {/* Add question form */}
          {adding ? (
            <div style={{ ...s.card, borderColor: '#bfdbfe' }}>
              <label style={s.label}>Question text</label>
              <input
                style={s.input}
                placeholder="Type your question..."
                value={qText}
                onChange={e => setQText(e.target.value)}
                autoFocus
              />

              <div style={s.row}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Type</label>
                  <select
                    style={{ ...s.input, marginBottom: 0 }}
                    value={qType}
                    onChange={e => setQType(e.target.value)}
                  >
                    <option value="mcq">MCQ (single)</option>
                    <option value="multi">Multi-select</option>
                    <option value="tf">True / False</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Timer (seconds)</label>
                  <input
                    style={{ ...s.input, marginBottom: 0 }}
                    type="number"
                    min={5} max={300}
                    value={qDuration}
                    onChange={e => setQDuration(Number(e.target.value))}
                  />
                </div>
              </div>

              <label style={{ ...s.label, marginTop: '8px' }}>Correct answer(s) — tap to mark</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {OPTIONS.map(o => (
                  <button
                    key={o}
                    style={s.optBtn(qCorrect.includes(o))}
                    onClick={() => toggleCorrect(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={s.btn} onClick={addQuestion}>Add Question</button>
                <button style={s.btnGhost} onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button style={s.btnGhost} onClick={() => setAdding(true)}>
              + Add Question
            </button>
          )}

          {/* Go live */}
          {questions.length > 0 && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <button
                style={{ ...s.btn, background: '#22c55e', padding: '12px 28px', fontSize: '15px' }}
                onClick={() => navigate(`/session/${sessionId}/live`)}
              >
                Go Live →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}