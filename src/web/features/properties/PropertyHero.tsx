import { ChevronLeft, Ellipsis, Share } from 'lucide-react'
import type { PropertyDetail } from '../../../shared/api'
import { optionLabel, statusLabel } from '../../../shared/domain'
import type { ScoreResult } from '../../../shared/scoring'
import { moneyK, scoreClass } from '../../lib/format'

/**
 * Lo que va encima de la foto de portada: volver, compartir, opciones,
 * y abajo una banda con estado, título y puntaje (estilo app de iOS).
 */
export function HeroOverlay({
  p,
  score,
  onBack,
  onShare,
  onOptions,
}: {
  p: PropertyDetail
  score: number | null
  onBack: () => void
  onShare: () => void
  onOptions: () => void
}) {
  const placement = p.placement === 'fondo' ? ' · al fondo del ranking' : p.placement === 'oculto' ? ' · oculto del ranking' : ''
  return (
    <>
      <div className="hero-top">
        <button className="hero-btn" onClick={onBack} aria-label="Volver">
          <ChevronLeft size={24} />
        </button>
        <div className="hero-top-right">
          <button className="hero-btn" onClick={onShare} aria-label="Compartir">
            <Share size={20} />
          </button>
          <button className="hero-btn" onClick={onOptions} aria-label="Estado, lugar en el ranking y más">
            <Ellipsis size={22} />
          </button>
        </div>
      </div>
      <div className="hero-band">
        <div className="hero-band-text">
          <button className="hero-status" onClick={onOptions}>
            {statusLabel(p.status)} ▾
          </button>
          <h1>{p.title}</h1>
          <span className="hero-sub">
            {p.address ?? 'Sin dirección'}
            {placement}
          </span>
        </div>
        <div className={`hero-score ${scoreClass(score)}`} title="Puntaje automático">
          <strong>{score == null ? '—' : Math.round(score)}</strong>
          <span>puntaje</span>
        </div>
      </div>
    </>
  )
}

const PARKING_SHORT: Record<string, string> = { auto: 'Auto', moto: 'Moto', ninguno: 'No' }

/** Precio grande + 4 datos clave, justo debajo de la portada. */
export function HeroSummary({ p, r, maxMonthly }: { p: PropertyDetail; r: ScoreResult; maxMonthly: number }) {
  const c = r.costs
  const d = p.details
  const nearest = [...r.distances].sort((a, b) => a.km - b.km)[0]
  const size = d.areaM2 != null ? [String(d.areaM2), 'm²'] : d.sizeCategory ? [optionLabel('sizeCategory', d.sizeCategory), 'tamaño'] : ['?', 'm²']
  const facts: [string, string][] = [
    [d.bedrooms != null ? String(d.bedrooms) : '?', 'hab.'],
    [size[0], size[1]],
    [nearest ? String(nearest.km).replace('.', ',') : '?', nearest ? `km ${nearest.name.split(' (')[0]}` : 'km'],
    [d.parking ? PARKING_SHORT[d.parking] : '?', 'cochera'],
  ]
  const within = c.baseMonthly != null ? c.baseMonthly <= maxMonthly : null

  return (
    <div className="hero-summary">
      <div className="price-row">
        <div className="price-main">
          <span className="price">
            {moneyK(c.rent)}
            <small> /mes</small>
          </span>
          {c.expenses != null && c.expenses > 0 ? (
            <span className="muted small">
              + {moneyK(c.expenses)} expensas = {moneyK(c.baseMonthly)}
            </span>
          ) : (
            <span className="muted small">{c.expenses === 0 ? 'Sin expensas' : 'Expensas: sin dato'}</span>
          )}
        </div>
        {within != null && <span className={`pill ${within ? 'pill-good' : 'pill-bad'}`}>{within ? 'Dentro del tope' : 'Pasa el tope'}</span>}
      </div>
      <div className="facts">
        {facts.map(([v, l]) => (
          <div key={l} className="fact">
            <strong>{v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
