import { describe, expect, it } from 'vitest'
import { detect } from './detect'

describe('detect', () => {
  it('encuentra links con y sin https', () => {
    const r = detect('mirá https://www.zonaprop.com.ar/x-123.html y también www.argenprop.com/depto')
    expect(r.links).toEqual(['https://www.zonaprop.com.ar/x-123.html', 'https://www.argenprop.com/depto'])
  })

  it('saca la puntuación final del link', () => {
    expect(detect('link: https://fb.me/abc).').links).toEqual(['https://fb.me/abc'])
  })

  it('encuentra teléfonos en formatos comunes de Argentina', () => {
    expect(detect('llamar al 353 415-2233').phones).toEqual(['3534152233'])
    expect(detect('+54 9 353 4152233').phones).toEqual(['5493534152233'])
    expect(detect('0353 15 4152233').phones).toEqual(['0353154152233'])
  })

  it('no confunde precios, años ni números dentro de links con teléfonos', () => {
    const r = detect('alquiler $550.000, año 2026, https://site.com/aviso/35341522331')
    expect(r.phones).toEqual([])
  })

  it('arma un título corto a partir del texto', () => {
    expect(detect('Depto 2 dorm. Bv España 200\nmás datos').title).toBe('Depto 2 dorm. Bv España 200')
    expect(detect('https://www.zonaprop.com.ar/x.html').title).toBe('Aviso de zonaprop.com.ar')
    expect(detect('3534152233').title).toBe('Contacto 3534152233')
  })
})
