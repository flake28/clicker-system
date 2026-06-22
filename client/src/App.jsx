import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useSocket from './hooks/useSocket.jsx'
import NavBar from './components/NavBar'
import Dashboard from './pages/Dashboard'
import Enroll from './pages/Enroll'
import SessionBuilder from './pages/SessionBuilder'
import LiveView from './pages/LiveView'
import Results from './pages/Results'

export default function App() {
  const [lastEvent, setLastEvent] = useState(null)
  const [enrollEvent, setEnrollEvent] = useState(null)

  const { connected } = useSocket((name, data) => {
    setLastEvent({ name, data })
    if (name === 'enroll:seen') setEnrollEvent(data)
  })

  return (
    <BrowserRouter>
      <NavBar connected={connected} />
      <Routes>
        <Route path="/" element={<Dashboard lastEvent={lastEvent} />} />
        <Route path="/enroll" element={<Enroll enrollEvent={enrollEvent} />} />
        <Route path="/session/new" element={<SessionBuilder />} />
        <Route path="/session/:id/live" element={<LiveView lastEvent={lastEvent} />} />
        <Route path="/session/:id/results" element={<Results />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}