import { Link, useLocation } from 'react-router-dom'

export default function NavBar({ connected }) {
  const { pathname } = useLocation()

  const links = [
    { to: '/',             label: 'Dashboard' },
    { to: '/enroll',       label: 'Enroll' },
    { to: '/session/new',  label: 'New Session' },
  ]

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      padding: '12px 32px',
      borderBottom: '1px solid #e2e8f0',
      background: '#fff',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <span style={{ fontWeight: 700, fontSize: '15px', marginRight: '8px' }}>
        Clicker
      </span>

      {links.map(l => (
        <Link
          key={l.to}
          to={l.to}
          style={{
            textDecoration: 'none',
            fontSize: '14px',
            color: pathname === l.to ? '#3b82f6' : '#64748b',
            fontWeight: pathname === l.to ? 600 : 400,
          }}
        >
          {l.label}
        </Link>
      ))}

      <span style={{ marginLeft: 'auto', fontSize: '13px' }}>
        {connected ? '🟢 live' : '🔴 offline'}
      </span>
    </nav>
  )
}