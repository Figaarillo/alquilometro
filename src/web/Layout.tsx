import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { MobileTabbar } from './components/MobileTabbar'
import { QuickInboxDialog } from './features/inbox/QuickInboxDialog'
import { NewPropertyDialog } from './features/properties/NewPropertyDialog'
import { QuickVisitDialog } from './features/visits/QuickVisitDialog'
import { useAuth } from './features/auth/AuthGate'
import { useVisits } from './hooks'
import { visitRange } from './lib/format'

const NAV: [string, string][] = [
  ['/', 'Ranking'],
  ['/pendientes', 'Pendientes'],
  ['/mapa', 'Mapa'],
  ['/procesos', 'Procesos'],
  ['/visitas', 'Visitas'],
  ['/mensajes', 'Mensajes'],
  ['/checklist', 'Checklist'],
  ['/compartidos', 'Compartidos'],
  ['/ajustes', 'Ajustes'],
]

export function Layout() {
  const [quickVisit, setQuickVisit] = useState(false)
  const [newProperty, setNewProperty] = useState(false)
  const [quickInbox, setQuickInbox] = useState(false)
  const visits = useVisits()
  const auth = useAuth()
  const next = visits.data?.find((v) => !v.done && new Date(v.endAt ?? v.scheduledAt).getTime() > Date.now() - 3_600_000)

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          🏠 Alquilómetro
        </Link>
        <nav className="desktop-nav">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="top-actions desktop-only">
          {auth.authRequired && (
            <button className="ghost" onClick={() => void auth.logout()} title="Cerrar sesión">
              Salir
            </button>
          )}
          <button onClick={() => setQuickInbox(true)}>+ Pendiente</button>
          <button onClick={() => setQuickVisit(true)}>+ Visita</button>
          <button className="primary" onClick={() => setNewProperty(true)}>
            + Alquiler
          </button>
        </div>
      </header>
      {next && (
        <Link to="/visitas" className="next-visit">
          📅 Próxima visita: <strong>{visitRange(next.scheduledAt, next.endAt)}</strong> —{' '}
          {next.propertyTitle ?? next.title}
          {next.location ? ` · ${next.location}` : next.propertyAddress ? ` · ${next.propertyAddress}` : ''}
        </Link>
      )}
      <main>
        <Outlet />
      </main>
      <MobileTabbar
        onNewProperty={() => setNewProperty(true)}
        onNewVisit={() => setQuickVisit(true)}
        onNewInbox={() => setQuickInbox(true)}
      />
      {quickVisit && <QuickVisitDialog onClose={() => setQuickVisit(false)} />}
      {newProperty && <NewPropertyDialog onClose={() => setNewProperty(false)} />}
      {quickInbox && <QuickInboxDialog onClose={() => setQuickInbox(false)} />}
    </div>
  )
}
