import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, House, Lock, User } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../api'
import { ME_KEY } from './AuthGate'

/** Login con el estilo de GreenBin: card con hero en degradé, campos con ícono y botón pill. */
export function LoginPage() {
  const qc = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const me = await api.login(username.trim(), password)
      qc.setQueryData(ME_KEY, me)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden />
      <div className="login-card">
        <div className="login-hero">
          <div className="hero-icon">
            <House size={24} />
          </div>
          <h2>Alquilómetro</h2>
          <p>Ingresá para ver tus alquileres</p>
        </div>

        <form className="login-body" onSubmit={submit}>
          <label className="login-field">
            <User size={18} />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              autoFocus
            />
          </label>
          <label className="login-field">
            <Lock size={18} />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              required
            />
            <button type="button" className="ghost eye" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="btn-submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="muted small login-note">La sesión queda abierta 30 días en este dispositivo.</p>
        </form>
      </div>
    </div>
  )
}
