import { describe, expect, it } from 'vitest'
import { matchesQuery, searchText } from './search'

const base = {
  title: 'Depto Bv. España',
  address: 'Bv. España 450',
  description: 'Living con balcón a la calle',
  notes: 'Preguntar por garantía',
  contactName: 'Inmobiliaria Pérez',
  contactPhone: '353 415-2233',
  status: 'visitado',
  details: { kind: 'departamento', rent: 480_000, gas: 'natural', bedrooms: 2, hasGrill: true },
}

const hit = (q: string) => matchesQuery(searchText(base), q)

describe('buscador del ranking', () => {
  it('busca en título, dirección, descripción, notas y contacto sin importar tildes ni mayúsculas', () => {
    expect(hit('espana')).toBe(true)
    expect(hit('BALCON')).toBe(true)
    expect(hit('garantia')).toBe(true)
    expect(hit('perez')).toBe(true)
    expect(hit('415-2233')).toBe(true)
    expect(hit('3534152233')).toBe(true) // el teléfono también se encuentra sin espacios ni guiones
  })

  it('traduce los valores de las opciones a su texto visible', () => {
    expect(hit('gas natural')).toBe(true)
    expect(hit('departamento')).toBe(true)
    expect(hit('Visitado')).toBe(true)
  })

  it('encuentra precios escritos de varias formas', () => {
    expect(hit('480000')).toBe(true)
    expect(hit('480.000')).toBe(true)
    expect(hit('$480k')).toBe(true)
  })

  it('exige que estén todas las palabras', () => {
    expect(hit('balcon natural')).toBe(true)
    expect(hit('balcon garrafa')).toBe(false)
  })

  it('una búsqueda vacía muestra todo', () => {
    expect(hit('   ')).toBe(true)
  })
})
