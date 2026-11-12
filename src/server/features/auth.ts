import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { z } from 'zod'

/**
 * Login propio con cookie de sesión firmada (reemplaza al Basic Auth del navegador).
 * Un solo usuario: APP_USER / APP_PASSWORD. Sin APP_PASSWORD (local) no se pide login.
 */
const COOKIE = 'alq_session'
const MAX_AGE_S = 60 * 60 * 24 * 30 // 30 días
const USER = process.env.APP_USER || 'admin'
const PASSWORD = process.env.APP_PASSWORD ?? ''
// Si cambia la contraseña, cambia el secreto y se invalidan todas las sesiones.
const SECRET = process.env.SESSION_SECRET || createHash('sha256').update(`alquilometro:${USER}:${PASSWORD}`).digest('hex')

export const authEnabled = PASSWORD.length > 0

const sha = (s: string) => createHash('sha256').update(s).digest()
const safeEqual = (a: string, b: string) => timingSafeEqual(sha(a), sha(b))

async function sessionUser(c: Context): Promise<string | null> {
  const value = await getSignedCookie(c, SECRET, COOKIE)
  if (!value) return null
  const [user, issued] = value.split('|')
  if (user !== USER || !issued || Date.now() - Number(issued) > MAX_AGE_S * 1000) return null
  return user
}

/** Protege la API del dueño. */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (!authEnabled || (await sessionUser(c))) return next()
  return c.json({ error: 'Tenés que iniciar sesión' }, 401)
}

// Freno simple contra fuerza bruta: 8 intentos fallidos por IP cada 15 minutos.
const failures = new Map<string, { count: number; until: number }>()
const WINDOW_MS = 15 * 60 * 1000
const clientIp = (c: Context) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
})

export const authRoutes = new Hono()

authRoutes.get('/me', async (c) => {
  if (!authEnabled) return c.json({ authRequired: false, user: null })
  const user = await sessionUser(c)
  if (!user) return c.json({ authRequired: true, user: null }, 401)
  return c.json({ authRequired: true, user })
})

authRoutes.post('/login', async (c) => {
  if (!authEnabled) return c.json({ authRequired: false, user: null })
  const ip = clientIp(c)
  const f = failures.get(ip)
  if (f && f.count >= 8 && f.until > Date.now()) {
    return c.json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, 429)
  }

  const { username, password } = loginSchema.parse(await c.req.json())
  const ok = safeEqual(username.toLowerCase(), USER.toLowerCase()) && safeEqual(password, PASSWORD)
  if (!ok) {
    const prev = f && f.until > Date.now() ? f.count : 0
    failures.set(ip, { count: prev + 1, until: Date.now() + WINDOW_MS })
    await new Promise((r) => setTimeout(r, 700))
    return c.json({ error: 'Usuario o contraseña incorrectos' }, 401)
  }

  failures.delete(ip)
  const https = c.req.header('x-forwarded-proto') === 'https' || c.req.url.startsWith('https:')
  await setSignedCookie(c, COOKIE, `${USER}|${Date.now()}`, SECRET, {
    httpOnly: true,
    secure: https,
    sameSite: 'Lax',
    path: '/',
    maxAge: MAX_AGE_S,
  })
  return c.json({ authRequired: true, user: USER })
})

authRoutes.post('/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})
