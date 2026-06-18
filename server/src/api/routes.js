const express = require('express')
const router = express.Router()
const db = require('../db/queries')

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
  // sender.ping() wired in Step 10
  res.json({ sent: true })
})

module.exports = router