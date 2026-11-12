const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const money = (v: number | null | undefined) => (v == null ? '—' : ars.format(v))
export const moneyK = (v: number | null | undefined) => (v == null ? '—' : `$${Math.round(v / 1000)}k`)

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

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
