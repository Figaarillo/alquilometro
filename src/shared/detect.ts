/**
 * Detecta links y teléfonos en texto pegado (de WhatsApp, Marketplace, etc.)
 * para poder abrirlos y precargar un alquiler.
 */

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
// Secuencias de dígitos con separadores típicos (+, espacios, guiones, paréntesis).
const PHONE_RE = /(?:\+?\d[\d\s\-().]{6,}\d)/g

export interface Detected {
  links: string[]
  phones: string[]
  /** Título sugerido para crear el alquiler. */
  title: string
}

const trimPunct = (s: string) => s.replace(/[).,;:!?]+$/, '')

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function detect(text: string): Detected {
  const links = [...text.matchAll(URL_RE)].map((m) => {
    const raw = trimPunct(m[0])
    return raw.toLowerCase().startsWith('www.') ? `https://${raw}` : raw
  })

  // Los números dentro de links no son teléfonos.
  const withoutLinks = text.replace(URL_RE, ' ')
  const phones = [...withoutLinks.matchAll(PHONE_RE)]
    .filter((m) => !/[.,]\d{3}\b/.test(m[0]) || /\s/.test(m[0])) // descarta precios tipo 550.000
    .map((m) => m[0].replace(/\D/g, ''))
    .filter((d) => d.length >= 10 && d.length <= 13)
    .filter((d, i, all) => all.indexOf(d) === i)

  const firstLine =
    text
      .replace(URL_RE, '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !/^[\d\s+\-().]+$/.test(l)) ?? ''

  let title = firstLine.slice(0, 60)
  if (!title && links[0]) title = `Aviso de ${hostOf(links[0]) ?? 'la web'}`
  if (!title && phones[0]) title = `Contacto ${phones[0]}`

  return { links, phones, title }
}
