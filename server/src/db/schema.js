const Database = require('better-sqlite3')
const path = require('path')

// Database file lives at server/clicker.db
const DB_PATH = path.join(__dirname, '../../clicker.db')

const db = new Database(DB_PATH)

// WAL mode — faster writes, safer on crash
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    mac         TEXT UNIQUE NOT NULL,
    student_id  TEXT,
    enrolled_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    created_at  INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    text        TEXT,
    type        TEXT DEFAULT 'mcq',
    options     TEXT DEFAULT '["A","B","C","D","E","F"]',
    correct     TEXT,
    duration_ms INTEGER DEFAULT 30000
  );

  CREATE TABLE IF NOT EXISTS responses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id     INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    mac             TEXT NOT NULL,
    student_id      TEXT,
    answer_bitmask  INTEGER NOT NULL,
    timestamp_ms    INTEGER,
    received_at     INTEGER DEFAULT (strftime('%s','now') * 1000)
  );
`)

  db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_question_mac
  ON responses(question_id, mac);
  `)

module.exports = db