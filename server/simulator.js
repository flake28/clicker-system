const readline = require('readline')
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

function buildFrame(reportType, payloadBytes) {
  const payload = Buffer.from([reportType, ...payloadBytes])
  const crcInput = Buffer.concat([Buffer.from([payload.length]), payload])
  const crc = crc8(crcInput)
  const frame = Buffer.from([0xAA, payload.length, ...payload, crc])
  return frame.toString('hex').toUpperCase().match(/../g).join(' ')
}

function send(hex) {
  try {
    const result = execSync(
      `curl -s -X POST http://localhost:3001/dev/simulate \
      -H "Content-Type: application/json" \
      -d '{"hex":"${hex}"}'`
    ).toString()
    return JSON.parse(result)
  } catch { return { error: 'server not reachable' } }
}

function get(path) {
  try { return JSON.parse(execSync(`curl -s http://localhost:3001/api${path}`).toString()) }
  catch { return null }
}

function post(path, body) {
  try {
    return JSON.parse(execSync(
      `curl -s -X POST http://localhost:3001/api${path} \
      -H "Content-Type: application/json" \
      -d '${JSON.stringify(body)}'`
    ).toString())
  } catch { return null }
}

function macFromIndex(i) {
  return `AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0').toUpperCase()}`
}

function bitmaskToButtons(bitmask) {
  return ['A','B','C','D','E','F'].filter((_, i) => bitmask & (1 << i)).join('+') || '—'
}

function buttonsToBitmask(str) {
  const map = { A:1, B:2, C:4, D:8, E:16, F:32 }
  return str.toUpperCase().split('').reduce((acc, ch) => acc | (map[ch] || 0), 0)
}

// ── State ─────────────────────────────────────────────
let sessions        = []
let currentSession  = null
let currentQuestion = null
let clickers        = []
let selectedClicker = 0
let nextIdx         = 1
let lastLog         = ''
let inputActive     = false

// ── Terminal helpers ──────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) process.stdin.setRawMode(true)

function clear() { process.stdout.write('\x1Bc') }
function pad(str, len) { return String(str).padEnd(len) }

function draw() {
  clear()
  console.log('\x1b[1m  ┌─────────────────────────────────────────────┐')
  console.log('  │         Clicker System — Simulator          │')
  console.log('  └─────────────────────────────────────────────┘\x1b[0m')

  const sName = currentSession  ? `#${currentSession.id} ${currentSession.name}` : 'none'
  const qName = currentQuestion ? `#${currentQuestion.id} ${currentQuestion.text.slice(0,30)}` : 'none'
  console.log(`\n  \x1b[36mSession :\x1b[0m ${sName}`)
  console.log(`  \x1b[36mQuestion:\x1b[0m ${qName}\n`)

  console.log('  \x1b[90m─── Clickers ────────────────────────────────\x1b[0m')
  if (clickers.length === 0) {
    console.log('  \x1b[90m  none — press N to add\x1b[0m')
  } else {
    clickers.forEach((c, i) => {
      const sel = i === selectedClicker ? '\x1b[32m▶\x1b[0m' : ' '
      const name = c.name ? `\x1b[33m${pad(c.name,12)}\x1b[0m` : '\x1b[90munnamed     \x1b[0m'
      console.log(`  ${sel} [${i+1}] ${name}  \x1b[90m${c.mac}\x1b[0m`)
    })
  }

  console.log('\n  \x1b[90m─── Controls ────────────────────────────────\x1b[0m')
  console.log('  \x1b[33mS\x1b[0m select session    \x1b[33mQ\x1b[0m select question')
  console.log('  \x1b[33mO\x1b[0m open question     \x1b[33mZ\x1b[0m close question')
  console.log('  \x1b[33mN\x1b[0m add clicker       \x1b[33mE\x1b[0m enroll selected')
  console.log('  \x1b[33m↑↓\x1b[0m pick clicker     \x1b[33mA\x1b[0m send answer (selected)')
  console.log('  \x1b[33mB\x1b[0m broadcast answer  \x1b[33mR\x1b[0m reload sessions')
  console.log('  \x1b[33mX\x1b[0m exit\n')

  if (lastLog) console.log(`  ${lastLog}\n`)
  process.stdout.write('  > ')
}

