export const streetViewUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`

export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

export const directionsUrl = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`

export const streetViewEmbedUrl = (key: string, lat: number, lng: number) =>
  `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(key)}&location=${lat},${lng}&fov=80`

export function googleCalendarUrl(o: { title: string; start: Date; end?: Date; details?: string; location?: string }) {
  const end = o.end ?? new Date(o.start.getTime() + 45 * 60_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: o.title,
    dates: `${fmt(o.start)}/${fmt(end)}`,
    details: o.details ?? '',
    location: o.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

/**
 * Link de WhatsApp. Para Argentina el número va como 549 + característica sin 0 + número sin 15.
 * Si el teléfono ya empieza con 54 se respeta tal cual.
 */
const LINK_RE = /^(https?:\/\/|wa\.me\/|api\.whatsapp\.com|www\.)/i

/** El "teléfono" a veces es un link de WhatsApp pegado tal cual. */
export const isLink = (v: string | null | undefined) => !!v && LINK_RE.test(v.trim())

export function whatsappUrl(phone: string | null | undefined, text: string) {
  if (isLink(phone)) {
    const raw = phone!.trim()
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (text) url.searchParams.set('text', text)
    return url.toString()
  }
  const digits = (phone ?? '').replace(/\D/g, '')
  const number = !digits ? '' : digits.startsWith('54') ? digits : `549${digits.replace(/^0/, '')}`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/**
 * Primer mensaje de WhatsApp: si el contacto es un número (no un link de chat) y hay publicación
 * cargada, arranca con el link así el dueño sabe por cuál le escribís.
 */
export function firstContactMessage(p: { contactPhone: string | null; listingUrl: string | null }) {
  if (!p.contactPhone || isLink(p.contactPhone) || !p.listingUrl) return ''
  return `¡Hola! ¿Cómo estás? Te escribo por este alquiler: ${p.listingUrl}\n¿Sigue disponible?`
}
