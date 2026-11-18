import { describe, expect, it } from 'vitest'
import { pageTitle, upcomingVisits } from './nav'

describe('pageTitle', () => {
  it('la raíz es el Ranking', () => {
    expect(pageTitle('/')).toBe('Ranking')
  })

  it('usa el nombre de la sección', () => {
    expect(pageTitle('/visitas')).toBe('Visitas')
    expect(pageTitle('/mapa')).toBe('Mapa')
  })

  it('cae en el nombre de la app si la ruta no es una sección', () => {
    expect(pageTitle('/p/123')).toBe('Alquilómetro')
  })
})

describe('upcomingVisits', () => {
  const now = new Date('2026-11-18T12:00:00Z').getTime()
  const v = (scheduledAt: string, extra: Partial<{ done: boolean; endAt: string | null }> = {}) => ({
    scheduledAt,
    endAt: null,
    done: false,
    ...extra,
  })

  it('deja afuera las hechas', () => {
    expect(upcomingVisits([v('2026-11-19T10:00:00Z', { done: true })], now)).toEqual([])
  })

  it('deja afuera las que terminaron hace más de una hora', () => {
    expect(upcomingVisits([v('2026-11-18T10:00:00Z')], now)).toEqual([])
  })

  it('mantiene la que empezó hace un rato (todavía estás ahí)', () => {
    expect(upcomingVisits([v('2026-11-18T11:30:00Z')], now)).toHaveLength(1)
  })

  it('usa el fin de la visita si lo tiene', () => {
    expect(upcomingVisits([v('2026-11-18T09:00:00Z', { endAt: '2026-11-18T11:30:00Z' })], now)).toHaveLength(1)
  })

  it('ordena de la más cercana a la más lejana', () => {
    const later = v('2026-11-20T10:00:00Z')
    const sooner = v('2026-11-19T10:00:00Z')
    expect(upcomingVisits([later, sooner], now)).toEqual([sooner, later])
  })
})
