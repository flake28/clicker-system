import { useEffect, useRef, useState } from 'react'

const WS_URL = 'ws://localhost:3001'

export default function useSocket(onEvent) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected')
      setConnected(true)
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected')
      setConnected(false)
    }

    ws.onmessage = (event) => {
      const { event: name, data } = JSON.parse(event.data)
      onEvent(name, data)
    }

    ws.onerror = (err) => {
      console.error('[WS] Error', err)
    }

    // Cleanup — close socket when component unmounts
    return () => ws.close()
  }, [])

  return { connected }
}