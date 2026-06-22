import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = 'http://localhost:3001/api'
const OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F']
const COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#22c55e']

export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [responses, setResponses] = useState([])

  useEffect(() => {
    fetch(`${API}/sessions/${id}`)
      .then(r => r.json())
      .then(data => {
        setSession(data)
        setQuestions(data.questions || [])
      })

    fetch(`${API}/sessions/${id}/results`)
      .then(r => r.json())
      .then(setResponses)
  }, [id])

  // ── Per-question breakdown ────────────────────────
  function questionStats(questionId) {
    const qResponses = responses.filter(r => r.question_id === questionId)
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
    qResponses.forEach(r => {
      OPTIONS.forEach((opt, i) => {
        if (r.answer_bitmask & (1 << i)) counts[opt]++
      })
    })
    return { counts, total: qResponses.length }
  }

  const s = {
    page:    { padding: '32px 48px', maxWidth: '800px' },
    card:    { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
    btn:     { padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff' },
    btnGhost:{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', color: '#374151' },
    tag:     (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: color + '22', color })
  }

  if (!session) return <div style={{ padding: '32px' }}>Loading...</div>

  const totalStudents = [...new Set(responses.map(r => r.mac))].length

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{session.name}</h1>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {questions.length} questions · {totalStudents} students responded
          </span>
        </div>
        <button style={s.btnGhost} onClick={() => navigate('/')}>← Dashboard</button>
      </div>

      {/* ── Summary row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Questions', value: questions.length },
          { label: 'Total responses', value: responses.length },
          { label: 'Students', value: totalStudents },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Per question breakdown ── */}
      {questions.map((q, qi) => {
        const { counts, total } = questionStats(q.id)
        const correct = q.correct || []
        const maxCount = Math.max(...Object.values(counts), 1)

        return (
          <div key={q.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Q{qi + 1} · {total} responses</span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{q.duration_ms / 1000}s</span>
            </div>
            <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>{q.text}</p>

            {/* Bar chart — manual CSS bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {OPTIONS.map((opt, i) => {
                const count = counts[opt]
                const pct = Math.round((count / maxCount) * 100)
                const isCorrect = correct.includes(opt)
                const color = isCorrect ? '#22c55e' : COLORS[i]

                return (
                  <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: isCorrect ? '#dcfce7' : '#f1f5f9',
                      color: isCorrect ? '#22c55e' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, flexShrink: 0
                    }}>{opt}</span>

                    <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                        minWidth: count > 0 ? '4px' : '0'
                      }} />
                    </div>

                    <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '24px', textAlign: 'right' }}>
                      {count}
                    </span>

                    {isCorrect && <span style={s.tag('#22c55e')}>correct</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ── Raw responses table ── */}
      {responses.length > 0 && (
        <div style={s.card}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>All responses</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['Student', 'MAC', 'Question', 'Answer', 'Time'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map(r => {
                const buttons = OPTIONS.filter((_, i) => r.answer_bitmask & (1 << i)).join(', ')
                const q = questions.find(q => q.id === r.question_id)
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px' }}>{r.student_id || '—'}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{r.mac}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>Q{questions.indexOf(q) + 1}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{buttons}</td>
                    <td style={{ padding: '8px', color: '#94a3b8' }}>{r.timestamp_ms}ms</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}