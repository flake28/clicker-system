const EventEmitter = require('events')

// Report byte identifiers (receiver → host)
const REPORTS = {
  DEVICE_READY:      0x80,
  CLICK_RESPONSE:    0x81,
  ENROLL_SEEN:       0x82,
  ACK:               0x83,
  NACK:              0x84,
  QUESTION_TIMEOUT:  0x85,
  PONG:              0x86,
}

// Command byte identifiers (host → receiver)
const COMMANDS = {
  SESSION_START:  0x01,
  QUESTION_OPEN:  0x02,
  QUESTION_CLOSE: 0x03,
  SESSION_END:    0x04,
  ENROLL_START:   0x05,
  ENROLL_STOP:    0x06,
  PING:           0x07,
  SYNC_TIME:      0x08,
}

// CRC-8 polynomial 0x07
function crc8(buffer) {
  let crc = 0x00
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xFF : (crc << 1) & 0xFF
    }
  }
  return crc
}

function buildFrame(payload) {
  const len = payload.length
  const crcInput = Buffer.concat([Buffer.from([len]), payload])
  const crc = crc8(crcInput)
  return Buffer.from([0xAA, len, ...payload, crc])
}

class CommandSender extends EventEmitter {
  constructor() {
    super()
    this.port = null // real SerialPort instance goes here in Step 10
  }

  // Internal — write frame to port or log if stub
  _send(payload) {
    const frame = buildFrame(payload)
    if (this.port && this.port.isOpen) {
      this.port.write(frame)
    } else {
      // STUB MODE — no hardware yet
      console.log(`[CommandSender STUB] TX: ${frame.toString('hex').toUpperCase().match(/../g).join(' ')}`)
    }
  }

  setPort(port) {
    this.port = port
  }

  // ── Commands ──────────────────────────────────────────

  sessionStart(sessionId) {
    const payload = Buffer.alloc(3)
    payload[0] = COMMANDS.SESSION_START
    payload.writeUInt16LE(sessionId, 1)
    this._send(payload)
  }

  questionOpen(questionId, durationMs) {
    const payload = Buffer.alloc(7)
    payload[0] = COMMANDS.QUESTION_OPEN
    payload.writeUInt16LE(questionId, 1)
    payload.writeUInt32LE(durationMs, 3)
    this._send(payload)
  }

  questionClose() {
    this._send(Buffer.from([COMMANDS.QUESTION_CLOSE]))
  }

  sessionEnd() {
    this._send(Buffer.from([COMMANDS.SESSION_END]))
  }

  enrollStart() {
    this._send(Buffer.from([COMMANDS.ENROLL_START]))
  }

  enrollStop() {
    this._send(Buffer.from([COMMANDS.ENROLL_STOP]))
  }

  ping() {
    this._send(Buffer.from([COMMANDS.PING]))
  }

  syncTime() {
    const payload = Buffer.alloc(9)
    payload[0] = COMMANDS.SYNC_TIME
    // BigInt needed — Date.now() can exceed 32-bit integer
    payload.writeBigUInt64LE(BigInt(Date.now()), 1)
    this._send(payload)
  }
}

module.exports = { CommandSender, COMMANDS, REPORTS }