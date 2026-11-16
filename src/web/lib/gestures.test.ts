import { describe, expect, it } from 'vitest'
import { DISMISS_DISTANCE, dragAxis, indexFromScroll, shouldDismiss } from './gestures'

describe('indexFromScroll', () => {
  it('redondea a la foto más cercana', () => {
    expect(indexFromScroll(0, 400, 5)).toBe(0)
    expect(indexFromScroll(390, 400, 5)).toBe(1)
    expect(indexFromScroll(610, 400, 5)).toBe(2)
  })

  it('no se sale de los límites', () => {
    expect(indexFromScroll(-50, 400, 5)).toBe(0)
    expect(indexFromScroll(9999, 400, 5)).toBe(4)
  })

  it('sin ancho o sin fotos devuelve 0', () => {
    expect(indexFromScroll(300, 0, 5)).toBe(0)
    expect(indexFromScroll(300, 400, 0)).toBe(0)
  })
})

describe('dragAxis', () => {
  it('no decide hasta superar el umbral', () => {
    expect(dragAxis(3, 4)).toBeNull()
  })

  it('vertical si domina el movimiento vertical', () => {
    expect(dragAxis(5, 30)).toBe('y')
    expect(dragAxis(-4, -20)).toBe('y')
  })

  it('horizontal si domina el movimiento horizontal', () => {
    expect(dragAxis(30, 5)).toBe('x')
  })
})

describe('shouldDismiss', () => {
  it('cierra al arrastrar hacia abajo lo suficiente', () => {
    expect(shouldDismiss(DISMISS_DISTANCE + 1, 600)).toBe(true)
  })

  it('cierra con un tirón rápido aunque sea corto', () => {
    expect(shouldDismiss(50, 120)).toBe(true)
  })

  it('no cierra con un arrastre corto y lento', () => {
    expect(shouldDismiss(50, 600)).toBe(false)
  })

  it('no cierra al arrastrar hacia arriba', () => {
    expect(shouldDismiss(-200, 100)).toBe(false)
  })
})
