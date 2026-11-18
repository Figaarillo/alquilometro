import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VisitWithProperty } from '../../shared/api'
import { qk } from '../hooks'
import { renderApp } from '../test/render'
import { VisitsBell } from './VisitsBell'

const visit = (id: string, scheduledAt: Date, extra: Partial<VisitWithProperty> = {}): VisitWithProperty => ({
  id,
  propertyId: null,
  title: `Visita ${id}`,
  location: null,
  scheduledAt: scheduledAt.toISOString(),
  endAt: null,
  done: false,
  notes: null,
  createdAt: scheduledAt.toISOString(),
  propertyTitle: null,
  propertyAddress: null,
  lat: null,
  lng: null,
  ...extra,
})

// Solo se congela la fecha: los timers reales siguen andando para user-event.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 12, 0))
})
afterEach(() => vi.useRealTimers())

describe('VisitsBell', () => {
  it('muestra cuántas visitas quedan hoy (no cuenta las de mañana)', () => {
    renderApp(<VisitsBell />, {
      data: [[qk.visits, [visit('a', new Date(2026, 10, 18, 17)), visit('b', new Date(2026, 10, 19, 10))]]],
    })
    expect(screen.getByRole('button', { name: 'Visitas de hoy (1)' })).toHaveTextContent('1')
  })

  it('al tocarla lista las de hoy con link al alquiler', async () => {
    renderApp(<VisitsBell />, {
      data: [[qk.visits, [visit('a', new Date(2026, 10, 18, 17), { propertyId: 'p1', propertyTitle: 'Casa con patio' })]]],
    })
    await userEvent.click(screen.getByRole('button', { name: /Visitas de hoy/ }))
    expect(screen.getByRole('link', { name: /Casa con patio/ })).toHaveAttribute('href', '/p/p1?tab=resumen')
  })

  it('sin visitas hoy: sin número y con mensaje vacío', async () => {
    renderApp(<VisitsBell />, { data: [[qk.visits, []]] })
    const bell = screen.getByRole('button', { name: 'Visitas de hoy (0)' })
    expect(bell).toHaveTextContent('')
    await userEvent.click(bell)
    expect(screen.getByText('No te quedan visitas por hoy.')).toBeInTheDocument()
  })

  it('se cierra con Escape', async () => {
    renderApp(<VisitsBell />, { data: [[qk.visits, []]] })
    await userEvent.click(screen.getByRole('button', { name: /Visitas de hoy/ }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
