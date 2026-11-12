import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
export const useProperty = (id: string) => useQuery({ queryKey: qk.property(id), queryFn: () => api.property(id) })
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
