import { describe, expect, it } from 'vitest'
import { keyboardInset } from './keyboard'

describe('keyboardInset', () => {
  it('es 0 sin teclado (el visual viewport ocupa toda la ventana)', () => {
    expect(keyboardInset(800, 800, 0)).toBe(0)
  })

  it('es la altura tapada por el teclado', () => {
    expect(keyboardInset(800, 500, 0)).toBe(300)
  })

  it('descuenta el scroll del visual viewport (iOS lo desplaza al enfocar)', () => {
    expect(keyboardInset(800, 500, 120)).toBe(180)
  })

  it('ignora diferencias chicas (barra de Safari que se esconde)', () => {
    expect(keyboardInset(800, 760, 0)).toBe(0)
  })

  it('nunca es negativo', () => {
    expect(keyboardInset(800, 820, 0)).toBe(0)
  })
})
