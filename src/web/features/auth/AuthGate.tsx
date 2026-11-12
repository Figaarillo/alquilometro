import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { api } from '../../api'
import { toast } from '../../lib/toast'
import { LoginPage } from './LoginPage'

interface AuthCtx {
  authRequired: boolean
  user: string | null
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({ authRequired: false, user: null, logout: async () => {} })
export const useAuth = () => useContext(AuthContext)

export const ME_KEY = ['auth', 'me'] as const

/** Muestra el login si hace falta; si no, la app. Sin APP_PASSWORD (local) pasa directo. */
export function AuthGate({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ME_KEY, queryFn: api.me, staleTime: 5 * 60_000, retry: 1 })

  useEffect(() => {
    const onExpired = () => qc.invalidateQueries({ queryKey: ME_KEY })
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [qc])

  if (me.isLoading) return <div className="boot">🏠</div>
  if (me.error) {
    return (
      <div className="login-page">
        <p className="error">No pude conectar con el servidor. Probá recargar la página.</p>
      </div>
    )
  }

  const data = me.data!
  if (data.authRequired && !data.user) return <LoginPage />

  const logout = async () => {
    await api.logout()
    qc.clear()
    qc.setQueryData(ME_KEY, { authRequired: true, user: null })
    toast('Sesión cerrada')
  }

  return <AuthContext.Provider value={{ authRequired: data.authRequired, user: data.user, logout }}>{children}</AuthContext.Provider>
}
