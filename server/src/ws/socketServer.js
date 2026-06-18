const { WebSocketServer, WebSocket } = require('ws')

let wss = null

function init(server) {
  wss = new WebSocketServer({ server })

  wss.on('connection', (socket, req) => {
    console.log('[WS] Client connected')

    socket.on('close', () => {
      console.log('[WS] Client disconnected')
    })

    socket.on('error', (err) => {
      console.error('[WS] Error:', err.message)
    })

    // Send current server state immediately on connect
    send(socket, 'server:hello', { message: 'connected to clicker server' })
  })
}

// Send to one specific socket
function send(socket, event, data = {}) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ event, data }))
  }
}

// Broadcast to ALL connected clients
function broadcast(event, data = {}) {
  if (!wss) return
  const message = JSON.stringify({ event, data })
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

module.exports = { init, broadcast }