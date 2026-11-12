import { CalendarDays, CalendarPlus, Columns3, House, ListChecks, LogOut, Map, Menu, MessageSquareText, Plus, Settings, Share2, Trophy } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/AuthGate'
import { BottomSheet } from './BottomSheet'

type Icon = ComponentType<{ size?: number }>

const MENU: [string, string, Icon][] = [
  ['/procesos', 'Procesos', Columns3],
  ['/mensajes', 'Mensajes', MessageSquareText],
  ['/checklist', 'Checklist de visita', ListChecks],
  ['/compartidos', 'Compartidos', Share2],
  ['/ajustes', 'Ajustes del puntaje', Settings],
]

function Tab({ to, label, icon: I }: { to: string; label: string; icon: Icon }) {
  return (
    <NavLink to={to} end={to === '/'} className="tab-item">
      <I size={22} />
      <span>{label}</span>
    </NavLink>
  )
}

/** Tabbar flotante solo en mobile: Menú · Visitas · [Ranking] · Mapa · Agregar. */
export function MobileTabbar({ onNewProperty, onNewVisit }: { onNewProperty: () => void; onNewVisit: () => void }) {
  const navigate = useNavigate()
  const auth = useAuth()
  const [sheet, setSheet] = useState<'menu' | 'actions' | null>(null)
  const close = () => setSheet(null)
  const go = (to: string) => {
    close()
    navigate(to)
  }

  return (
    <>
      <nav className="tabbar" aria-label="Navegación">
        <button className={`tab-item ${sheet === 'menu' ? 'active' : ''}`} onClick={() => setSheet(sheet === 'menu' ? null : 'menu')}>
          <Menu size={22} />
          <span>Menú</span>
        </button>
        <Tab to="/visitas" label="Visitas" icon={CalendarDays} />
        <NavLink to="/" end className="tab-item fab" aria-label="Ranking">
          <Trophy size={26} />
        </NavLink>
        <Tab to="/mapa" label="Mapa" icon={Map} />
        <button className={`tab-item ${sheet === 'actions' ? 'active' : ''}`} onClick={() => setSheet(sheet === 'actions' ? null : 'actions')}>
          <Plus size={22} />
          <span>Agregar</span>
        </button>
      </nav>

      <BottomSheet open={sheet === 'menu'} onClose={close}>
        <ul className="sheet-list">
          {MENU.map(([to, label, I]) => (
            <li key={to}>
              <button onClick={() => go(to)}>
                <I size={20} /> {label}
              </button>
            </li>
          ))}
          {auth.authRequired && (
            <li>
              <button
                className="danger"
                onClick={() => {
                  close()
                  void auth.logout()
                }}
              >
                <LogOut size={20} /> Cerrar sesión
              </button>
            </li>
          )}
        </ul>
      </BottomSheet>

      <BottomSheet open={sheet === 'actions'} onClose={close}>
        <ul className="sheet-list">
          <li>
            <button
              onClick={() => {
                close()
                onNewProperty()
              }}
            >
              <House size={20} /> Nuevo alquiler
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                close()
                onNewVisit()
              }}
            >
              <CalendarPlus size={20} /> Agendar visita
            </button>
          </li>
        </ul>
      </BottomSheet>
    </>
  )
}
