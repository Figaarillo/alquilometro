import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useVisits } from '../hooks'
import { visitRange } from '../lib/format'
import { todayVisits } from '../lib/nav'

/** Campana del header: cuántas visitas quedan hoy y, al tocarla, la lista. */
export function VisitsBell() {
  const visits = useVisits()
  const upcoming = todayVisits(visits.data ?? [])
  const [open, setOpen] = useState(false)
  // Al navegar (tocando una visita, por ejemplo) se cierra sola.
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="bell">
      <button
        className={`top-icon ${open ? 'on' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={`Visitas de hoy (${upcoming.length})`}
        aria-expanded={open}
        title="Visitas de hoy"
      >
        <Bell size={20} />
        {upcoming.length > 0 && <span className="tab-badge">{upcoming.length}</span>}
      </button>
      {open && (
        <>
          <div className="bell-backdrop" onClick={() => setOpen(false)} />
          <div className="bell-pop" role="dialog" aria-label="Visitas de hoy">
            <div className="bell-title">Visitas de hoy</div>
            {upcoming.length === 0 ? (
              <p className="muted bell-empty">No te quedan visitas por hoy.</p>
            ) : (
              <ul className="bell-list">
                {upcoming.map((v) => (
                  <li key={v.id}>
                    <Link to={v.propertyId ? `/p/${v.propertyId}?tab=resumen` : '/visitas'} onClick={() => setOpen(false)}>
                      <span className="bell-when">{visitRange(v.scheduledAt, v.endAt)}</span>
                      <span className="bell-name">{v.propertyTitle ?? v.title ?? 'Visita'}</span>
                      {(v.location || v.propertyAddress) && <span className="muted small">{v.location || v.propertyAddress}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/visitas" className="bell-all" onClick={() => setOpen(false)}>
              Ver todas las visitas
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
