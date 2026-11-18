/** Secciones de la app: ruta → nombre (menú de escritorio y título del header en el celu). */
export const NAV: [string, string][] = [
  ['/', 'Ranking'],
  ['/pendientes', 'Pendientes'],
  ['/mapa', 'Mapa'],
  ['/procesos', 'Procesos'],
  ['/visitas', 'Visitas'],
  ['/mensajes', 'Mensajes'],
  ['/checklist', 'Checklist'],
  ['/compartidos', 'Compartidos'],
  ['/ajustes', 'Ajustes'],
]

export function pageTitle(pathname: string): string {
  return NAV.find(([to]) => to === pathname)?.[1] ?? 'Alquilómetro'
}

/** Margen para que la visita en curso (empezó hace un rato) siga contando como próxima. */
const GRACE_MS = 3_600_000

type VisitLike = { done: boolean; scheduledAt: string; endAt: string | null }

/** Visitas sin hacer que todavía no pasaron, de la más cercana a la más lejana. */
export function upcomingVisits<T extends VisitLike>(visits: T[], now = Date.now()): T[] {
  return visits
    .filter((v) => !v.done && new Date(v.endAt ?? v.scheduledAt).getTime() >= now - GRACE_MS)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
}
