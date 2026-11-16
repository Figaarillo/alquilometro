import { useLayoutEffect, useRef, useState, ViewTransition } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router'
import { MobileTabbar } from './components/MobileTabbar'
import { QuickInboxDialog } from './features/inbox/QuickInboxDialog'
import { NewPropertyDialog } from './features/properties/NewPropertyDialog'
import { QuickVisitDialog } from './features/visits/QuickVisitDialog'
import { useAuth } from './features/auth/AuthGate'
import { useSettings, useVisits } from './hooks'
import { setHour12, visitRange } from './lib/format'

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

/** Profundidad de una pantalla: las secciones del menú son 1, el detalle de un alquiler es 2. */
const depthOf = (path: string) => (path.startsWith('/p/') ? 2 : 1)

/**
 * Dirección de la animación al cambiar de pantalla, como en iOS:
 * entrar a un detalle desliza desde la derecha (push), volver desliza hacia la derecha (pop)
 * y cambiar de sección del menú es un fundido corto. El CSS la lee de <html data-nav>.
 */
/** Scroll de cada entrada del historial: al volver, quedás donde estabas (como en iOS). */
const savedScroll = new Map<string, number>()
if (typeof history !== 'undefined') history.scrollRestoration = 'manual'

function useNavDirection(pathname: string, key: string) {
  const navType = useNavigationType()
  const prev = useRef(pathname)
  const prevKey = useRef(key)
  if (prev.current !== pathname) {
    savedScroll.set(prevKey.current, window.scrollY)
    const from = depthOf(prev.current)
    const to = depthOf(pathname)
    const dir = to > from ? 'push' : to < from ? 'pop' : to === 2 ? (navType === 'POP' ? 'pop' : 'push') : 'fade'
    document.documentElement.dataset.nav = dir
    prev.current = pathname
  }
  prevKey.current = key
  // Antes de que el navegador saque la "foto" de la pantalla nueva: arriba de todo, o donde la dejaste.
  useLayoutEffect(() => {
    window.scrollTo(0, navType === 'POP' ? (savedScroll.get(key) ?? 0) : 0)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function Layout() {
  const [quickVisit, setQuickVisit] = useState(false)
  const [newProperty, setNewProperty] = useState(false)
  const [quickInbox, setQuickInbox] = useState(false)
  const visits = useVisits()
  const auth = useAuth()
  const { pathname, key } = useLocation()
  useNavDirection(pathname, key)
  // Antes de pintar fechas: todas las horas de la app respetan la preferencia de Ajustes.
  setHour12(useSettings().timeFormat === '12h')
  const next = visits.data?.find((v) => !v.done && new Date(v.endAt ?? v.scheduledAt).getTime() > Date.now() - 3_600_000)

  return (
    <div className={`app ${pathname.startsWith('/p/') ? 'route-detail' : ''}`}>
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
        {/* Cada pantalla es una "página" que entra y sale con View Transitions (React 19 + API nativa del navegador). */}
        <ViewTransition key={pathname} enter="page" exit="page" default="none">
          <div className="page-view">
            <Outlet />
          </div>
        </ViewTransition>
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
