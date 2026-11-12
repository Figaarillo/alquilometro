import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Details } from './domain'
import { computeCosts, scoreProperty } from './scoring'

const S = DEFAULT_SETTINGS
const centro = S.refPoints[0]

const ideal: Details = {
  kind: 'casa',
  isDuplex: true,
  bedrooms: 2,
  bathrooms: 1,
  areaM2: 90,
  condition: 'excelente',
  hasPatio: true,
  patios: [{ surface: 'pasto' }, { surface: 'cemento' }],
  hasGrill: true,
  hasSharedSpaces: false,
  parking: 'auto',
  rent: 450_000,
  expenses: 0,
  petsAllowed: true,
  contractMonths: 24,
  increaseEveryMonths: 6,
  increaseIndex: 'IPC',
  deposit: 450_000,
  advanceMonths: 1,
  gas: 'natural',
  heating: 'gas',
  hotWater: 'gas',
  humidity: 'no',
  naturalLight: 'mucha',
  ventilation: 'buena',
  orientation: 'N',
  noise: 'tranquilo',
  traffic: 'bajo',
  neighborhoodSafety: 'buena',
}
const at = (details: Details) => ({ details, lat: centro.lat, lng: centro.lng })
const adj = (r: ReturnType<typeof scoreProperty>, re: RegExp) =>
  r.adjustments.filter((a) => re.test(a.label)).reduce((s, a) => s + a.points, 0)

describe('scoreProperty', () => {
  it('sin datos no inventa un puntaje', () => {
    const r = scoreProperty({ details: {} }, S)
    expect(r.total).toBeNull()
    expect(r.completeness).toBe(0)
    expect(r.missing.length).toBeGreaterThan(10)
  })

  it('una propiedad ideal y cerca del centro puntúa alto', () => {
    const r = scoreProperty(at(ideal), S)
    expect(r.total).toBeGreaterThan(88)
    expect(r.adjustments).toHaveLength(0)
  })

  it('los datos desconocidos no hunden el puntaje, bajan la completitud', () => {
    const r = scoreProperty({ details: { bedrooms: 2 } }, S)
    expect(r.total).toBe(100)
    expect(r.completeness).toBeLessThan(10)
    expect(r.alerts.some((a) => /poco confiable/i.test(a.text))).toBe(true)
  })

  it('no admitir mascotas resta puntos', () => {
    const base = scoreProperty(at(ideal), S).total!
    const r = scoreProperty(at({ ...ideal, petsAllowed: false }), S)
    expect(base - r.total!).toBeGreaterThanOrEqual(10)
  })

  it('alquiler sobre el tope pero sin expensas y con cochera: justificado, sin castigo', () => {
    const r = scoreProperty(at({ ...ideal, rent: 640_000, expenses: 0, parking: 'auto' }), S)
    expect(adj(r, /alquiler/i)).toBe(0)
    expect(r.alerts.some((a) => /justificado/i.test(a.text))).toBe(true)
  })

  it('alquiler sobre el tope sin justificación: castigo aunque el total entre', () => {
    const r = scoreProperty(at({ ...ideal, rent: 600_000, expenses: 30_000, parking: 'ninguno' }), S)
    expect(adj(r, /alquiler/i)).toBeLessThan(0)
  })

  it('gasto total por encima de 650k castiga fuerte', () => {
    const r = scoreProperty(at({ ...ideal, rent: 600_000, expenses: 100_000 }), S)
    expect(adj(r, /total/i)).toBeLessThanOrEqual(-20)
  })

  it('alquiler de 700k o más se marca como muy elevado', () => {
    const r = scoreProperty(at({ ...ideal, rent: 700_000, expenses: 0 }), S)
    expect(r.adjustments.some((a) => /muy elevado/i.test(a.label))).toBe(true)
  })

  it('todo eléctrico resta puntos', () => {
    const base = scoreProperty(at(ideal), S).total!
    const r = scoreProperty(at({ ...ideal, gas: 'ninguno', heating: 'electrica', hotWater: 'electrico' }), S)
    expect(base - r.total!).toBeGreaterThanOrEqual(12)
  })

  it('dos habitaciones valen más que una, y dúplex suma', () => {
    const dos = scoreProperty(at({ ...ideal, isDuplex: false }), S).total!
    const una = scoreProperty(at({ ...ideal, bedrooms: 1, isDuplex: false }), S).total!
    const duplex = scoreProperty(at(ideal), S).total!
    expect(dos).toBeGreaterThan(una)
    expect(duplex).toBeGreaterThan(dos)
  })

  it('lejos del centro y la costanera puntúa menos en ubicación', () => {
    const cerca = scoreProperty(at(ideal), S)
    const lejos = scoreProperty({ details: ideal, lat: centro.lat - 0.05, lng: centro.lng - 0.05 }, S)
    const ub = (r: typeof cerca) => r.categories.find((c) => c.key === 'ubicacion')!.score!
    expect(ub(cerca)).toBeGreaterThan(80)
    expect(ub(lejos)).toBeLessThan(40)
  })
})

describe('mascotas y tamaño', () => {
  it('no saber si aceptan mascotas no castiga ni cuenta como dato faltante', () => {
    const r = scoreProperty(at({ ...ideal, petsAllowed: null }), S)
    expect(r.adjustments.some((a) => /mascotas/i.test(a.label))).toBe(false)
    expect(r.missing.some((m) => /mascotas/i.test(m))).toBe(false)
  })

  it('el tamaño se puede cargar como chica/mediana/grande si no sabés los m²', () => {
    const espacio = (d: Details) => scoreProperty(at(d), S).categories.find((c) => c.key === 'espacio')!
    const sinM2 = { ...ideal, areaM2: null }
    const chica = espacio({ ...sinM2, sizeCategory: 'chica' }).score!
    const grande = espacio({ ...sinM2, sizeCategory: 'grande' }).score!
    expect(grande).toBeGreaterThan(chica)
    expect(scoreProperty(at({ ...sinM2, sizeCategory: 'mediana' }), S).missing).not.toContain('Tamaño (m² o chica/mediana/grande)')
  })

  it('si están los m², mandan sobre la categoría', () => {
    const f = (d: Details) =>
      scoreProperty(at(d), S)
        .categories.find((c) => c.key === 'espacio')!
        .factors.find((x) => x.label === 'Tamaño')!.score
    expect(f({ ...ideal, areaM2: 30, sizeCategory: 'grande' })).toBe(f({ ...ideal, areaM2: 30, sizeCategory: null }))
  })
})

describe('computeCosts', () => {
  it('suma servicios estimados solo si no están incluidos en expensas', () => {
    const c = computeCosts(
      { rent: 500_000, expenses: 50_000, expensesInclude: ['agua'], estWater: 10_000, estElectricity: 30_000 },
      S,
    )
    expect(c.baseMonthly).toBe(550_000)
    expect(c.utilities).toBe(30_000)
    expect(c.realMonthly).toBe(580_000)
  })

  it('convierte dólares y calcula el costo de entrada', () => {
    const c = computeCosts({ currency: 'USD', rent: 300, deposit: 300, advanceMonths: 1, agencyFee: 100 }, S)
    expect(c.rent).toBe(300 * S.usdRate)
    expect(c.entryTotal).toBe(700 * S.usdRate)
  })
})
