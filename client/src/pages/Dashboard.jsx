export default function Dashboard({ lastEvent }) {
  return <div style={{ padding: '32px' }}>
    <h1>Dashboard</h1>
    <pre>{lastEvent ? JSON.stringify(lastEvent, null, 2) : 'No events yet'}</pre>
  </div>
}