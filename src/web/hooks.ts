import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropertyDetail, PropertyListItem } from '../shared/api'
import { DEFAULT_SETTINGS } from '../shared/domain'
import { api } from './api'
import { toast } from './lib/toast'

export const qk = {
  properties: ['properties'] as const,
  property: (id: string) => ['property', id] as const,
  visits: ['visits'] as const,
  checklist: ['checklist'] as const,
  messages: ['messages'] as const,
  message: (id: string) => ['message', id] as const,
  settings: ['settings'] as const,
  shares: ['shares'] as const,
  inbox: ['inbox'] as const,
}

export const useProperties = () => useQuery({ queryKey: qk.properties, queryFn: api.properties })
/**
 * Detalle de un alquiler. Mientras llega, se arma con lo que ya trajo el ranking (datos + portada):
 * así la pantalla entra deslizándose completa, sin un "Cargando…" en el medio.
 */
export function useProperty(id: string) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: qk.property(id),
    queryFn: () => api.property(id),
    placeholderData: (): PropertyDetail | undefined => {
      const it = qc.getQueryData<PropertyListItem[]>(qk.properties)?.find((x) => x.id === id)
      if (!it) return undefined
      const cover = it.coverImageId
        ? [{ id: it.coverImageId, propertyId: it.id, mime: 'image/webp', caption: null, position: 0, createdAt: it.createdAt }]
        : []
      return { ...it, images: cover, visits: [], checks: [], guestRatings: [] }
    },
  })
}

/** Precarga el detalle al tocar una tarjeta: cuando la pantalla termina de deslizarse, los datos ya están. */
export function usePrefetchProperty() {
  const qc = useQueryClient()
  return (id: string) => void qc.prefetchQuery({ queryKey: qk.property(id), queryFn: () => api.property(id), staleTime: 10_000 })
}
export const useVisits = () => useQuery({ queryKey: qk.visits, queryFn: api.visits })
export const useChecklist = () => useQuery({ queryKey: qk.checklist, queryFn: api.checklist })

export function useSettings() {
  const q = useQuery({ queryKey: qk.settings, queryFn: api.settings, staleTime: 60_000 })
  return q.data ?? DEFAULT_SETTINGS
}

/** Invalida todo lo relacionado a propiedades y visitas: es una app chica, preferimos simple a fino. */
export function useInvalidateAll() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: qk.properties })
    qc.invalidateQueries({ queryKey: ['property'] })
    qc.invalidateQueries({ queryKey: qk.visits })
  }
}

export function useAppMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  onSuccess?: (r: TResult) => void,
  successMessage?: string,
) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      invalidate()
      if (successMessage) toast(successMessage)
      onSuccess?.(r)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  })
}
