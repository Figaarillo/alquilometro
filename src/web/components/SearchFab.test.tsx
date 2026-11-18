import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SearchFab } from './SearchFab'

function Harness({ initial = '' }: { initial?: string }) {
  const [q, setQ] = useState(initial)
  return (
    <>
      <SearchFab value={q} onChange={setQ} placeholder="Buscar…" />
      <output>{q}</output>
    </>
  )
}

describe('SearchFab', () => {
  it('al tocar la lupa se abre y enfoca el campo (si no, iOS no abre el teclado)', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('search')).toHaveClass('open')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('la X borra la búsqueda y la cierra', async () => {
    render(<Harness initial="patio" />)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }))
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(screen.getByRole('search')).not.toHaveClass('open')
  })

  it('sin teclado en pantalla no se mueve', () => {
    render(<Harness initial="patio" />)
    expect(screen.getByRole('search')).not.toHaveClass('over-keyboard')
  })
})
