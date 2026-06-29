const express = require('express')
const router = express.Router()
const db = require('../db/queries')
const database = require('../db/schema')
const sessionState = require('../state/sessionState')

// ── Students ──────────────────────────────────────────

router.get('/students', (req, res) => {
  const students = db.getAllStudents()
  res.json(students)
})

router.post('/enroll/assign', (req, res) => {
  const { mac, student_id } = req.body
  if (!mac || !student_id) {
    return res.status(400).json({ error: 'mac and student_id required' })
  }
  const result = db.enrollStudent(mac, student_id)
  res.json({ id: result.lastInsertRowid, mac, student_id })
})

router.post('/enroll/start', (req, res) => {
  const wsServer = require('../ws/socketServer')
  wsServer.broadcast('enroll:started', {})
  res.json({ enrolling: true })
})

router.post('/enroll/stop', (req, res) => {
  const wsServer = require('../ws/socketServer')
  wsServer.broadcast('enroll:stopped', {})
  res.json({ enrolling: false })
})

router.delete('/students/:id', (req, res) => {
  db.deleteStudent(req.params.id)
  res.json({ deleted: true })
})

// ── Sessions ──────────────────────────────────────────

router.get('/sessions', (req, res) => {
  res.json(db.getAllSessions())
})

router.post('/sessions', (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const result = db.createSession(name)
  res.json({ id: result.lastInsertRowid, name })
})

router.get('/sessions/:id', (req, res) => {
  const session = db.getSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'session not found' })
  const questions = db.getQuestions(req.params.id)
  res.json({ ...session, questions })
})

router.delete('/sessions/:id', (req, res) => {
  db.deleteSession(req.params.id)
  res.json({ deleted: true })
})

router.delete('/responses/:id', (req, res) => {
  database.prepare('DELETE FROM responses WHERE id = ?').run(req.params.id)
  res.json({ deleted: true })
})

// ── Questions ─────────────────────────────────────────

router.post('/sessions/:id/questions', (req, res) => {
  const { position, text, type, options, correct, duration_ms } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  const result = db.addQuestion(
    req.params.id,
    position ?? 0,
    text,
    type ?? 'mcq',
    options ?? ['A', 'B', 'C', 'D', 'E', 'F'],
    correct ?? [],
    duration_ms ?? 30000
  )
  res.json({ id: result.lastInsertRowid })
})

router.patch('/questions/:id', (req, res) => {
  db.updateQuestion(req.params.id, req.body)
  res.json({ updated: true })
})

router.get('/sessions/:id/questions', (req, res) => {
  res.json(db.getQuestions(req.params.id))
})

router.delete('/questions/:id', (req, res) => {
  database.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id)
  res.json({ deleted: true })
})

// ── Question open/close ───────────────────────────────

router.post('/sessions/:id/questions/:qid/open', (req, res) => {
  const sessionId  = parseInt(req.params.id)
  const questionId = parseInt(req.params.qid)

  const q = database.prepare('SELECT * FROM questions WHERE id = ?').get(questionId)
  if (!q) return res.status(404).json({ error: 'question not found' })

  const wsServer = require('../ws/socketServer')

  sessionState.openQuestion(sessionId, questionId, q.duration_ms, (qid) => {
    wsServer.broadcast('question:timeout', { question_id: qid })
    console.log(`[State] Question ${qid} timed out`)
  })

  wsServer.broadcast('question:opened', {
    session_id: sessionId,
    question_id: questionId,
    duration_ms: q.duration_ms
  })
  res.json({ opened: true, duration_ms: q.duration_ms })
})

router.post('/sessions/:id/questions/:qid/close', (req, res) => {
  const wsServer = require('../ws/socketServer')
  sessionState.closeQuestion()
  wsServer.broadcast('question:closed', { question_id: parseInt(req.params.qid) })
  res.json({ closed: true })
})

router.get('/device/state', (req, res) => {
  res.json(sessionState.getState())
})

// ── Results ───────────────────────────────────────────

router.get('/sessions/:id/results', (req, res) => {
  res.json(db.getResponsesForSession(req.params.id))
})

router.get('/questions/:id/results', (req, res) => {
  res.json(db.getResponsesForQuestion(req.params.id))
})

router.get('/students/:id/results', (req, res) => {
  res.json(db.getResponsesForStudent(req.params.id))
})

// ── Device ────────────────────────────────────────────

router.get('/device/status', (req, res) => {
  res.json({ connected: false, port: null, fw_version: null })
})

router.post('/device/ping', (req, res) => {
  res.json({ sent: true })
})

module.exports = router