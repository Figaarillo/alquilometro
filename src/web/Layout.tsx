import { useLayoutEffect, useRef, useState, ViewTransition } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router'
import { MobileTabbar } from './components/MobileTabbar'
import { QuickInboxDialog } from './features/inbox/QuickInboxDialog'
import { NewPropertyDialog } from './features/properties/NewPropertyDialog'
import { QuickVisitDialog } from './features/visits/QuickVisitDialog'
import { useAuth } from './features/auth/AuthGate'
import { HeaderSlotProvider, HeaderSlotTarget } from './components/HeaderSlot'
import { VisitsBell } from './components/VisitsBell'
import { useSettings } from './hooks'
import { setHour12 } from './lib/format'
import { NAV, pageTitle } from './lib/nav'

/** Profundidad de una pantalla: las secciones del menú son 1, el detalle de un alquiler es 2. */
const depthOf = (path: string) => (path.startsWith('/p/') ? 2 : 1)

/** Las 3 pestañas del centro de la barra de abajo, en orden: entre ellas la pantalla se desliza de costado. */
const TAB_ORDER = ['/visitas', '/', '/mapa']

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
    const a = TAB_ORDER.indexOf(prev.current)
    const b = TAB_ORDER.indexOf(pathname)
    const dir =
      to > from ? 'push'
      : to < from ? 'pop'
      : to === 2 ? (navType === 'POP' ? 'pop' : 'push')
      : a >= 0 && b >= 0 ? (b > a ? 'tab-next' : 'tab-prev')
      : 'fade'
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
  const auth = useAuth()
  const { pathname, key } = useLocation()
  useNavDirection(pathname, key)
  // Antes de pintar fechas: todas las horas de la app respetan la preferencia de Ajustes.
  setHour12(useSettings().timeFormat === '12h')

  return (
    <HeaderSlotProvider>
    <div className={`app ${pathname.startsWith('/p/') ? 'route-detail' : ''}`}>
      <header className="topbar">
        {/* En escritorio, la marca; en el celu, el logo chiquito + en qué pantalla estás. */}
        <Link to="/" className="brand">
          <span aria-hidden="true">🏠</span>
          <span className="brand-name">Alquilómetro</span>
          <span className="page-title">{pageTitle(pathname)}</span>
        </Link>
        <nav className="desktop-nav">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="top-icons">
          <HeaderSlotTarget />
          <VisitsBell />
        </div>
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
    </HeaderSlotProvider>
  )
}
