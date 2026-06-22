const { execSync } = require('child_process')

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

function buildAndSend(sessionId, questionId, mac, bitmask) {
  const macBytes = mac.split(':').map(b => parseInt(b, 16))
  const payload = Buffer.alloc(19)
  payload[0] = 0x81
  macBytes.forEach((b, i) => payload[1 + i] = b)
  payload.writeUInt16LE(sessionId, 7)
  payload.writeUInt16LE(questionId, 9)
  payload.writeUInt32LE(bitmask, 11)
  payload.writeUInt32LE(1000, 15)

  const len = payload.length
  const crcInput = Buffer.concat([Buffer.from([len]), payload])
  const crc = crc8(crcInput)
  const frame = Buffer.from([0xAA, len, ...payload, crc])
  const hex = frame.toString('hex').toUpperCase().match(/../g).join(' ')

  const cmd = `curl -s -X POST http://localhost:3001/dev/simulate -H "Content-Type: application/json" -d '{"hex":"${hex}"}'`
  const result = execSync(cmd).toString()
  console.log(`MAC ${mac} bitmask ${bitmask} → ${result.trim()}`)
}

const [,, sid, qid, mac, bitmask] = process.argv

if (!sid || !qid) {
  console.log('Usage: node crc.js <sessionId> <questionId> <mac> <bitmask>')
  console.log('Example: node crc.js 11 11 AA:BB:CC:DD:EE:01 1')
  process.exit(1)
}

buildAndSend(parseInt(sid), parseInt(qid), mac || 'AA:BB:CC:DD:EE:FF', parseInt(bitmask) || 2)