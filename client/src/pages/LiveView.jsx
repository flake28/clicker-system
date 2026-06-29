import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const API = 'http://localhost:3001/api'
const OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F']
const COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#22c55e']

export default function LiveView({ lastEvent }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [responses, setResponses] = useState({})
  const [open, setOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [enrolledMacs, setEnrolledMacs] = useState(new Set())
  const timerRef = useRef(null)

  // ── Load session and enrolled students on mount ───
  useEffect(() => {
    fetch(`${API}/sessions/${id}`)
      .then(r => r.json())
      .then(data => {
        setSession(data)
        setQuestions(data.questions || [])
      })

    fetch(`${API}/students`)
      .then(r => r.json())
      .then(data => setEnrolledMacs(new Set(data.map(s => s.mac))))
  }, [id])

  // ── Handle incoming WebSocket events ─────────────
  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.name === 'response:received') {
      const { mac, answer_bitmask, question_id } = lastEvent.data
      if (question_id === questions[currentQ]?.id) {
        setResponses(prev => ({ ...prev, [mac]: answer_bitmask }))
      }
    }
    if (lastEvent.name === 'question:timeout') {
      clearInterval(timerRef.current)
      setOpen(false)
      setTimeLeft(0)
    }
  }, [lastEvent])

  // ── Timer ─────────────────────────────────────────
  function startTimer(seconds) {
    setTimeLeft(seconds)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setOpen(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── Open question ─────────────────────────────────
  async function openQuestion() {
    const q = questions[currentQ]
    if (!q) return
    setResponses({})
    setOpen(true)
    startTimer(q.duration_ms / 1000)
    await fetch(`${API}/sessions/${id}/questions/${q.id}/open`, { method: 'POST' })
  }

  // ── Close question ────────────────────────────────
  async function closeQuestion() {
    clearInterval(timerRef.current)
    setOpen(false)
    setTimeLeft(0)
    const q = questions[currentQ]
    await fetch(`${API}/sessions/${id}/questions/${q.id}/close`, { method: 'POST' })
  }

  // ── Next question ─────────────────────────────────
  function nextQuestion() {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
      setResponses({})
      setOpen(false)
    } else {
      navigate(`/session/${id}/results`)
    }
  }

  // ── Build chart data ──────────────────────────────
  function chartData() {
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
    Object.values(responses).forEach(bitmask => {
      OPTIONS.forEach((opt, i) => {
        if (bitmask & (1 << i)) counts[opt]++
      })
    })
    return OPTIONS.map(opt => ({ option: opt, count: counts[opt] }))
  }

  const q = questions[currentQ]
  const totalResponses = Object.keys(responses).length
  const unassignedCount = Object.keys(responses).filter(mac => !enrolledMacs.has(mac)).length

  if (!session) return <div style={{ padding: '32px' }}>Loading...</div>

  const s = {
    page:     { padding: '32px 48px', maxWidth: '800px' },
    card:     { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
    btn:      { padding: '10px 20px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff' },
    btnRed:   { padding: '10px 20px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff' },
    btnGhost: { padding: '10px 20px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', color: '#374151' },
  }

  return (
    <div style={s.page}>

      {/* ── Session header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>{session.name}</h1>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Question {currentQ + 1} of {questions.length}
          </span>
        </div>
        <button style={s.btnGhost} onClick={() => navigate(`/session/${id}/results`)}>
          End Session →
        </button>
      </div>

      {/* ── Question card ── */}
      {q && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: 600, flex: 1 }}>{q.text}</p>
            {open && (
              <div style={{
                fontSize: '28px', fontWeight: 700,
                color: timeLeft <= 10 ? '#ef4444' : '#3b82f6',
                minWidth: '60px', textAlign: 'right'
              }}>
                {timeLeft}s
              </div>
            )}
          </div>

          {/* Response count */}
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>{totalResponses} response{totalResponses !== 1 ? 's' : ''} received</span>
            {unassignedCount > 0 && (
              <span style={{
                color: '#f59e0b', fontWeight: 600, fontSize: '13px',
                background: '#fffbeb', padding: '2px 8px',
                borderRadius: '20px', border: '1px solid #fde68a'
              }}>
                ⚠ {unassignedCount} unassigned
              </span>
            )}
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="option" tick={{ fontSize: 13 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData().map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            {!open ? (
              <button style={s.btn} onClick={openQuestion}>
                {totalResponses > 0 ? 'Reopen' : 'Open Question'}
              </button>
            ) : (
              <button style={s.btnRed} onClick={closeQuestion}>Close Question</button>
            )}
            <button style={s.btnGhost} onClick={nextQuestion}>
              {currentQ < questions.length - 1 ? 'Next Question →' : 'See Results →'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}