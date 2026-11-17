import { OPTIONS, statusLabel } from '../../shared/domain'

/** Lo mínimo de un alquiler que mira el buscador. */
export interface Searchable {
  title: string
  address?: string | null
  description?: string | null
  notes?: string | null
  contactName?: string | null
  contactPhone?: string | null
  status: string
  details?: unknown
}

/** Minúsculas y sin tildes, para que "Espana" encuentre "España". */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// Valor guardado → textos visibles ("natural" → "Gas natural"), de todas las opciones.
const LABELS = new Map<string, string[]>()
for (const list of Object.values(OPTIONS)) {
  for (const [value, label] of list) LABELS.set(value, [...(LABELS.get(value) ?? []), label])
}

/** Un número en las formas en que alguien lo escribiría: 480000, 480.000 y 480k. */
const numberForms = (n: number) => {
  const forms = [String(n), n.toLocaleString('es-AR')]
  if (n >= 1000) forms.push(`${Math.round(n / 1000)}k`)
  return forms
}

function collect(value: unknown, out: string[]) {
  if (value == null || typeof value === 'boolean') return
  if (typeof value === 'number') out.push(...numberForms(value))
  else if (typeof value === 'string') out.push(value, ...(LABELS.get(value) ?? []))
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out))
  else if (typeof value === 'object') Object.values(value).forEach((v) => collect(v, out))
}

/** Todo el texto buscable de un alquiler, ya normalizado. Conviene calcularlo una vez por alquiler. */
export function searchText(p: Searchable): string {
  const out: string[] = [p.title, statusLabel(p.status)]
  for (const v of [p.address, p.description, p.notes, p.contactName, p.contactPhone]) if (v) out.push(v)
  if (p.contactPhone) out.push(p.contactPhone.replace(/\D/g, ''))
  collect(p.details, out)
  return normalize(out.join(' \n '))
}

/** Coincide si aparecen todas las palabras de la búsqueda (en cualquier orden). */
export function matchesQuery(text: string, query: string): boolean {
  const words = normalize(query).replace(/\$/g, '').split(/\s+/).filter(Boolean)
  return words.every((w) => text.includes(w))
}
