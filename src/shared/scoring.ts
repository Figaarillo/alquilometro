/**
 * Motor de puntaje. Función pura: mismos datos + mismos ajustes => mismo resultado.
 *
 * 1. Cada categoría se arma con "factores" (0..100). Un factor desconocido NO cuenta:
 *    no castiga, pero baja la completitud.
 * 2. El puntaje base es el promedio ponderado de las categorías con datos (pesos en Ajustes).
 * 3. Los "ajustes" restan puntos por cosas que te importan mucho (mascotas, presupuesto, todo eléctrico).
 * 4. La completitud dice cuánto confiar en el número y qué te falta averiguar.
 */
import { CATEGORIES, DEFAULT_SETTINGS, type CategoryKey, type Details, type Settings } from './domain'

export interface Factor {
  label: string
  score: number | null
  weight: number
  detail?: string
}

export interface CategoryResult {
  key: CategoryKey
  label: string
  weight: number
  score: number | null
  factors: Factor[]
}

export interface Adjustment {
  label: string
  points: number
  detail?: string
}

export interface Alert {
  level: 'info' | 'warn' | 'danger'
  text: string
}

export interface CostSummary {
  rent: number | null
  expenses: number | null
  /** alquiler + expensas */
  baseMonthly: number | null
  /** servicios estimados que NO están incluidos en expensas */
  utilities: number | null
  realMonthly: number | null
  entryTotal: number | null
}

export interface ScoreResult {
  total: number | null
  base: number | null
  categories: CategoryResult[]
  adjustments: Adjustment[]
  alerts: Alert[]
  completeness: number
  missing: string[]
  costs: CostSummary
  distances: { name: string; km: number }[]
}

export interface Scorable {
  details: Details
  lat?: number | null
  lng?: number | null
}

const known = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined
const round = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

