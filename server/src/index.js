const express = require('express')
const http = require('http')
const FrameParser = require('./serial/frameParser')
const { CommandSender, REPORTS } = require('./serial/commandSender')
const wsServer = require('./ws/socketServer')
const cors = require('cors')

const app = express()
const server = http.createServer(app)
const parser = new FrameParser()
const sender = new CommandSender()

const PORT = 3001

app.use(express.json())
app.use(cors({ origin: 'http://localhost:5173' }))
const apiRoutes = require('./api/routes')
app.use('/api', apiRoutes)

// ── Frame router ──────────────────────────────────────
// Every validated frame from the receiver lands here
parser.on('frame', (payload) => {
  const reportType = payload[0]

  switch (reportType) {
    case REPORTS.DEVICE_READY: {
      const fw = `${payload[1]}.${payload[2]}`
      console.log(`[Receiver] Device ready — fw v${fw}`)
      wsServer.broadcast('device:ready', { fw_version: fw })
      break
    }

    case REPORTS.CLICK_RESPONSE: {
      const mac = Array.from(payload.slice(1, 7))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':')
      const sessionId  = payload.readUInt16LE(7)
      const questionId = payload.readUInt16LE(9)
      const bitmask    = payload.readUInt32LE(11)
      const timestamp  = payload.readUInt32LE(15)

        const { isAccepting } = require('./state/sessionState')
        if (!isAccepting(sessionId, questionId)) {
        console.warn(`[Receiver] Response rejected — question ${questionId} not open`)
        break
        } 
      
      const student = require('./db/queries').getStudentByMac(mac)

      require('./db/queries').saveResponse(
        questionId, sessionId, mac,
        student?.student_id ?? null,
        bitmask, timestamp
      )

      wsServer.broadcast('response:received', {
        mac, student_id: student?.student_id ?? null,
        session_id: sessionId, question_id: questionId,
        answer_bitmask: bitmask, timestamp_ms: timestamp
      })
      console.log(`[Receiver] Response — ${mac} → bitmask 0x${bitmask.toString(16)}`)
      break
    }

    case REPORTS.ENROLL_SEEN: {
      const mac = Array.from(payload.slice(1, 7))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(':')
      console.log(`[Receiver] Enroll seen — ${mac}`)
      wsServer.broadcast('enroll:seen', { mac })
      break
    }

    case REPORTS.ACK:
      console.log(`[Receiver] ACK 0x${payload[1].toString(16)}`)
      wsServer.broadcast('device:ack', { cmd: payload[1] })
      break

    case REPORTS.NACK:
      console.log(`[Receiver] NACK 0x${payload[1].toString(16)}`)
      wsServer.broadcast('device:nack', { cmd: payload[1], error: payload[2] })
      break

    case REPORTS.QUESTION_TIMEOUT: {
      const qId = payload.readUInt16LE(1)
      console.log(`[Receiver] Question ${qId} timed out`)
      wsServer.broadcast('question:timeout', { question_id: qId })
      break
    }

    case REPORTS.PONG: {
      const uptime = payload.readUInt32LE(1)
      console.log(`[Receiver] PONG — uptime ${uptime}ms`)
      wsServer.broadcast('device:pong', { uptime_ms: uptime })
      break
    }

    default:
      console.warn(`[Receiver] Unknown report 0x${reportType.toString(16)}`)
  }
})

// ── Health route ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// ── Test route — simulate receiver sending a frame ────
app.post('/dev/simulate', (req, res) => {
  const { hex } = req.body
  if (!hex) return res.status(400).json({ error: 'provide hex string' })
  const bytes = Buffer.from(hex.replace(/\s/g, ''), 'hex')
  parser.feed(bytes)
  res.json({ fed: bytes.length, bytes: hex })
})

// ── Test route — fire a stub command ─────────────────
app.post('/dev/command', (req, res) => {
  const { cmd } = req.body
  switch (cmd) {
    case 'ping':           sender.ping(); break
    case 'syncTime':       sender.syncTime(); break
    case 'enrollStart':    sender.enrollStart(); break
    case 'enrollStop':     sender.enrollStop(); break
    case 'sessionStart':   sender.sessionStart(req.body.sessionId || 1); break
    case 'questionOpen':   sender.questionOpen(req.body.questionId || 1, req.body.durationMs || 30000); break
    case 'questionClose':  sender.questionClose(); break
    case 'sessionEnd':     sender.sessionEnd(); break
    default: return res.status(400).json({ error: `unknown command: ${cmd}` })
  }
  res.json({ sent: cmd })
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

wsServer.init(server)

module.exports = { app, server, parser, sender }