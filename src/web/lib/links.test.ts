import { describe, expect, it } from 'vitest'
import { firstContactMessage, isLink, whatsappUrl } from './links'

describe('whatsappUrl', () => {
  it('arma el link desde un número argentino', () => {
    expect(whatsappUrl('353 415-2233', '')).toBe('https://wa.me/5493534152233?text=')
    expect(whatsappUrl('+54 9 353 4152233', 'hola')).toBe('https://wa.me/5493534152233?text=hola')
  })

  it('respeta un link de WhatsApp pegado en lugar del teléfono', () => {
    expect(whatsappUrl('https://wa.me/5493534152233', '')).toBe('https://wa.me/5493534152233')
    expect(whatsappUrl('wa.me/5493534152233', '')).toBe('https://wa.me/5493534152233')
  })

  it('agrega el mensaje al link si hace falta', () => {
    expect(whatsappUrl('https://wa.me/5493534152233', 'hola che')).toBe('https://wa.me/5493534152233?text=hola+che')
  })

  it('distingue links de números', () => {
    expect(isLink('https://wa.me/549')).toBe(true)
    expect(isLink('wa.me/549')).toBe(true)
    expect(isLink('353 4152233')).toBe(false)
    expect(isLink(null)).toBe(false)
  })
})

describe('firstContactMessage', () => {
  const url = 'https://www.zonaprop.com.ar/x.html'
  it('con número y publicación arma el mensaje con el link', () => {
    expect(firstContactMessage({ contactPhone: '3534152233', listingUrl: url })).toContain(url)
  })
  it('si el contacto es un link de WhatsApp no agrega mensaje', () => {
    expect(firstContactMessage({ contactPhone: 'https://wa.me/549353', listingUrl: url })).toBe('')
  })
  it('sin publicación no agrega mensaje', () => {
    expect(firstContactMessage({ contactPhone: '3534152233', listingUrl: null })).toBe('')
  })
})
