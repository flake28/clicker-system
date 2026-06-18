const { EventEmitter } = require('events')

// CRC-8 using polynomial 0x07 (most common)
function crc8(buffer) {
  let crc = 0x00
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      if (crc & 0x80) {
        crc = ((crc << 1) ^ 0x07) & 0xFF
      } else {
        crc = (crc << 1) & 0xFF
      }
    }
  }
  return crc
}

class FrameParser extends EventEmitter {
  constructor() {
    super()
    this.buffer = Buffer.alloc(0)
  }

  feed(chunk) {
    // Append incoming bytes to our internal buffer
    this.buffer = Buffer.concat([this.buffer, chunk])
    this.parse()
  }

  parse() {
    while (this.buffer.length >= 3) {
      // Find SOF byte 0xAA
      const sofIndex = this.buffer.indexOf(0xAA)

      if (sofIndex === -1) {
        // No SOF anywhere — discard entire buffer
        this.buffer = Buffer.alloc(0)
        return
      }

      if (sofIndex > 0) {
        // Garbage bytes before SOF — discard them
        this.buffer = this.buffer.slice(sofIndex)
      }

      // Need at least: SOF(1) + LEN(1) + CRC(1) = 3 bytes minimum
      if (this.buffer.length < 3) return

      const len = this.buffer[1]
      const totalFrameSize = 1 + 1 + len + 1 // SOF + LEN + PAYLOAD + CRC

      // Wait until full frame is in buffer
      if (this.buffer.length < totalFrameSize) return

      const payload = this.buffer.slice(2, 2 + len)
      const receivedCRC = this.buffer[2 + len]

      // CRC is calculated over LEN byte + PAYLOAD bytes
      const crcInput = this.buffer.slice(1, 2 + len)
      const expectedCRC = crc8(crcInput)

      if (receivedCRC !== expectedCRC) {
        // Bad frame — discard SOF byte, try to resync
        console.warn(`[FrameParser] CRC mismatch. Expected 0x${expectedCRC.toString(16)}, got 0x${receivedCRC.toString(16)}`)
        this.buffer = this.buffer.slice(1)
        continue
      }

      // Valid frame — emit it
      this.emit('frame', payload)

      // Remove consumed frame from buffer
      this.buffer = this.buffer.slice(totalFrameSize)
    }
  }
}

module.exports = FrameParser