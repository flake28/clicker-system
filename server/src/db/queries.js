const db = require('./schema')
const database = require('./schema')

// ── Students ──────────────────────────────────────────

function enrollStudent(mac, studentId) {
  const stmt = db.prepare(`
    INSERT INTO students (mac, student_id)
    VALUES (?, ?)
    ON CONFLICT(mac) DO UPDATE SET student_id = excluded.student_id
  `)
  return stmt.run(mac, studentId)
}

function getStudentByMac(mac) {
  return db.prepare('SELECT * FROM students WHERE mac = ?').get(mac)
}

function getAllStudents() {
  return db.prepare('SELECT * FROM students ORDER BY student_id').all()
}

function deleteStudent(id) {
  return db.prepare('DELETE FROM students WHERE id = ?').run(id)
}

// ── Sessions ──────────────────────────────────────────

function createSession(name) {
  const stmt = db.prepare('INSERT INTO sessions (name) VALUES (?)')
  return stmt.run(name)
}

function getAllSessions() {
  return db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all()
}

function getSession(id) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)
}

function deleteSession(id) {
  return db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

// ── Questions ─────────────────────────────────────────

function addQuestion(sessionId, position, text, type, options, correct, durationMs) {
  const stmt = db.prepare(`
    INSERT INTO questions (session_id, position, text, type, options, correct, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  return stmt.run(
    sessionId, position, text, type,
    JSON.stringify(options),
    JSON.stringify(correct),
    durationMs
  )
}

function getQuestions(sessionId) {
  const rows = db.prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY position').all(sessionId)
  return rows.map(q => ({
    ...q,
    options: JSON.parse(q.options),
    correct: JSON.parse(q.correct)
  }))
}

function updateQuestion(id, fields) {
  const { text, type, options, correct, duration_ms } = fields
  return db.prepare(`
    UPDATE questions SET
      text = COALESCE(?, text),
      type = COALESCE(?, type),
      options = COALESCE(?, options),
      correct = COALESCE(?, correct),
      duration_ms = COALESCE(?, duration_ms)
    WHERE id = ?
  `).run(text, type, options ? JSON.stringify(options) : null, correct ? JSON.stringify(correct) : null, duration_ms, id)
}

// ── Responses ─────────────────────────────────────────

function saveResponse(questionId, sessionId, mac, studentId, answerBitmask, timestampMs) {
  return database.prepare(`
    INSERT INTO responses (question_id, session_id, mac, student_id, answer_bitmask, timestamp_ms)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(question_id, mac) DO UPDATE SET
      answer_bitmask = excluded.answer_bitmask,
      timestamp_ms   = excluded.timestamp_ms,
      received_at    = (strftime('%s','now') * 1000)
  `).run(questionId, sessionId, mac, studentId, answerBitmask, timestampMs)
}

function getResponsesForQuestion(questionId) {
  return database.prepare(`
    SELECT r.*, s.student_id as student_name
    FROM responses r
    LEFT JOIN students s ON r.mac = s.mac
    WHERE r.question_id = ?
  `).all(questionId)
}

function getResponsesForSession(sessionId) {
  return database.prepare(`
    SELECT r.*, s.student_id as student_name
    FROM responses r
    LEFT JOIN students s ON r.mac = s.mac
    WHERE r.session_id = ?
    ORDER BY r.received_at
  `).all(sessionId)
}

function getResponsesForStudent(studentId) {
  return db.prepare('SELECT * FROM responses WHERE student_id = ? ORDER BY received_at DESC').all(studentId)
}

module.exports = {
  enrollStudent, getStudentByMac, getAllStudents, deleteStudent,
  createSession, getAllSessions, getSession, deleteSession,
  addQuestion, getQuestions, updateQuestion,
  saveResponse, getResponsesForQuestion, getResponsesForSession, getResponsesForStudent
}