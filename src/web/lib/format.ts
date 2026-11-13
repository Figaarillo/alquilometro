const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const money = (v: number | null | undefined) => (v == null ? '—' : ars.format(v))
export const moneyK = (v: number | null | undefined) => (v == null ? '—' : `$${Math.round(v / 1000)}k`)

/** Preferencia de Ajustes: 24 h (18:30) o 12 h (6:30 p. m.). La fija la app al cargar los ajustes. */
let hour12 = false
export const setHour12 = (v: boolean) => {
  hour12 = v
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12,
  })
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: hour12 ? 'numeric' : '2-digit', minute: '2-digit', hour12 })

/** "Hoy 18:00", "Mañana 9:30", "jue 14 nov 10:00" */
export function relativeDay(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(d) - startOf(today)) / 86_400_000)
  if (diff === 0) return `Hoy ${fmtTime(iso)}`
  if (diff === 1) return `Mañana ${fmtTime(iso)}`
  if (diff === -1) return `Ayer ${fmtTime(iso)}`
  return fmtDateTime(iso)
}

export function visitRange(scheduledAt: string, endAt: string | null) {
  return endAt ? `${relativeDay(scheduledAt)} a ${fmtTime(endAt)}` : relativeDay(scheduledAt)
}

export const scoreClass = (s: number | null | undefined) =>
  s == null ? 'score-none' : s >= 75 ? 'score-good' : s >= 55 ? 'score-mid' : 'score-bad'

/** Date -> valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Date -> "yyyy-mm-dd" en hora local (para <input type="date">). */
export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
/** Date -> "HH:mm" en hora local. */
export const toTimeValue = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
/** "yyyy-mm-dd" + "HH:mm" -> Date local. */
export function combineDateTime(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0)
}
