import { describe, expect, it } from 'vitest'
import { isLink, whatsappUrl } from './links'

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
