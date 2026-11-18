import { describe, expect, it } from 'vitest'
import { pageTitle, todayVisits, upcomingVisits } from './nav'

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

describe('todayVisits', () => {
  // Fechas en hora local: "hoy" es el día del celu, no el de UTC.
  const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m).toISOString()
  const now = new Date(2026, 10, 18, 12, 0).getTime()
  const v = (scheduledAt: string, done = false) => ({ scheduledAt, endAt: null, done })

  it('incluye las de hoy que todavía no pasaron', () => {
    expect(todayVisits([v(at(18, 17))], now)).toHaveLength(1)
  })

  it('incluye la de última hora del día', () => {
    expect(todayVisits([v(at(18, 23, 59))], now)).toHaveLength(1)
  })

  it('deja afuera las de mañana', () => {
    expect(todayVisits([v(at(19, 0, 30))], now)).toEqual([])
  })

  it('deja afuera las de hoy que ya pasaron o están hechas', () => {
    expect(todayVisits([v(at(18, 9)), v(at(18, 17), true)], now)).toEqual([])
  })
})
