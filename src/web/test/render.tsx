import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

/**
 * Renderiza con los mismos providers que la app (React Query + router en memoria).
 * `data`: respuestas ya cargadas por query key, así el test no toca la red.
 */
export function renderApp(ui: ReactNode, { data = [], route = '/' }: { data?: [readonly unknown[], unknown][]; route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  for (const [key, value] of data) client.setQueryData(key, value)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}