function log(msg, color = '\x1b[32m') {
  lastLog = `${color}${msg}\x1b[0m`
  draw()
}

function prompt(question, callback) {
  inputActive = true
  process.stdin.setRawMode(false)
  process.stdout.write(question)
  let input = ''
  const handler = (data) => {
    const ch = data.toString()
    if (ch === '\r' || ch === '\n') {
      process.stdin.removeListener('data', handler)
      inputActive = false
      process.stdin.setRawMode(true)
      callback(input.trim())
    } else if (ch === '\x7f') {
      input = input.slice(0, -1)
      process.stdout.write('\b \b')
    } else if (ch === '\x03') {
      console.log('\n\n  Bye.\n')
      process.exit()
    } else {
      input += ch
      process.stdout.write(ch)
    }
  }
  process.stdin.on('data', handler)
}

// ── Actions ───────────────────────────────────────────

function selectSession() {
  sessions = get('/sessions') || []
  clear()
  console.log('\n  Sessions:\n')
  sessions.slice(0, 15).forEach((s, i) => {
    console.log(`  [${i}] #${s.id} — ${s.name}`)
  })
  prompt('\n  Enter number: ', (ans) => {
    const idx = parseInt(ans)
    if (!isNaN(idx) && sessions[idx]) {
      currentSession = sessions[idx]
      const full = get(`/sessions/${currentSession.id}`)
      currentSession.questions = full?.questions || []
      currentQuestion = currentSession.questions[0] || null
      log(`✓ Session: ${currentSession.name} (${currentSession.questions.length} questions)`)
    } else {
      log('✗ Invalid selection', '\x1b[31m')
    }
    draw()
  })
}

function selectQuestion() {
  if (!currentSession?.questions?.length) return log('✗ No questions in session', '\x1b[31m')
  clear()
  console.log('\n  Questions:\n')
  currentSession.questions.forEach((q, i) => {
    console.log(`  [${i}] #${q.id} — ${q.text}`)
  })
  prompt('\n  Enter number: ', (ans) => {
    const idx = parseInt(ans)
    if (!isNaN(idx) && currentSession.questions[idx]) {
      currentQuestion = currentSession.questions[idx]
      log(`✓ Question: ${currentQuestion.text.slice(0,40)}`)
    } else {
      log('✗ Invalid selection', '\x1b[31m')
    }
    draw()
  })
}

function openQuestion() {
  if (!currentSession || !currentQuestion) return log('✗ Select session + question first', '\x1b[31m')
  const result = post(`/sessions/${currentSession.id}/questions/${currentQuestion.id}/open`, {})
  log(result?.opened ? `✓ Question opened (${currentQuestion.duration_ms/1000}s)` : '✗ Failed to open',
      result?.opened ? '\x1b[32m' : '\x1b[31m')
}

function closeQuestion() {
  if (!currentSession || !currentQuestion) return log('✗ Select session + question first', '\x1b[31m')
  const result = post(`/sessions/${currentSession.id}/questions/${currentQuestion.id}/close`, {})
  log(result?.closed ? '✓ Question closed' : '✗ Failed to close',
      result?.closed ? '\x1b[32m' : '\x1b[31m')
}

function addClicker() {
  prompt('\n  Clicker name (or Enter to skip): ', (name) => {
    const mac = macFromIndex(nextIdx++)
    clickers.push({ mac, name })
    selectedClicker = clickers.length - 1
    log(`✓ Added: ${name || mac}`)
    draw()
  })
}

