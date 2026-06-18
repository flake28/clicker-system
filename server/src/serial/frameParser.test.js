const FrameParser = require('./frameParser')

// Same CRC8 function — recalculated here to verify independently
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

function buildFrame(payload) {
  const len = payload.length
  const crcInput = Buffer.concat([Buffer.from([len]), payload])
  const crc = crc8(crcInput)
  return Buffer.from([0xAA, len, ...payload, crc])
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

console.log('\n[FrameParser Tests]\n')

// Test 1 — single valid frame
test('emits a single valid frame', () => {
  const parser = new FrameParser()
  const frames = []
  parser.on('frame', f => frames.push(f))

  const payload = Buffer.from([0x80, 0x01, 0x00])
  parser.feed(buildFrame(payload))

  assert(frames.length === 1, `expected 1 frame, got ${frames.length}`)
  assert(frames[0].equals(payload), 'payload mismatch')
})

// Test 2 — two frames fed at once
test('emits two frames from one chunk', () => {
  const parser = new FrameParser()
  const frames = []
  parser.on('frame', f => frames.push(f))

  const p1 = Buffer.from([0x81, 0x02])
  const p2 = Buffer.from([0x83, 0x01])
  const combined = Buffer.concat([buildFrame(p1), buildFrame(p2)])
  parser.feed(combined)

  assert(frames.length === 2, `expected 2 frames, got ${frames.length}`)
  assert(frames[0].equals(p1), 'first payload mismatch')
  assert(frames[1].equals(p2), 'second payload mismatch')
})

// Test 3 — frame split across two chunks
test('handles frame split across chunks', () => {
  const parser = new FrameParser()
  const frames = []
  parser.on('frame', f => frames.push(f))

  const payload = Buffer.from([0x81, 0xAA, 0xBB])
  const frame = buildFrame(payload)

  // Feed first half, then second half
  parser.feed(frame.slice(0, 3))
  assert(frames.length === 0, 'should not emit before full frame')
  parser.feed(frame.slice(3))
  assert(frames.length === 1, 'should emit after full frame received')
  assert(frames[0].equals(payload), 'payload mismatch')
})

// Test 4 — garbage bytes before SOF
test('discards garbage before SOF', () => {
  const parser = new FrameParser()
  const frames = []
  parser.on('frame', f => frames.push(f))

  const payload = Buffer.from([0x80, 0x00])
  const garbage = Buffer.from([0x00, 0x11, 0xFF])
  const frame = buildFrame(payload)

  parser.feed(Buffer.concat([garbage, frame]))
  assert(frames.length === 1, `expected 1 frame, got ${frames.length}`)
  assert(frames[0].equals(payload), 'payload mismatch')
})

// Test 5 — bad CRC discarded
test('discards frame with bad CRC', () => {
  const parser = new FrameParser()
  const frames = []
  parser.on('frame', f => frames.push(f))

  const payload = Buffer.from([0x80, 0x00])
  const frame = buildFrame(payload)

  // Corrupt the CRC byte (last byte)
  frame[frame.length - 1] ^= 0xFF

  parser.feed(frame)
  assert(frames.length === 0, 'should not emit frame with bad CRC')
})

console.log(`\n${passed} passed, ${failed} failed\n`)