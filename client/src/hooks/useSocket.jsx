import { useEffect, useRef, useState } from 'react'

const WS_URL = 'ws://localhost:3001'

export default function useSocket(onEvent) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let reconnectTimer = null

    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected')
        setConnected(true)
      }

      ws.onclose = () => {
        console.log('[WS] Disconnected')
        setConnected(false)
        reconnectTimer = setTimeout(connect, 2000)
      }

      ws.onmessage = (event) => {
        const { event: name, data } = JSON.parse(event.data)
        onEventRef.current(name, data)
      }

      ws.onerror = (err) => {
        console.error('[WS] Error', err)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return { connected }
}