function enrollSelected() {
  const c = clickers[selectedClicker]
  if (!c) return log('✗ No clicker selected', '\x1b[31m')
  const macBytes = c.mac.split(':').map(b => parseInt(b, 16))
  const hex = buildFrame(0x82, macBytes)
  const result = send(hex)
  log(result.fed ? `✓ Enroll sent: ${c.mac}` : '✗ Failed',
      result.fed ? '\x1b[32m' : '\x1b[31m')
}

function sendAnswerSelected() {
  const c = clickers[selectedClicker]
  if (!c) return log('✗ No clicker selected', '\x1b[31m')
  if (!currentSession || !currentQuestion) return log('✗ Select session + question first', '\x1b[31m')

  prompt(`\n  Buttons for ${c.name || c.mac} (e.g. A or AC or ABF): `, (ans) => {
    const bitmask = buttonsToBitmask(ans)
    if (!bitmask) return log('✗ Invalid buttons', '\x1b[31m')
    const macBytes = c.mac.split(':').map(b => parseInt(b, 16))
    const extra = Buffer.alloc(12)
    extra.writeUInt16LE(currentSession.id, 0)
    extra.writeUInt16LE(currentQuestion.id, 2)
    extra.writeUInt32LE(bitmask, 4)
    extra.writeUInt32LE(1000, 8)
    const hex = buildFrame(0x81, [...macBytes, ...extra])
    const result = send(hex)
    log(result.fed ? `✓ ${c.name || c.mac} → ${bitmaskToButtons(bitmask)}` : '✗ Failed',
        result.fed ? '\x1b[32m' : '\x1b[31m')
    draw()
  })
}

function broadcastAnswer() {
  if (clickers.length === 0) return log('✗ No clickers added', '\x1b[31m')
  if (!currentSession || !currentQuestion) return log('✗ Select session + question first', '\x1b[31m')

  prompt('\n  Buttons for ALL clickers (e.g. A or AC): ', (ans) => {
    const bitmask = buttonsToBitmask(ans)
    if (!bitmask) return log('✗ Invalid buttons', '\x1b[31m')
    let sent = 0
    clickers.forEach(c => {
      const macBytes = c.mac.split(':').map(b => parseInt(b, 16))
      const extra = Buffer.alloc(12)
      extra.writeUInt16LE(currentSession.id, 0)
      extra.writeUInt16LE(currentQuestion.id, 2)
      extra.writeUInt32LE(bitmask, 4)
      extra.writeUInt32LE(1000, 8)
      const hex = buildFrame(0x81, [...macBytes, ...extra])
      const result = send(hex)
      if (result.fed) sent++
    })
    log(`✓ Broadcast ${bitmaskToButtons(bitmask)} → ${sent}/${clickers.length} clickers`)
    draw()
  })
}

// ── Keypress ──────────────────────────────────────────
process.stdin.on('keypress', (ch, key) => {
  if (!key) return
  if (inputActive) return
  if (key.ctrl && key.name === 'c') { console.log('\n\n  Bye.\n'); process.exit() }

  switch (key.name) {
    case 'x': console.log('\n\n  Bye.\n'); process.exit(); break
    case 's': return selectSession()
    case 'q': return selectQuestion()
    case 'o': return openQuestion()
    case 'z': return closeQuestion()
    case 'n': return addClicker()
    case 'e': return enrollSelected()
    case 'a': return sendAnswerSelected()
    case 'b': return broadcastAnswer()
    case 'r':
      sessions = get('/sessions') || []
      return log(`✓ Loaded ${sessions.length} sessions`)
    case 'up':
      selectedClicker = Math.max(0, selectedClicker - 1)
      return draw()
    case 'down':
      selectedClicker = Math.min(clickers.length - 1, selectedClicker + 1)
      return draw()
  }
})

// ── Start ─────────────────────────────────────────────
sessions = get('/sessions') || []
log(`✓ Ready — ${sessions.length} sessions loaded`)