/** Interpolación lineal por tramos. points ordenados por x. */
export function piecewise(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return points[points.length - 1][1]
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function pick<K extends string>(map: Record<K, number>, v: K | null | undefined): number | null {
  return known(v) ? map[v] : null
}
const bool = (v: boolean | null | undefined, yes: number, no: number) => (known(v) ? (v ? yes : no) : null)

export function computeCosts(d: Details, s: Settings): CostSummary {
  const toArs = (v: number | null | undefined) => (known(v) ? (d.currency === 'USD' ? v * (s.usdRate ?? DEFAULT_SETTINGS.usdRate!) : v) : null)
  const rent = toArs(d.rent)
  const expenses = toArs(d.expenses)
  const baseMonthly = known(rent) ? rent + (expenses ?? 0) : null

  const included = new Set<string>(d.expensesInclude ?? [])
  const estimates: [string, number | null | undefined][] = [
    ['luz', d.estElectricity],
    ['gas', d.estGas],
    ['agua', d.estWater],
    ['internet', d.estInternet],
  ]
  const parts = estimates.filter(([k, v]) => known(v) && !included.has(k)).map(([, v]) => v as number)
  const utilities = parts.length ? parts.reduce((a, b) => a + b, 0) : null
  const realMonthly = known(baseMonthly) ? baseMonthly + (utilities ?? 0) : null

  const entryKnown = [d.deposit, d.agencyFee, d.otherEntryCosts, d.advanceMonths].some(known)
  const entryTotal = entryKnown
    ? (toArs(d.deposit) ?? 0) + (toArs(d.agencyFee) ?? 0) + (toArs(d.otherEntryCosts) ?? 0) + (d.advanceMonths ?? 0) * (rent ?? 0)
    : null

  return { rent, expenses, baseMonthly, utilities, realMonthly, entryTotal }
}

function avg(factors: Factor[]): number | null {
  const k = factors.filter((f) => known(f.score) && f.weight > 0)
  const w = k.reduce((a, f) => a + f.weight, 0)
  if (!w) return null
  return k.reduce((a, f) => a + (f.score as number) * f.weight, 0) / w
}

const km = (n: number) => `${n.toFixed(1)} km`

function locationFactors(p: Scorable, s: Settings, distances: { name: string; km: number }[]): Factor[] {
  const d = p.details
  const curve: [number, number][] = [[0.6, 100], [1.2, 88], [2, 65], [3, 40], [5, 10], [7, 0]]
  // Los puntos son zonas preferidas e intercambiables: alcanza con estar cerca de una.
  // Así, sumar una zona nueva nunca le baja el puntaje a nadie.
  const nearest = [...distances].sort((a, b) => a.km - b.km)[0]
  return [
    {
      label: 'Cercanía a tu zona preferida más cercana',
      weight: 6,
      score: nearest ? piecewise(curve, nearest.km) : null,
      detail: nearest ? `${nearest.name}: ${km(nearest.km)}` : 'Marcá la ubicación en el mapa',
    },
    { label: 'Ruido', weight: 1.5, score: pick({ tranquilo: 100, medio: 60, ruidoso: 15 }, d.noise) },
    { label: 'Tránsito', weight: 1, score: pick({ bajo: 100, medio: 60, alto: 20 }, d.traffic) },
    { label: 'Seguridad del barrio', weight: 1, score: pick({ buena: 100, regular: 55, mala: 10 }, d.neighborhoodSafety) },
  ]
}

function costFactors(c: CostSummary, s: Settings): Factor[] {
  const f: Factor[] = [
    {
      label: 'Alquiler + expensas vs tu tope',
      weight: 2,
      score: known(c.baseMonthly)
        ? piecewise([[0.75, 100], [1, 55], [1.08, 15], [1.15, 0]], c.baseMonthly / s.maxMonthlyTotal)
        : null,
    },
    {
      label: 'Alquiler vs tu tope de alquiler',
      weight: 1,
      score: known(c.rent) ? piecewise([[0.8, 100], [1, 60], [1.18, 25], [1.27, 0]], c.rent / s.maxRent) : null,
    },
  ]
  if (known(c.utilities) && known(c.realMonthly)) {
    f.push({
      label: 'Costo real con servicios estimados',
      weight: 1,
      score: piecewise([[0.75, 100], [1, 50], [1.2, 0]], c.realMonthly / (s.maxMonthlyTotal * 1.2)),
    })
  }
  return f
}

function spaceFactors(d: Details): Factor[] {
  return [
    {
      label: 'Habitaciones',
      weight: 3,
      score: known(d.bedrooms) ? (d.bedrooms >= 2 ? 100 : d.bedrooms === 1 ? 45 : 20) : null,
      detail: known(d.bedrooms) ? `${d.bedrooms} hab.` : undefined,
    },
    { label: 'Dúplex', weight: 1.5, score: bool(d.isDuplex, 100, 45) },
    {
      // Los m² mandan; si no se publican, alcanza con "chica / mediana / grande".
      label: 'Tamaño',
      weight: 1.5,
      score: known(d.areaM2)
        ? piecewise([[30, 20], [45, 50], [60, 75], [80, 95], [100, 100]], d.areaM2)
        : pick({ chica: 40, mediana: 75, grande: 100 }, d.sizeCategory),
      detail: known(d.areaM2) ? `${d.areaM2} m²` : (d.sizeCategory ?? undefined),
    },
    { label: 'Baños', weight: 0.5, score: known(d.bathrooms) ? (d.bathrooms >= 2 ? 100 : d.bathrooms === 1 ? 70 : 0) : null },
  ]
}

function patioScore(d: Details): number | null {
  if (!known(d.hasPatio)) return null
  if (!d.hasPatio) return 0
  const patios = d.patios ?? []
  let score = 70
  if (patios.some((p) => p.surface === 'pasto' || p.surface === 'mixto')) score += 20
  if (patios.length > 1) score += 10
  return Math.min(100, score)
}

function outdoorFactors(d: Details): Factor[] {
  return [
    { label: 'Patio', weight: 3, score: patioScore(d), detail: d.patios?.length ? `${d.patios.length} patio(s)` : undefined },
    { label: 'Asador', weight: 2, score: bool(d.hasGrill, 100, 0) },
    { label: 'Sin espacios compartidos', weight: 2, score: bool(d.hasSharedSpaces, 25, 100) },
  ]
}

function serviceFactors(d: Details): Factor[] {
  return [
    { label: 'Gas', weight: 3, score: pick({ natural: 100, garrafa: 45, ninguno: 0 }, d.gas) },
    { label: 'Calefacción', weight: 2, score: pick({ gas: 100, electrica: 35, ninguna: 10 }, d.heating) },
    { label: 'Agua caliente', weight: 1.5, score: pick({ gas: 100, electrico: 35 }, d.hotWater) },
    { label: 'Aire acondicionado', weight: 0.5, score: bool(d.airConditioning, 100, 50) },
    { label: 'Fibra óptica', weight: 0.5, score: bool(d.fiber, 100, 40) },
  ]
}

function conditionFactors(d: Details): Factor[] {
  return [
    { label: 'Estado general', weight: 3, score: pick({ excelente: 100, bueno: 80, regular: 45, malo: 10 }, d.condition) },
    { label: 'Humedad', weight: 3, score: pick({ no: 100, leve: 55, mucha: 0 }, d.humidity) },
    { label: 'Luz natural', weight: 2, score: pick({ mucha: 100, media: 65, poca: 25 }, d.naturalLight) },
    { label: 'Ventilación', weight: 1, score: pick({ buena: 100, regular: 60, mala: 20 }, d.ventilation) },
    {
      // Hemisferio sur: el norte recibe sol todo el año.
      label: 'Orientación',
      weight: 0.5,
      score: pick({ N: 100, NE: 100, NO: 100, E: 70, O: 70, SE: 50, SO: 50, S: 40 }, d.orientation),
    },
  ]
}

function contractFactors(d: Details, c: CostSummary): Factor[] {
  const entryMonths = known(c.entryTotal) && c.rent ? c.entryTotal / c.rent : null
  return [
    {
      label: 'Frecuencia de aumentos',
      weight: 2,
      score: known(d.increaseEveryMonths)
        ? piecewise([[1, 10], [3, 45], [4, 60], [6, 85], [12, 100]], d.increaseEveryMonths)
        : null,
      detail: known(d.increaseEveryMonths) ? `cada ${d.increaseEveryMonths} meses` : undefined,
    },
    {
      label: 'Índice de aumento',
      weight: 1,
      score: pick({ IPC: 70, ICL: 70, casa_propia: 80, fijo: 60, otro: 50 }, d.increaseIndex),
    },
    {
      label: 'Duración del contrato',
      weight: 1,
      score: known(d.contractMonths) ? piecewise([[6, 20], [12, 50], [24, 85], [36, 100]], d.contractMonths) : null,
    },
    {
      label: 'Costo de ingreso',
      weight: 1.5,
      score: known(entryMonths) ? piecewise([[2, 100], [3, 70], [4, 45], [6, 10]], entryMonths) : null,
      detail: known(entryMonths) ? `≈ ${entryMonths.toFixed(1)} alquileres` : undefined,
    },
  ]
}

function adjustmentsFor(d: Details, c: CostSummary, s: Settings, alerts: Alert[]): Adjustment[] {
  const out: Adjustment[] = []
  if (d.petsAllowed === false) out.push({ label: 'No admiten mascotas', points: -12 })

  if (known(c.baseMonthly) && c.baseMonthly > s.maxMonthlyTotal) {
    const over = (c.baseMonthly - s.maxMonthlyTotal) / s.maxMonthlyTotal
    out.push({
      label: 'Gasto total supera tu tope',
      points: -Math.round(Math.min(30, 10 + over * 200)),
      detail: `${Math.round(over * 100)}% por encima`,
    })
  }

  if (known(c.rent) && c.rent > s.maxRent) {
    const totalOk = known(c.baseMonthly) && c.baseMonthly <= s.maxMonthlyTotal
    const reasons = [c.expenses === 0 && 'no tiene expensas', d.parking === 'auto' && 'tiene cochera para auto'].filter(Boolean)
    if (totalOk && reasons.length) {
      alerts.push({ level: 'info', text: `Alquiler sobre tu tope pero justificado: ${reasons.join(' y ')}.` })
    } else {
      out.push({ label: 'Alquiler sobre tu tope sin justificación', points: -6 })
      if (!known(d.expenses)) alerts.push({ level: 'warn', text: 'Alquiler alto: averiguá las expensas para ver si se justifica.' })
    }
    if (c.rent >= s.rentHardCap) out.push({ label: 'Alquiler muy elevado', points: -10 })
  }

  if (d.gas === 'ninguno') out.push({ label: 'Todo eléctrico: gastos altos', points: -10 })
  if (d.humidity === 'mucha') out.push({ label: 'Mucha humedad', points: -8 })
  return out
}

/** Campos que hacen falta para confiar en el puntaje. */
const REQUIRED: [string, (p: Scorable) => boolean][] = [
  ['Ubicación en el mapa', (p) => known(p.lat) && known(p.lng)],
  ['Alquiler', (p) => known(p.details.rent)],
  ['Expensas (0 si no tiene)', (p) => known(p.details.expenses)],
  ['Casa o departamento', (p) => known(p.details.kind)],
  ['Habitaciones', (p) => known(p.details.bedrooms)],
  ['Dúplex', (p) => known(p.details.isDuplex)],
  ['Tamaño (m² o chica/mediana/grande)', (p) => known(p.details.areaM2) || known(p.details.sizeCategory)],
  ['Estado general', (p) => known(p.details.condition)],
  ['Patio', (p) => known(p.details.hasPatio)],
  ['Asador', (p) => known(p.details.hasGrill)],
  ['Espacios compartidos', (p) => known(p.details.hasSharedSpaces)],
  ['Cochera', (p) => known(p.details.parking)],
  ['Gas natural', (p) => known(p.details.gas)],
  ['Calefacción', (p) => known(p.details.heating)],
  ['Agua caliente', (p) => known(p.details.hotWater)],
  ['Humedad', (p) => known(p.details.humidity)],
  ['Luz natural', (p) => known(p.details.naturalLight)],
  ['Ruido', (p) => known(p.details.noise)],
  ['Tránsito', (p) => known(p.details.traffic)],
  ['Frecuencia de aumentos', (p) => known(p.details.increaseEveryMonths)],
  ['Índice de aumento', (p) => known(p.details.increaseIndex)],
  ['Duración del contrato', (p) => known(p.details.contractMonths)],
  ['Depósito / costo de ingreso', (p) => [p.details.deposit, p.details.agencyFee, p.details.advanceMonths].some(known)],
  ['Garantías que piden', (p) => !!p.details.guarantees?.length || !!p.details.guaranteeNotes],
]

export function scoreProperty(p: Scorable, s: Settings): ScoreResult {
  const d = p.details ?? {}
  const costs = computeCosts(d, s)
  const alerts: Alert[] = []

  const distances =
    known(p.lat) && known(p.lng)
      ? s.refPoints.map((r) => ({ name: r.name, km: round(haversineKm({ lat: p.lat!, lng: p.lng! }, r)) }))
      : []

  const builders: Record<CategoryKey, () => Factor[]> = {
    ubicacion: () => locationFactors(p, s, distances),
    costo: () => costFactors(costs, s),
    espacio: () => spaceFactors(d),
    servicios: () => serviceFactors(d),
    estado: () => conditionFactors(d),
    exteriores: () => outdoorFactors(d),
    cochera: () => [{ label: 'Cochera', weight: 1, score: pick({ auto: 100, moto: 65, ninguno: 0 }, d.parking) }],
    contrato: () => contractFactors(d, costs),
  }

  const categories: CategoryResult[] = CATEGORIES.map(([key, label]) => {
    const factors = builders[key]()
    const score = avg(factors)
    return { key, label, weight: s.weights[key] ?? 0, score: known(score) ? round(score) : null, factors }
  })

  const scored = categories.filter((c) => known(c.score) && c.weight > 0)
  const wsum = scored.reduce((a, c) => a + c.weight, 0)
  const base = wsum ? scored.reduce((a, c) => a + (c.score as number) * c.weight, 0) / wsum : null

  const adjustments = adjustmentsFor(d, costs, s, alerts)
  const total = known(base) ? round(clamp(base + adjustments.reduce((a, x) => a + x.points, 0))) : null

  const missing = REQUIRED.filter(([, ok]) => !ok(p)).map(([label]) => label)
  const completeness = Math.round(((REQUIRED.length - missing.length) / REQUIRED.length) * 100)

  if (known(total) && completeness < 50) {
    alerts.push({ level: 'warn', text: `Puntaje poco confiable: solo tenés el ${completeness}% de los datos clave.` })
  }
  if (d.humidity === 'mucha') alerts.push({ level: 'danger', text: 'Mucha humedad: suele traer problemas de salud y de muebles.' })
  if (d.gas === 'garrafa') alerts.push({ level: 'warn', text: 'Gas en garrafa: más caro y más incómodo que gas natural.' })
  if (d.hasPatio && !d.patios?.length) alerts.push({ level: 'info', text: 'Tiene patio: cargá cuántos son y de qué tipo (pasto, cemento).' })
  if (known(d.guaranteesCount) && d.guaranteesCount >= 2) {
    alerts.push({ level: 'warn', text: `Piden ${d.guaranteesCount} garantías: verificá que puedas cumplirlas.` })
  }

  return { total, base: known(base) ? round(base) : null, categories, adjustments, alerts, completeness, missing, costs, distances }
}
